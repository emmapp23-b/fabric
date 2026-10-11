"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, Loader2, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { BottomNav, Logo, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { useAddresses } from "@/lib/data";
import { addAddress, deleteAddress, setDefaultAddress } from "@/lib/mutations";

const STATES = [
  "Lagos", "Abuja (FCT)", "Rivers", "Kano", "Oyo", "Enugu", "Kaduna", "Delta",
  "Anambra", "Ogun", "Akwa Ibom", "Edo", "Plateau", "Cross River", "Imo",
];

export default function AddressesPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const { items: addresses, loading } = useAddresses(uid);

  const [form, setForm] = useState({
    label: "Home", recipient: "", phone: "", line: "", city: "", state: "Lagos",
  });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || saving) return;
    if (!form.recipient.trim() || !form.line.trim()) {
      setError("Recipient and street address are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addAddress({
        userId: uid,
        label: form.label.trim() || "Address",
        recipient: form.recipient.trim(),
        phone: form.phone.trim(),
        line: form.line.trim(),
        city: form.city.trim(),
        state: form.state,
        isDefault: addresses.length === 0, // first address is default
      });
      setForm({ label: "Home", recipient: "", phone: "", line: "", city: "", state: "Lagos" });
      setAdding(false);
    } catch (err) {
      setError((err as Error).message || "Could not save address.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this address?")) return;
    await deleteAddress(id).catch(() => setError("Could not delete address."));
  }

  const inp =
    "w-full rounded-xl border border-fv-line bg-fv-bg px-3.5 py-3 text-sm text-white placeholder:text-fv-muted focus:border-fv-pink focus:outline-none";

  return (
    <RequireAuth>
      <Screen>
        <header className="flex items-center gap-3 px-5 pt-2 pb-3">
          <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-fv-panel" aria-label="Back">
            <ChevronLeft className="h-5 w-5 text-white" />
          </Link>
          <Logo size="md" />
        </header>

        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <h1 className="text-2xl font-extrabold">Shipping Addresses</h1>
            <p className="mt-1 text-sm text-fv-muted">Manage where your orders are delivered.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-5 pb-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-fv-line bg-fv-panel py-8 text-sm text-fv-muted">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading addresses…
            </div>
          ) : addresses.length === 0 && !adding ? (
            <div className="rounded-2xl border border-dashed border-fv-line bg-fv-panel p-8 text-center">
              <MapPin className="mx-auto h-8 w-8 text-fv-muted" />
              <p className="mt-3 text-sm font-semibold">No addresses yet</p>
              <p className="mt-1 text-xs text-fv-muted">Add where you want your orders delivered.</p>
            </div>
          ) : (
            addresses.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-fv-line bg-fv-panel p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fv-pink/15">
                  <MapPin className="h-5 w-5 text-fv-pink" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold">{a.label}</span>
                    {a.isDefault && (
                      <span className="rounded bg-fv-pink px-1.5 py-0.5 text-[10px] font-bold text-white">Default</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-fv-muted">
                    {a.recipient} • {a.line}{a.city ? `, ${a.city}` : ""}{a.state ? `, ${a.state}` : ""}
                  </p>
                  {a.phone && <p className="truncate text-xs text-fv-muted">{a.phone}</p>}
                </div>
                {!a.isDefault && (
                  <button
                    onClick={() => setDefaultAddress(a.id, uid, addresses.map((x) => x.id)).catch(() => undefined)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40"
                    aria-label="Set as default"
                  >
                    <Star className="h-4 w-4 text-fv-muted" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(a.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40"
                  aria-label="Delete address"
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            ))
          )}

          {/* Add form */}
          {adding ? (
            <form onSubmit={onSave} className="rounded-2xl border border-fv-line bg-fv-panel p-4">
              <label className="mb-1.5 block text-xs font-semibold text-fv-muted">Label</label>
              <div className="mb-3 flex gap-2">
                {["Home", "Office", "Other"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => set("label", l)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      form.label === l ? "border-fv-pink bg-fv-pink text-white" : "border-fv-line bg-fv-bg text-slate-300"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <label className="mb-1.5 block text-xs font-semibold text-fv-muted">Recipient name *</label>
              <input className={`${inp} mb-3`} value={form.recipient} onChange={(e) => set("recipient", e.target.value)} placeholder="Full name" />

              <label className="mb-1.5 block text-xs font-semibold text-fv-muted">Phone</label>
              <input className={`${inp} mb-3`} inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0803 000 0000" />

              <label className="mb-1.5 block text-xs font-semibold text-fv-muted">Street address *</label>
              <input className={`${inp} mb-3`} value={form.line} onChange={(e) => set("line", e.target.value)} placeholder="12 Marina Road" />

              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-fv-muted">City</label>
                  <input className={inp} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Lagos Island" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-fv-muted">State</label>
                  <select className={inp} value={form.state} onChange={(e) => set("state", e.target.value)}>
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <p className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setAdding(false)} className="flex-1 rounded-full border border-fv-line bg-fv-bg px-5 py-3 text-sm font-bold text-white">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 rounded-full bg-fv-pink px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-fv-line bg-fv-panel px-4 py-4 text-sm font-bold text-fv-pink"
            >
              <Plus className="h-4 w-4" /> Add new address
            </button>
          )}

          {error && !adding && (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
          )}
        </div>

        <BottomNav active="profile" />
      </Screen>
    </RequireAuth>
  );
}
