"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { Media } from "@/components/ui";
import { MIN_YARDS, type Product } from "@/lib/data";
import { createProduct, deleteProduct, updateProduct } from "@/lib/mutations";

type FormState = {
  name: string;
  spec: string;
  category: string;
  price: string;
  availableYards: string;
  lowStockAt: string;
  colors: string[];
  description: string;
  badge: string;
  badgeClass: string;
  img: string;
  status: "published" | "draft";
};

const BADGES = [
  { label: "None", value: "", cls: "" },
  { label: "Best Seller", value: "Best Seller", cls: "bg-fv-pink" },
  { label: "Trending", value: "Trending", cls: "bg-fv-purple" },
  { label: "New", value: "New", cls: "bg-emerald-500" },
  { label: "Premium", value: "Premium", cls: "bg-amber-500" },
];

const COLOR_CHOICES = ["#ff1e63", "#a855f7", "#0ea5e9", "#22c55e", "#eab308", "#f97316", "#ec4899", "#14b8a6", "#ffffff", "#111827"];

export function ProductForm({ initial, id }: { initial?: Product; id?: string }) {
  const [f, setF] = useState<FormState>({
    name: initial?.name ?? "",
    spec: initial?.spec ?? "",
    category: initial?.category ?? "",
    price: initial ? String(initial.price) : "",
    availableYards: initial ? String(initial.availableYards) : "",
    lowStockAt: initial ? String(initial.lowStockAt) : "5",
    colors: initial?.colors ?? [],
    description: initial?.description ?? "",
    badge: initial?.badge ?? "",
    badgeClass: initial?.badgeClass ?? "",
    img: initial?.img ?? "",
    status: initial?.status ?? "published",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  function toggleColor(c: string) {
    setF((p) => ({ ...p, colors: p.colors.includes(c) ? p.colors.filter((x) => x !== c) : [...p.colors, c] }));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", file.type.startsWith("video") ? "video" : "image");
      const res = await fetch("/api/cloudinary", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      set("img", data.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const valid = f.name.trim() && f.category.trim() && Number(f.price) > 0 && Number(f.availableYards) >= 0;

  async function save(status: "published" | "draft") {
    if (!valid || saving) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: f.name.trim(),
        spec: f.spec.trim(),
        category: f.category.trim(),
        price: Number(f.price),
        availableYards: Number(f.availableYards),
        lowStockAt: Number(f.lowStockAt || 5),
        colors: f.colors,
        description: f.description.trim(),
        badge: f.badge,
        badgeClass: f.badgeClass,
        img: f.img,
        status,
      };
      if (id) await updateProduct(id, payload);
      else await createProduct(payload as Omit<Product, "id" | "rating" | "reviews">);
      window.location.href = "/admin/products";
    } catch (err) {
      setError((err as Error).message || "Could not save product.");
      setSaving(false);
    }
  }

  const inp = "w-full rounded-xl border border-white/10 bg-[#0a0713] px-3.5 py-3 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none";
  const lab = "mb-1.5 block text-xs font-semibold text-slate-400";

  return (
    <div className="px-5 pt-4 pb-8">
      <h1 className="text-2xl font-extrabold">{id ? "Edit Product" : "Add Product"}</h1>
      <p className="mt-1 text-sm text-slate-400">Add a new fabric to your store.</p>

      {/* Media */}
      <div className="mt-4">
        <label className={lab}>Photos / video</label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-500/40 bg-violet-500/5 px-4 py-7"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          ) : (
            <ImagePlus className="h-8 w-8 text-violet-400" />
          )}
          <span className="text-sm font-semibold">{uploading ? "Uploading…" : "Choose image or video"}</span>
          <span className="text-[11px] text-slate-500">Uploaded to Cloudinary</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFile} />
        {f.img && (
          <div className="relative mt-3 h-40 overflow-hidden rounded-2xl border border-white/10">
            <Media src={f.img} alt="Product" />
            <button onClick={() => set("img", "")} className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60" aria-label="Remove image">
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="mt-4 flex flex-col gap-3.5">
        <div>
          <label className={lab}>Product name *</label>
          <input className={inp} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Premium Ankara Print" />
        </div>
        <div>
          <label className={lab}>Spec (colour • material)</label>
          <input className={inp} value={f.spec} onChange={(e) => set("spec", e.target.value)} placeholder="Blue & Orange • 100% Cotton" />
        </div>
        <div>
          <label className={lab}>Category *</label>
          <input className={inp} value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="Ankara" list="fv-categories" />
          <datalist id="fv-categories">
            <option value="Ankara" /><option value="Lace" /><option value="Silk" /><option value="Cotton" /><option value="Denim" /><option value="Polyester" />
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lab}>Price per yard (₦) *</label>
            <input className={inp} inputMode="numeric" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="6500" />
          </div>
          <div>
            <label className={lab}>Available yards *</label>
            <input className={inp} inputMode="numeric" value={f.availableYards} onChange={(e) => set("availableYards", e.target.value)} placeholder="50" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lab}>Low-stock alert at</label>
            <input className={inp} inputMode="numeric" value={f.lowStockAt} onChange={(e) => set("lowStockAt", e.target.value)} />
          </div>
          <div>
            <label className={lab}>Badge</label>
            <select className={inp} value={f.badge} onChange={(e) => {
              const b = BADGES.find((x) => x.value === e.target.value);
              setF((p) => ({ ...p, badge: b?.value ?? "", badgeClass: b?.cls ?? "" }));
            }}>
              {BADGES.map((b) => <option key={b.label} value={b.value}>{b.label}</option>)}
            </select>
          </div>
        </div>

        {/* Colors */}
        <div>
          <label className={lab}>Colours / variants</label>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleColor(c)}
                className={`h-8 w-8 rounded-full border-2 ${f.colors.includes(c) ? "border-white" : "border-white/20"}`}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div>
          <label className={lab}>Description</label>
          <textarea className={`${inp} h-24 resize-none`} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="High quality Ankara fabric, 100% cotton…" />
        </div>

        {f.availableYards !== "" && Number(f.availableYards) < MIN_YARDS && Number(f.availableYards) > 0 && (
          <p className="text-[11px] text-amber-400">Heads up: below {MIN_YARDS} yards this is under one full piece.</p>
        )}
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

      <div className="mt-5 flex gap-3">
        <button onClick={() => save("draft")} disabled={saving || !valid} className="flex-1 rounded-full border border-white/15 bg-white/[0.03] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50">
          Save Draft
        </button>
        <button onClick={() => save("published")} disabled={saving || !valid} className="flex-1 rounded-full bg-violet-500 px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50">
          {saving ? "Saving…" : id ? "Update" : "Publish"}
        </button>
      </div>

      {/* Delete (only when editing an existing product) */}
      {id && (
        <button
          onClick={async () => {
            if (!confirm("Delete this product permanently?")) return;
            setDeleting(true);
            try {
              await deleteProduct(id);
              window.location.href = "/admin/products";
            } catch (err) {
              setError((err as Error).message || "Could not delete product.");
              setDeleting(false);
            }
          }}
          disabled={deleting || saving}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? "Deleting…" : "Delete product"}
        </button>
      )}
    </div>
  );
}
