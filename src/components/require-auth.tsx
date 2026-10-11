"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!configured || loading) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [user, loading, configured, router, pathname]);

  // Preview mode: while the Firebase keys are missing there is no auth backend
  // at all, so the screens stay browsable. The guard switches on automatically
  // as soon as .env.local has the Firebase config.
  if (!configured) return <>{children}</>;

  if (loading || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-fv-bg">
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-fv-pink border-t-transparent" />
          <p className="text-sm text-fv-muted">Loading FabricVerse…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
