import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const DEFAULT_PASSWORD = "1234567890";

export async function POST(req: NextRequest) {
  try {
    const { leadId, opportunityId } = await req.json();
    if (!leadId || !opportunityId) {
      return NextResponse.json(
        { error: "leadId and opportunityId are required" },
        { status: 400 }
      );
    }

    // Fetch the lead
    const leadDoc = await adminDb.collection("leads").doc(leadId).get();
    if (!leadDoc.exists) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    const lead = leadDoc.data()!;

    let accountId: string;

    if (lead.isConverted && lead.convertedAccountId) {
      // Already converted — just use the existing account
      accountId = lead.convertedAccountId;
    } else {
      // Create a new account from lead data
      const accountRef = await adminDb.collection("accounts").add({
        name:         lead.fullName,
        phone:        lead.phone ?? null,
        email:        lead.email ?? null,
        type:         "customer",
        tags:         [],
        customFields: {},
        isArchived:   false,
        createdAt:    FieldValue.serverTimestamp(),
        updatedAt:    FieldValue.serverTimestamp(),
      });
      accountId = accountRef.id;

      // Mark lead as converted
      await adminDb.collection("leads").doc(leadId).update({
        isConverted:        true,
        stage:              "converted",
        convertedAccountId: accountId,
        updatedAt:          FieldValue.serverTimestamp(),
      });
    }

    // Update opportunity to use real account and clear lead fields
    await adminDb.collection("opportunities").doc(opportunityId).update({
      accountId:   accountId,
      leadId:      FieldValue.delete(),
      leadName:    FieldValue.delete(),
      updatedAt:   FieldValue.serverTimestamp(),
    });

    // No email — account created but no login can be provisioned
    if (!lead.email) {
      return NextResponse.json({ success: true, accountId, noEmail: true });
    }

    // Create or reset the Firebase Auth user
    let uid: string;
    let isNew = true;
    try {
      const userRecord = await adminAuth.createUser({
        email:       lead.email,
        password:    DEFAULT_PASSWORD,
        displayName: lead.fullName,
      });
      uid = userRecord.uid;
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      if (fbErr.code === "auth/email-already-exists") {
        isNew = false;
        const existing = await adminAuth.getUserByEmail(lead.email);
        uid = existing.uid;
        await adminAuth.updateUser(uid, { password: DEFAULT_PASSWORD });
      } else {
        throw err;
      }
    }

    // Write / merge the customer Firestore profile
    await adminDb.collection("users").doc(uid).set(
      {
        name:      lead.fullName,
        email:     lead.email,
        role:      "customer",
        accountId: accountId,
        createdAt: new Date(),
      },
      { merge: true }
    );

    // Link customer UID back to the account
    await adminDb.collection("accounts").doc(accountId).update({
      customerId: uid,
      updatedAt:  new Date(),
    });

    return NextResponse.json({
      success: true,
      email: lead.email,
      accountId,
      uid,
      isNew,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error("[leads/convert-won]", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
