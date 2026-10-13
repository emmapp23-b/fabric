"use client";

/**
 * Web-push + app-install helpers (browser only).
 *
 * - `enablePush` / `disablePush` manage the Push API subscription and mirror
 *   it into the Firestore `pushSubscriptions` collection so any trigger can
 *   target this device.
 * - `pushNotify` is the fire-and-forget broadcaster used by app triggers
 *   (new product, new reel, live started, item added to cart, delivery price
 *   set). It reads matching subscriptions from Firestore and hands them to
 *   POST /api/push, which does the actual Web Push delivery.
 *
 * NOTE: like ./mutations, "firebase/firestore" is loaded lazily so this
 * module is safe in every bundle graph.
 */

import { fbDb, isFirebaseConfigured } from "./firebase";

export interface Notice {
  title: string;
  body?: string;
  /** In-app path the notification opens, e.g. "/product/abc". */
  url?: string;
  /** Collapses repeats of the same kind (e.g. "cart", "quote"). */
  tag?: string;
  image?: string;
}

const SUBS = "pushSubscriptions";

/* ------------------------------------------------------------------ */
/* Small utils                                                         */
/* ------------------------------------------------------------------ */

/** base64url of the endpoint — safe as a Firestore document id (idempotent). */
function subId(endpoint: string): string {
  return btoa(endpoint).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushPermission(): NotificationPermission | "unsupported" {
  return pushSupported() ? Notification.permission : "unsupported";
}

/* ------------------------------------------------------------------ */
/* Service worker                                                      */
/* ------------------------------------------------------------------ */

let swReg: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (swReg) return swReg;
  try {
    swReg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
    return swReg;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Subscription management (mirrored into Firestore)                   */
/* ------------------------------------------------------------------ */

let cachedKey: string | null = null;

async function vapidPublicKey(): Promise<string | null> {
  if (cachedKey) return cachedKey;
  try {
    const res = await fetch("/api/push", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { publicKey?: string };
    cachedKey = data.publicKey || null;
    return cachedKey;
  } catch {
    return null;
  }
}

export type EnablePushResult = "ok" | "denied" | "unsupported" | "failed";

/** Requests permission, subscribes this device and stores it in Firestore. */
export async function enablePush(user: { uid: string; name?: string }): Promise<EnablePushResult> {
  if (!pushSupported()) return "unsupported";
  if (!isFirebaseConfigured) return "failed";

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";

  const reg = await registerServiceWorker();
  const key = await vapidPublicKey();
  if (!reg || !key) return "failed";

  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const json = sub.toJSON();
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(doc(await fbDb(), SUBS, subId(sub.endpoint)), {
      endpoint: sub.endpoint,
      keys: json.keys ?? {},
      uid: user.uid,
      name: user.name ?? "",
      createdAt: Date.now(),
    });
    return "ok";
  } catch {
    // On iOS this throws unless the app was added to the home screen.
    return "failed";
  }
}

/** Unsubscribes this device and removes it from Firestore. */
export async function disablePush(uid: string): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await registerServiceWorker();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const { doc, deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(await fbDb(), SUBS, subId(sub.endpoint))).catch(() => undefined);
      await sub.unsubscribe();
    }
  } catch {
    /* best effort */
  }
  void uid;
}

/** True when this device currently holds an active subscription. */
export async function isPushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Sending                                                             */
/* ------------------------------------------------------------------ */

interface StoredSub {
  id: string;
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

/**
 * Fire-and-forget trigger helper. `target` defaults to a broadcast to every
 * subscribed device; pass `{ uid }` to notify one user's devices only.
 */
export async function pushNotify(
  notice: Notice,
  target: "all" | { uid: string } = "all",
): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const { collection, getDocs, query, where, doc, deleteDoc } = await import("firebase/firestore");
    const db = await fbDb();

    const snap =
      target === "all"
        ? await getDocs(collection(db, SUBS))
        : await getDocs(query(collection(db, SUBS), where("uid", "==", target.uid)));

    const subs: StoredSub[] = snap.docs.map((d) => {
      const x = d.data() as Omit<StoredSub, "id">;
      return { id: d.id, endpoint: x.endpoint, keys: x.keys };
    });
    if (!subs.length) return;

    const res = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptions: subs.filter((s) => s.endpoint && s.keys?.p256dh && s.keys?.auth),
        payload: notice,
      }),
    });
    if (!res.ok) return;

    // Sweep subscriptions the push services rejected as dead (404/410).
    const data = (await res.json()) as { dead?: string[] };
    if (data.dead?.length) {
      await Promise.all(data.dead.map((id) => deleteDoc(doc(db, SUBS, id)).catch(() => undefined)));
    }
  } catch {
    /* notifications must never break the action that triggered them */
  }
}

/* ------------------------------------------------------------------ */
/* Install-to-home-screen (beforeinstallprompt)                        */
/* ------------------------------------------------------------------ */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const installListeners = new Set<(ready: boolean) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    installListeners.forEach((cb) => cb(true));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installListeners.forEach((cb) => cb(false));
  });
}

/** Subscribe to "an install prompt became available". Returns an unsubscribe fn. */
export function onInstallAvailable(cb: (ready: boolean) => void): () => void {
  installListeners.add(cb);
  // Report the current state on the next tick so mount effects never set
  // state synchronously.
  const timer = setTimeout(() => cb(Boolean(deferred)), 0);
  return () => {
    clearTimeout(timer);
    installListeners.delete(cb);
  };
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // iOS Safari "Add to Home Screen".
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

/** Fires the browser's native install prompt (Android/desktop Chromium). */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const event = deferred;
  deferred = null;
  installListeners.forEach((cb) => cb(false));
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  } catch {
    return "dismissed";
  }
}
