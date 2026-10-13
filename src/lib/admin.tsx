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
  const [canBootstrap, setCanBootstrap] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      // Defer off the effect body — state must not be written synchronously.
      const timer = setTimeout(() => {
        setIsAdmin(false);
        setCanBootstrap(false);
        setChecking(false);
      }, 0);
      return () => clearTimeout(timer);
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

        // Self-service bootstrap: if the allowlist env is empty AND not a
        // single admin exists yet, the next signed-in user may claim admin
        // from the blocked screen. One-shot — once anyone is admin, the
        // button disappears for everyone else.
        if (!cancelled && !emailAllow && role !== "admin" && adminEmails.length === 0) {
          const { collection, getDocs, limit, query, where } = await import("firebase/firestore");
          const admins = await getDocs(
            query(collection(await fbDb(), "users"), where("role", "==", "admin"), limit(1)),
          );
          if (!cancelled) setCanBootstrap(admins.empty);
        }
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

  return { isAdmin, checking, canBootstrap };
}

/** Claims admin for the signed-in user (only offered when no admin exists). */
export async function claimAdmin(uid: string): Promise<void> {
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(await fbDb(), "users", uid), { role: "admin" }, { merge: true });
}

/** Blocks the admin UI for non-admins. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAdmin, checking, canBootstrap } = useAdmin();
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  async function onClaim() {
    if (!user || claiming) return;
    setClaiming(true);
    setClaimError(null);
    try {
      await claimAdmin(user.uid);
      // Force a re-check by reloading — simplest way to refresh the gate.
      window.location.reload();
    } catch {
      setClaimError("Couldn't update your account. Check your Firestore security rules.");
      setClaiming(false);
    }
  }

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
            This account{user?.email ? ` (${user.email})` : ""} doesn&apos;t have admin
            access yet.
          </p>

          {canBootstrap ? (
            <div className="mt-4">
              <p className="text-xs leading-relaxed text-fv-muted">
                No admin exists yet — you appear to be the first user, so you
                can set this account up as the admin.
              </p>
              <button
                onClick={onClaim}
                disabled={claiming}
                className="mt-3 w-full rounded-full bg-fv-pink py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                {claiming ? "Setting up…" : "Make this account the admin"}
              </button>
              {claimError && <p className="mt-2 text-xs text-amber-300/90">{claimError}</p>}
            </div>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-fv-muted">
              Sign in with the admin account, or add your email to{" "}
              <code className="text-fv-pink">NEXT_PUBLIC_ADMIN_EMAILS</code> in
              Vercel and redeploy.
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
