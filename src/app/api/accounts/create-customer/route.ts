import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const DEFAULT_PASSWORD = "1234567890";

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await req.json();
    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    // Fetch the account
    const accountDoc = await adminDb.collection("accounts").doc(accountId).get();
    if (!accountDoc.exists) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    const account = accountDoc.data()!;

    if (!account.email) {
      return NextResponse.json({ error: "no_email" }, { status: 400 });
    }

    // Create or reset the Firebase Auth user
    let uid: string;
    let isNew = true;
    try {
      const userRecord = await adminAuth.createUser({
        email:       account.email,
        password:    DEFAULT_PASSWORD,
        displayName: account.name,
      });
      uid = userRecord.uid;
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      if (fbErr.code === "auth/email-already-exists") {
        isNew = false;
        const existing = await adminAuth.getUserByEmail(account.email);
        uid = existing.uid;
        await adminAuth.updateUser(uid, { password: DEFAULT_PASSWORD });
      } else {
        throw err;
      }
    }

    // Write / merge the customer's Firestore profile
    await adminDb.collection("users").doc(uid).set(
      {
        name:      account.name,
        email:     account.email,
        role:      "customer",
        accountId: accountId,
        createdAt: new Date(),
      },
      { merge: true }
    );

    // Link the customer UID back to the account
    await adminDb.collection("accounts").doc(accountId).update({
      customerId: uid,
      updatedAt:  new Date(),
    });

    return NextResponse.json({ success: true, email: account.email, uid, isNew });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown error";
    console.error("[create-customer]", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
