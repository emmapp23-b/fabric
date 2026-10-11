"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2, Upload, Video } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProducts, useReels } from "@/lib/data";
import { createReel, deleteReel } from "@/lib/mutations";
import { uploadToCloudinary } from "@/lib/cloudinary";

/**
 * Admin: post short fabric videos to the Reels tab. Users watch, like,
 * comment and share. A reel can tag a product so viewers can shop it — the
 * tagged product is what surfaces in Live for shopping.
 */
export default function AdminReelsPage() {
  const { user } = useAuth();
  const { items: reels, loading } = useReels();
  const { items: products } = useProducts();

  const [video, setVideo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { secure_url } = await uploadToCloudinary(file, { folder: "fabricverse/reels", resourceType: "video" });
      setVideo(secure_url);
    } catch (err) {
      setError((err as Error).message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!video || saving) return;
    setSaving(true);
    setError("");
    try {
      const name = user?.displayName || user?.email?.split("@")[0] || "FabricVerse";
      await createReel({ sellerName: name, caption: caption.trim(), video, productId });
      setVideo("");
      setCaption("");
      setProductId("");
    } catch (err) {
      setError((err as Error).message || "Could not post.");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this reel?")) return;
    await deleteReel(id).catch(() => setError("Could not delete."));
  }

  const inp =
    "w-full rounded-xl border border-white/10 bg-[#0a0713] px-3.5 py-3 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none";

  return (
    <div className="px-5 pt-4 pb-8">
      <h1 className="text-2xl font-extrabold">Reels</h1>
      <p className="mt-1 text-sm text-slate-400">Post fabric videos. Users watch, like, comment and share.</p>

      <form onSubmit={post} className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-500/40 bg-violet-500/5 px-4 py-8"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          ) : video ? (
            <Video className="h-8 w-8 text-emerald-400" />
          ) : (
            <Upload className="h-8 w-8 text-violet-400" />
          )}
          <span className="text-sm font-semibold">
            {uploading ? "Uploading…" : video ? "Video ready — tap to replace" : "Choose a video"}
          </span>
          <span className="text-[11px] text-slate-500">MP4, portrait works best</span>
        </button>
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={onFile} />

        <label className="mt-3 mb-1.5 block text-xs font-semibold text-slate-400">Caption</label>
        <input className={inp} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Soft ankara for owambe season…" />

        <label className="mt-3 mb-1.5 block text-xs font-semibold text-slate-400">Tag a product (so viewers can shop it)</label>
        <select className={inp} value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">None</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {error && <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={!video || saving}
          className="mt-4 w-full rounded-full bg-violet-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? "Posting…" : "Post reel"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-300">Your reels</h2>
        <Link href="/reels" className="text-xs font-semibold text-violet-400">Preview as user</Link>
      </div>
      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      ) : reels.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
          No reels yet. Post your first video above.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {reels.map((r) => (
            <div key={r.id} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <video src={r.video} className="h-24 w-16 shrink-0 rounded-lg object-cover" muted playsInline preload="metadata" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{r.caption || "Untitled reel"}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {r.likes.length} likes · {r.comments.length} comments · {r.shares} shares · {r.views} views
                </p>
              </div>
              <button onClick={() => onDelete(r.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40" aria-label="Delete reel">
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
