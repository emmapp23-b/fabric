"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Media } from "@/components/ui";
import { useBanners } from "@/lib/data";
import { createBanner, deleteBanner } from "@/lib/mutations";
import { uploadToCloudinary } from "@/lib/cloudinary";

/**
 * Admin: home cover banners. The uploaded image IS the promo — there is no
 * text overlay on the home hero. Add an image, optionally set where it taps
 * through to, and order decides the swipe sequence.
 */
export default function AdminBannersPage() {
  const { items: banners, loading } = useBanners();
  const [uploading, setUploading] = useState(false);
  const [link, setLink] = useState("/explore");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { secure_url } = await uploadToCloudinary(file, { folder: "fabricverse/banners", resourceType: "image" });
      await createBanner({ img: secure_url, link: link.trim() || "/explore", order: banners.length });
    } catch (err) {
      setError((err as Error).message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this cover image?")) return;
    await deleteBanner(id).catch(() => setError("Could not delete."));
  }

  const inp =
    "w-full rounded-xl border border-white/10 bg-[#0a0713] px-3.5 py-3 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none";

  return (
    <div className="px-5 pt-4 pb-8">
      <h1 className="text-2xl font-extrabold">Cover Images</h1>
      <p className="mt-1 text-sm text-slate-400">
        The image is the whole banner on the home screen — no text on top. Swipe order follows the list below.
      </p>

      <label className="mt-4 block text-xs font-semibold text-slate-400">Opens when tapped (link)</label>
      <input className={`${inp} mt-1.5`} value={link} onChange={(e) => setLink(e.target.value)} placeholder="/explore" />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-500/40 bg-violet-500/5 px-4 py-8"
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        ) : (
          <ImagePlus className="h-8 w-8 text-violet-400" />
        )}
        <span className="text-sm font-semibold">{uploading ? "Uploading…" : "Add cover image"}</span>
        <span className="text-[11px] text-slate-500">Wide banner works best (~1000×400)</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {error && <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

      <h2 className="mt-6 text-sm font-bold text-slate-300">Live banners</h2>
      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      ) : banners.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
          No cover images yet. Add one above.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {banners.map((b) => (
            <div key={b.id} className="relative h-36 overflow-hidden rounded-2xl border border-white/10">
              <Media src={b.img} alt="Cover" />
              <button
                onClick={() => onDelete(b.id)}
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60"
                aria-label="Delete cover"
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
