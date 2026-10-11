"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { fbAuth, fbDb, isFirebaseConfigured } from "./firebase";

type AuthError = { message: string };

interface AuthCtx {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setProfilePhoto: (photoURL: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

function err(e: unknown): AuthError {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/email-already-in-use": "You already have an account — log in instead.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return { message: map[code] ?? (e as Error)?.message ?? "Something went wrong." };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(fbAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(fbAuth(), email.trim(), password);
      if (name) await updateProfile(cred.user, { displayName: name });
      // firestore loads lazily (see ./firebase) — it must never be in the SSR graph.
      const { doc, serverTimestamp, setDoc } = await import("firebase/firestore");
      await setDoc(doc(await fbDb(), "users", cred.user.uid), {
        name,
        email: email.trim(),
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      throw err(e);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(fbAuth(), email.trim(), password);
    } catch (e) {
      throw err(e);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(fbAuth());
  }, []);

  const setProfilePhoto = useCallback(async (photoURL: string) => {
    const u = fbAuth().currentUser;
    if (!u) throw new Error("You're not signed in.");
    try {
      await updateProfile(u, { photoURL });
      setUser({ ...u });
    } catch (e) {
      throw err(e);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(fbAuth(), email.trim());
    } catch (e) {
      throw err(e);
    }
  }, []);

  const requestOtp = useCallback(async (email: string) => {
    const res = await fetch("/api/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", email: email.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Could not send the code.");
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    const res = await fetch("/api/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", email: email.trim(), code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "That code isn't right.");
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      configured: isFirebaseConfigured,
      signUp,
      login,
      logout,
      setProfilePhoto,
      resetPassword,
      requestOtp,
      verifyOtp,
    }),
    [user, loading, signUp, login, logout, setProfilePhoto, resetPassword, requestOtp, verifyOtp],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
