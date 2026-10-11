"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { Media } from "@/components/ui";
import { useCategories } from "@/lib/data";
import { createCategory, deleteCategory } from "@/lib/mutations";
import { uploadToCloudinary } from "@/lib/cloudinary";

/**
 * Admin: manage the shop categories shown as circles on Home/Explore.
 * Each category is a name + a circle image. Adding one here makes it appear
 * as a chip and a circle on the home screen immediately.
 */
export default function AdminCategoriesPage() {
  const { items: categories, loading } = useCategories();
  const [name, setName] = useState("");
  const [img, setImg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { secure_url } = await uploadToCloudinary(file, { folder: "fabricverse/categories", resourceType: "image" });
      setImg(secure_url);
    } catch (err) {
      setError((err as Error).message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await createCategory({ name, img });
      setName("");
      setImg("");
    } catch (err) {
      setError((err as Error).message || "Could not add category.");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    await deleteCategory(id).catch(() => setError("Could not delete."));
  }

  const inp =
    "w-full rounded-xl border border-white/10 bg-[#0a0713] px-3.5 py-3 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none";

  return (
    <div className="px-5 pt-4 pb-8">
      <h1 className="text-2xl font-extrabold">Categories</h1>
      <p className="mt-1 text-sm text-slate-400">Add the fabric categories shown as circles on the home screen.</p>

      <form onSubmit={add} className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <label className="mb-1.5 block text-xs font-semibold text-slate-400">Category name *</label>
        <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ankara" />

        <label className="mt-3 mb-1.5 block text-xs font-semibold text-slate-400">Circle image</label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-500/40 bg-violet-500/5 px-4 py-6"
        >
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
          ) : img ? (
            <span className="relative h-16 w-16 overflow-hidden rounded-full border border-white/10">
              <Media src={img} alt="Category" />
            </span>
          ) : (
            <ImagePlus className="h-7 w-7 text-violet-400" />
          )}
          <span className="text-sm font-semibold">{uploading ? "Uploading…" : img ? "Change image" : "Upload image"}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

        {error && <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-violet-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {saving ? "Adding…" : "Add category"}
        </button>
      </form>

      <h2 className="mt-6 text-sm font-bold text-slate-300">Existing categories</h2>
      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
          No categories yet.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10">
                <Media src={c.img} alt={c.name} icon={<span className="text-sm font-extrabold text-white/80">{c.name.slice(0, 1)}</span>} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{c.name}</span>
              <button onClick={() => onDelete(c.id)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40" aria-label="Delete category">
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
