import { createHmac } from "crypto";
import { NextResponse } from "next/server";

/**
 * Server-side Cloudinary upload. The API secret never reaches the client:
 * we sign the upload params here and let the browser send the file straight
 * to Cloudinary, then return the secure URL.
 *
 * Env (already in .env.local):
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

// Read from the plain names, falling back to the NEXT_PUBLIC_ variants that
// .env.local actually defines, so the signed route works out of the box.
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY ?? process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_FOLDER ?? "fabricverse";

function sign(params: Record<string, string | number>): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHmac("sha1", SECRET!).update(toSign).digest("hex");
}

export async function POST(req: Request) {
  if (!CLOUD || !KEY || !SECRET) {
    return NextResponse.json({ error: "Cloudinary is not configured." }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("type") ?? "image"); // image | video
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  // Allow the caller to pick a subfolder (e.g. "fabricverse/banners").
  // It's still signed server-side, so a client can't upload outside the cloud.
  const requested = String(form.get("folder") ?? "").trim();
  const folder = requested.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "") || FOLDER;

  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, timestamp };
  const signature = sign(params);

  const cloudForm = new FormData();
  cloudForm.append("file", file);
  cloudForm.append("api_key", KEY!);
  cloudForm.append("timestamp", String(timestamp));
  cloudForm.append("folder", folder);
  cloudForm.append("signature", signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD}/${kind}/upload`;
  const res = await fetch(endpoint, { method: "POST", body: cloudForm });
  const data = (await res.json().catch(() => ({}))) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };

  if (!res.ok || !data.secure_url) {
    return NextResponse.json(
      { error: data.error?.message ?? "Upload failed." },
      { status: res.status || 500 },
    );
  }

  return NextResponse.json({ url: data.secure_url, secure_url: data.secure_url, public_id: data.public_id ?? "" });
}
