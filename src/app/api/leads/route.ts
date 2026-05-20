import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { LeadSource, LeadScore, LeadStage } from "@/types";

interface IngestPayload {
  fullName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  source: LeadSource;
  productInterest: string;
  budget?: number;
  notes?: string;
  assignedRep?: string;
}

function scoreFromPayload(payload: IngestPayload): LeadScore {
  if (payload.budget) return "warm";
  return "cold";
}

async function autoAssignRep(db: FirebaseFirestore.Firestore): Promise<string> {
  const repsSnap = await db
    .collection("users")
    .where("role", "in", ["rep", "admin"])
    .get();

  if (repsSnap.empty) return "unassigned";

  // Simple round-robin: pick the rep with the fewest open leads
  const counts = await Promise.all(
    repsSnap.docs.map(async (repDoc) => {
      const snap = await db
        .collection("leads")
        .where("assignedRep", "==", repDoc.id)
        .where("isConverted", "==", false)
        .count()
        .get();
      return { uid: repDoc.id, count: snap.data().count };
    })
  );

  counts.sort((a, b) => a.count - b.count);
  return counts[0].uid;
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as IngestPayload;

    if (!payload.fullName || !payload.phone || !payload.source || !payload.productInterest) {
      return NextResponse.json(
        { error: "Missing required fields: fullName, phone, source, productInterest" },
        { status: 400 }
      );
    }

    // Duplicate check
    const phoneMatch = await adminDb
      .collection("leads")
      .where("phone", "==", payload.phone)
      .limit(1)
      .get();

    if (!phoneMatch.empty) {
      return NextResponse.json(
        { error: "Duplicate lead", existingId: phoneMatch.docs[0].id },
        { status: 409 }
      );
    }

    const assignedRep = payload.assignedRep ?? (await autoAssignRep(adminDb));
    const score: LeadScore = scoreFromPayload(payload);
    const stage: LeadStage = "cold";

    const ref = await adminDb.collection("leads").add({
      fullName: payload.fullName,
      phone: payload.phone,
      whatsapp: payload.whatsapp ?? null,
      email: payload.email ?? null,
      source: payload.source,
      productInterest: payload.productInterest,
      budget: payload.budget ?? null,
      notes: payload.notes ?? null,
      assignedRep,
      score,
      stage,
      isConverted: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Auto-create a pipeline opportunity so the lead appears on the Kanban board
    await adminDb.collection("opportunities").add({
      accountId:   "",
      leadId:      ref.id,
      leadName:    payload.fullName,
      pipeline:    "new_sales",
      stage:       "new_lead",
      probability: 10,
      value:       payload.budget ?? 0,
      assignedRep,
      isStagnant:  false,
      lastMovedAt: FieldValue.serverTimestamp(),
      createdAt:   FieldValue.serverTimestamp(),
      updatedAt:   FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: ref.id, assignedRep, score }, { status: 201 });
  } catch (err) {
    console.error("[leads/ingest]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const snap = await adminDb
      .collection("leads")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const leads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json(leads);
  } catch (err) {
    console.error("[leads/list]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
