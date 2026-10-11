/**
 * Cloudinary upload helper — used for all image & video uploads (banners,
 * categories, reels, avatars, product photos).
 *
 * Uploads go through our signed server route (/api/cloudinary) so the API
 * secret never reaches the browser. A direct unsigned upload would require a
 * Cloudinary upload preset, which we don't use — the signed route works with
 * just the cloud's API key/secret.
 */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export function cloudinaryUrl(publicId: string, opts?: { resourceType?: "image" | "video" }) {
  const rt = opts?.resourceType ?? "image";
  return `https://res.cloudinary.com/${CLOUD}/${rt}/upload/${publicId}`;
}

export async function uploadToCloudinary(
  file: File,
  opts?: { folder?: string; resourceType?: "image" | "video"; onProgress?: (pct: number) => void },
): Promise<{ secure_url: string; public_id: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("type", opts?.resourceType ?? "image");
  if (opts?.folder) form.append("folder", opts.folder);

  const res = await fetch("/api/cloudinary", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as {
    secure_url?: string;
    public_id?: string;
    error?: string;
  };

  if (!res.ok || !data.secure_url) {
    throw new Error(data.error ?? "Upload failed.");
  }

  return { secure_url: data.secure_url, public_id: data.public_id ?? "" };
}
