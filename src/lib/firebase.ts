import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Secondary app for creating customer accounts without signing out the current staff user.
// createUserWithEmailAndPassword would otherwise replace the rep's active session.
const provisionApp =
  getApps().find((a) => a.name === "provision") ||
  initializeApp(firebaseConfig, "provision");

export const provisionAuth = getAuth(provisionApp);
// Firestore instance tied to provisionAuth — writes use the new customer's session,
// satisfying the "allow create: if request.auth.uid == userId" rule.
export const provisionDb = getFirestore(provisionApp);
