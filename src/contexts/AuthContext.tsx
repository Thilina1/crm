"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser, createUser } from "@/lib/firestore";
import type { AppUser, UserRole } from "@/types";

interface AuthContextValue {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AppUser | null>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const profile = await getUser(user.uid);
        setAppUser(profile);
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn(email: string, password: string): Promise<AppUser | null> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    let profile = await getUser(cred.user.uid);
    if (!profile) {
      await createUser(cred.user.uid, {
        name: cred.user.displayName ?? email.split("@")[0],
        email,
        role: "rep" as UserRole,
      });
      profile = await getUser(cred.user.uid);
    }
    setAppUser(profile);
    return profile;
  }

  async function signUp(name: string, email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await createUser(cred.user.uid, { name, email, role: "rep" as UserRole });
    setAppUser(await getUser(cred.user.uid));
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setAppUser(null);
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
