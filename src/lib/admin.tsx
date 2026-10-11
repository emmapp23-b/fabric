"use client";

/**
 * Admin access control. A user is an admin when their Firestore user doc has
 * role === "admin", OR their email is in NEXT_PUBLIC_ADMIN_EMAILS (comma
 * separated) — used to bootstrap the first admin without a console edit.
 *
 * This gates the admin UI only. Real enforcement is the Firestore security
 * rules; admin-only writes must require request.auth.token.role == "admin"
 * (or a checked server route).
 */

import { useEffect, useState, type ReactNode } from "react";
import { fbDb, isFirebaseConfigured } from "./firebase";
import { useAuth } from "./auth";

const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const emailAllow = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;
      try {
        // firestore loads lazily (see ./firebase) — never in the SSR graph.
        const { doc, getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(await fbDb(), "users", user.uid));
        const role = snap.exists() ? (snap.data() as { role?: string }).role : undefined;
        if (!cancelled) setIsAdmin(emailAllow || role === "admin");
      } catch {
        if (!cancelled) setIsAdmin(emailAllow);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isAdmin, checking };
}

/** Blocks the admin UI for non-admins. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, checking } = useAdmin();

  if (checking) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-fv-bg">
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-fv-pink border-t-transparent" />
          <p className="text-sm text-fv-muted">Checking admin access…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-fv-bg px-6">
        <div className="w-full max-w-sm rounded-2xl border border-fv-line bg-fv-panel p-8 text-center">
          <p className="text-lg font-extrabold">Admins only</p>
          <p className="mt-2 text-sm text-fv-muted">
            Your account doesn&apos;t have admin access. Sign in with an admin
            account or add your email to <code className="text-fv-pink">NEXT_PUBLIC_ADMIN_EMAILS</code>.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
