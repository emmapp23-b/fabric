import { NextResponse } from "next/server";
import webpush from "web-push";

/**
 * Web Push relay.
 *
 *   GET  → the VAPID public key (clients need it to subscribe).
 *   POST → { subscriptions: [{ id, endpoint, keys }], payload: Notice }
 *          sends the notification to each subscription and reports which
 *          ones the push services rejected as dead (404/410) so the caller
 *          can sweep them from Firestore.
 *
 * Env (set in Vercel → Settings → Environment Variables, and locally in
 * .env.local): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, optional VAPID_SUBJECT.
 */

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? process.env.NEXT_PUBLIC_SITE_URL ?? "mailto:support@fabricverse.app";

/** Keep a single relay call bounded (Firestore fan-out batches come in chunks). */
const MAX_SUBSCRIPTIONS = 300;

interface IncomingSub {
  id?: string;
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

function vapidReady(): boolean {
  if (!PUBLIC_KEY || !PRIVATE_KEY) return false;
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    return NextResponse.json({ error: "Web push is not configured." }, { status: 503 });
  }
  return NextResponse.json({ publicKey: PUBLIC_KEY });
}

export async function POST(req: Request) {
  if (!vapidReady()) {
    return NextResponse.json({ error: "Web push is not configured." }, { status: 503 });
  }

  let body: { subscriptions?: IncomingSub[]; payload?: Record<string, unknown> } | null = null;
  try {
    body = await req.json();
  } catch {
    /* fall through to 400 */
  }

  const subs = Array.isArray(body?.subscriptions) ? body!.subscriptions!.slice(0, MAX_SUBSCRIPTIONS) : [];
  const payload = body?.payload ?? {};
  if (!subs.length) return NextResponse.json({ sent: 0, dead: [] });

  // Only allow in-app navigation targets — never open external URLs from a
  // notification tap.
  const url = typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/";
  const message = JSON.stringify({
    title: typeof payload.title === "string" ? payload.title.slice(0, 120) : "FabricVerse",
    body: typeof payload.body === "string" ? payload.body.slice(0, 400) : "",
    tag: typeof payload.tag === "string" ? payload.tag.slice(0, 40) : "fv",
    image: typeof payload.image === "string" && payload.image.startsWith("https://") ? payload.image.slice(0, 500) : undefined,
    url,
  });

  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s, i) => {
      if (!s?.endpoint || !s.keys?.p256dh || !s.keys?.auth) return;
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } },
          message,
          { TTL: 24 * 60 * 60, urgency: "normal" },
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: the device's push service says the subscription is gone.
        if (status === 404 || status === 410) {
          if (s.id) dead.push(s.id);
        } else if (status === 429) {
          // Rate limited — throttle the caller by failing loudly; the trigger
          // itself should never block on this, so just record it.
          console.warn("[push] rate limited by a push service");
        } else {
          console.warn("[push] send failed:", status ?? err);
        }
      }
    }),
  );

  return NextResponse.json({ sent, dead });
}
