import { NextResponse } from "next/server";

/**
 * OTP send/verify backed by Brevo transactional email.
 * Codes are held in memory with a 10 minute TTL — swap for Firestore/Redis
 * once multiple server instances are in play.
 */

const CODE_TTL_MS = 10 * 60 * 1000;
const codes = new Map<string, { code: string; expires: number }>();

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendEmail(to: string, code: string) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = {
    email: process.env.BREVO_FROM_EMAIL || "noreply@fabricverse.app",
    name: process.env.BREVO_FROM_NAME || "FabricVerse",
  };
  if (!apiKey) throw new Error("BREVO_API_KEY is not set.");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      sender: from,
      to: [{ email: to }],
      subject: "Your FabricVerse verification code",
      htmlContent: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#070a13;color:#fff;border-radius:16px">
          <h2 style="color:#ff1e63;margin:0 0 8px">FabricVerse</h2>
          <p style="color:#c9d2e3">Use this code to verify your email. It expires in 10 minutes.</p>
          <div style="font-size:36px;font-weight:800;letter-spacing:12px;text-align:center;padding:20px;background:#111a2c;border-radius:12px;margin:16px 0">${code}</div>
          <p style="color:#8b97ad;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        </div>`,
      textContent: `Your FabricVerse verification code is ${code}. It expires in 10 minutes.`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Brevo send failed", res.status, body);
    // Surface the plain reason so the UI can show it.
    if (res.status === 401) throw new Error("Email service rejected the API key.");
    if (res.status === 403) throw new Error("Email sender is not verified in Brevo.");
    throw new Error("Could not send the email right now.");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.email !== "string") {
      return NextResponse.json({ error: "Missing email." }, { status: 400 });
    }
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });
    }

    if (body.action === "verify") {
      const entry = codes.get(email);
      if (!entry || entry.expires < Date.now()) {
        codes.delete(email);
        return NextResponse.json({ error: "That code has expired. Request a new one." }, { status: 400 });
      }
      if (String(body.code ?? "").trim() !== entry.code) {
        return NextResponse.json({ error: "That code isn't right." }, { status: 400 });
      }
      codes.delete(email);
      return NextResponse.json({ ok: true });
    }

    // action === "send"
    const code = makeCode();
    codes.set(email, { code, expires: Date.now() + CODE_TTL_MS });
    await sendEmail(email, code);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Unexpected error." },
      { status: 500 },
    );
  }
}
