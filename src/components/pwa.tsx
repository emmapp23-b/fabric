"use client";

/**
 * PWA glue: registers the service worker, offers app install (Android +
 * iPhone) and push-notification opt-in.
 */

import { useCallback, useEffect, useState } from "react";
import { BellRing, Check, Download, Share, Smartphone, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  disablePush,
  enablePush,
  isIOS,
  isPushSubscribed,
  isStandalone,
  onInstallAvailable,
  promptInstall,
  pushPermission,
  pushSupported,
  registerServiceWorker,
} from "@/lib/push";

/** Registers /sw.js on mount so push + install prompts are always ready. */
export function PwaSetup() {
  useEffect(() => {
    registerServiceWorker().catch(() => undefined);
  }, []);
  return null;
}

const DISMISS_KEY = "fv-push-optin-dismissed";

/* ------------------------------------------------------------------ */
/* Home: opt-in card                                                   */
/* ------------------------------------------------------------------ */

export function PushOptIn() {
  const { user } = useAuth();
  // Browser-only state: these components render inside <RequireAuth>, which
  // mounts them client-side after sign-in, so lazy initializers are safe.
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() => pushPermission());
  const [subd, setSubd] = useState(false);
  const [ios] = useState(() => isIOS());
  const [standalone] = useState(() => isStandalone());
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    isPushSubscribed().then(setSubd);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode */
    }
  };

  const enable = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setHint(null);
    const res = await enablePush({ uid: user.uid, name: user.displayName ?? user.email ?? "" });
    setPerm(pushPermission());
    setSubd(res === "ok");
    if (res === "unsupported" && isIOS()) {
      setHint("On iPhone, notifications only work after installing the app — tap Share ➜ Add to Home Screen.");
    } else if (res !== "ok") {
      setHint("Couldn't enable notifications. Check your browser settings and try again.");
    }
    setBusy(false);
  }, [user]);

  if (!user || !pushSupported()) return null;

  // Everything already on → quiet confirmation row (still dismissible).
  if (subd && perm === "granted") {
    if (dismissed) return null;
    return (
      <div className="mx-5 mb-4 flex items-center gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5">
        <Check className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="flex-1 text-xs font-semibold text-emerald-200">
          Notifications on — you&apos;ll get product, reel, live &amp; delivery alerts.
        </span>
        <button onClick={dismiss} aria-label="Dismiss" className="text-emerald-200/60">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (dismissed) return null;

  // iPhone: the app must be installed to the home screen before push works.
  if (ios && !standalone) {
    return (
      <div className="mx-5 mb-4 rounded-2xl border border-fv-line bg-fv-panel p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fv-pink/15">
            <Share className="h-5 w-5 text-fv-pink" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">Install to get notifications</div>
            <div className="text-xs text-fv-muted">
              On iPhone, tap Share then “Add to Home Screen” — notifications work from the installed app.
            </div>
          </div>
          <button onClick={dismiss} aria-label="Dismiss" className="self-start text-fv-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-5 mb-4 rounded-2xl border border-fv-line bg-fv-panel p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fv-pink/15">
          <BellRing className="h-5 w-5 text-fv-pink" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">Never miss a drop 🔔</div>
          <div className="text-xs text-fv-muted">
            New products, reels, live sessions and delivery updates — pushed straight to you.
          </div>
        </div>
        <button onClick={dismiss} aria-label="Dismiss" className="self-start text-fv-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      {hint && <p className="mt-3 text-xs leading-relaxed text-amber-300/90">{hint}</p>}
      <button
        onClick={enable}
        disabled={busy || perm === "denied"}
        className="mt-3 w-full rounded-full bg-fv-pink py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? "Enabling…" : perm === "denied" ? "Blocked in browser settings" : "Enable notifications"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profile: notification + install rows                                */
/* ------------------------------------------------------------------ */

export function PwaRows() {
  const { user } = useAuth();
  const [subd, setSubd] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() => pushPermission());
  const [standalone] = useState(() => isStandalone());
  const [ios] = useState(() => isIOS());
  const [canInstall, setCanInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    isPushSubscribed().then(setSubd);
    return onInstallAvailable(setCanInstall);
  }, []);

  async function toggleNotifications() {
    if (!user || busy) return;
    setBusy(true);
    setNote(null);
    if (subd) {
      await disablePush(user.uid);
      setSubd(false);
    } else {
      const res = await enablePush({ uid: user.uid, name: user.displayName ?? user.email ?? "" });
      setSubd(res === "ok");
      if (res === "unsupported" && isIOS()) {
        setNote("On iPhone, install the app first — tap Share ➜ Add to Home Screen.");
      } else if (res !== "ok") {
        setNote("Couldn't enable notifications. Check your browser settings.");
      }
    }
    setPerm(pushPermission());
    setBusy(false);
  }

  async function onInstall() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const res = await promptInstall();
    if (res === "unavailable") {
      setNote(
        isIOS()
          ? "Tap Share ➜ “Add to Home Screen”, then confirm."
          : "Open your browser menu and choose “Install app” / “Add to Home screen”.",
      );
    } else if (res === "dismissed") {
      setNote("Install dismissed — you can install any time from this row.");
    }
    setBusy(false);
  }

  const rows: React.ReactNode[] = [];

  if (user && pushSupported()) {
    rows.push(
      <button
        key="notifications"
        onClick={toggleNotifications}
        disabled={busy}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-white/[0.03]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fv-pink/15">
          <BellRing className="h-5 w-5 text-fv-pink" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">Push Notifications</span>
          <span className="block truncate text-xs text-fv-muted">
            {subd && perm === "granted"
              ? "On — new products, reels, live & delivery alerts"
              : perm === "denied"
                ? "Blocked — allow notifications in browser settings"
                : "Get alerts for new drops, live sessions & delivery"}
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
            subd && perm === "granted" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-slate-300"
          }`}
        >
          {subd && perm === "granted" ? "On" : "Off"}
        </span>
      </button>,
    );

    if (!standalone) {
      rows.push(
        <button
          key="install"
          onClick={onInstall}
          disabled={busy}
          className="flex w-full items-center gap-3.5 border-t border-fv-line px-4 py-3.5 text-left transition hover:bg-white/[0.03]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fv-pink/15">
            {ios ? <Share className="h-5 w-5 text-fv-pink" /> : <Download className="h-5 w-5 text-fv-pink" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Install App</span>
            <span className="block truncate text-xs text-fv-muted">
              {canInstall
                ? "Add FabricVerse to your home screen"
                : ios
                  ? "Tap then choose “Add to Home Screen”"
                  : "Open like an app, full screen"}
            </span>
          </span>
          <Smartphone className="h-5 w-5 shrink-0 text-fv-muted" />
        </button>,
      );
    }
  }

  if (!rows.length) return null;

  return (
    <div className="mx-5 mt-4 overflow-hidden rounded-2xl border border-fv-line bg-fv-panel">
      {rows}
      {note && <div className="border-t border-fv-line px-4 py-2.5 text-xs text-amber-300/90">{note}</div>}
    </div>
  );
}
