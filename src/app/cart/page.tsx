"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Package, Plus, Trash2, Truck } from "lucide-react";
import { Logo, Media, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { MIN_YARDS, naira } from "@/lib/data";
import { useShop } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { createOrder, decrementStock } from "@/lib/mutations";

const NIGERIAN_STATES = [
  "Lagos", "Abuja (FCT)", "Kano", "Rivers", "Oyo", "Kaduna", "Enugu", "Delta",
  "Anambra", "Ogun", "Edo", "Akwa Ibom", "Plateau", "Cross River", "Benue",
];

interface DeliveryForm {
  fullName: string;
  phone: string;
  state: string;
  town: string;
  area: string;
  street: string;
  nearestPark: string;
  destinationPark: string;
}

const EMPTY: DeliveryForm = { fullName: "", phone: "", state: "", town: "", area: "", street: "", nearestPark: "", destinationPark: "" };

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, cartTotal, setYards, removeFromCart, clearCart } = useShop();
  const [step, setStep] = useState<"cart" | "delivery">("cart");
  const [form, setForm] = useState<DeliveryForm>(EMPTY);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  const subtotal = cartTotal;
  // Delivery fee is confirmed later by the admin (waybill quote).
  const deliveryFee: number | null = null;
  const total = subtotal;

  function set<K extends keyof DeliveryForm>(k: K, v: DeliveryForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const formValid =
    form.fullName.trim() &&
    form.phone.trim().length >= 7 &&
    form.state &&
    form.town.trim() &&
    form.area.trim() &&
    form.street.trim();

  async function onPlaceOrder() {
    if (cart.length === 0 || placing || !formValid) return;
    setError("");
    setPlacing(true);
    try {
      const orderId = await createOrder({
        customerId: user?.uid ?? "",
        customerName: user?.displayName || form.fullName,
        items: cart.map((l) => ({
          productId: l.id,
          name: l.name,
          spec: l.spec,
          yards: l.yards,
          pricePerYard: l.pricePerYard,
          img: l.img,
        })),
        productSubtotal: subtotal,
        delivery: form,
      });
      // Reduce stock for each fabric ordered.
      await decrementStock(cart.map((l) => ({ productId: l.id, yards: l.yards })));
      clearCart();
      router.push(`/orders/${orderId}`);
    } catch (e) {
      setError((e as Error).message || "Could not place the order. Try again.");
      setPlacing(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-fv-line bg-fv-bg px-3.5 py-3 text-sm text-white placeholder:text-fv-muted focus:border-fv-pink focus:outline-none";

  return (
    <RequireAuth>
    <Screen>

      <header className="flex items-center justify-between px-5 pt-2 pb-3">
        <button onClick={() => (step === "delivery" ? setStep("cart") : router.back())} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full border border-fv-line bg-fv-panel">
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <Logo size="sm" />
        <span className="w-9" />
      </header>

      <div className="px-5 pb-4">
        <h1 className="text-2xl font-extrabold">{step === "cart" ? "My Cart" : "Delivery details"}</h1>
        <p className="mt-1 text-sm text-fv-muted">
          {step === "cart"
            ? cart.length === 0
              ? "Your cart is empty."
              : `${cart.length} fabric${cart.length > 1 ? "s" : ""} • ${cart.reduce((n, l) => n + l.yards, 0)} yards`
            : "Collect your parcel at the destination motor park."}
        </p>
      </div>

      {step === "cart" && cart.length === 0 && (
        <div className="mx-5 rounded-2xl border border-dashed border-fv-line bg-fv-panel p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-fv-muted" />
          <p className="mt-3 text-sm font-semibold">Your cart is empty</p>
          <p className="mt-1 text-xs text-fv-muted">Browse fabrics and add them to your cart.</p>
          <Link href="/explore" className="mt-4 inline-block rounded-full bg-fv-pink px-5 py-2.5 text-sm font-bold">
            Explore Fabrics
          </Link>
        </div>
      )}

      {step === "cart" && cart.length > 0 && (
        <>
          <div className="flex flex-col gap-3 px-5">
            {cart.map((l) => (
              <article key={l.id} className="flex gap-3 rounded-2xl border border-fv-line bg-fv-panel p-3">
                <Link href={`/product/${l.id}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                  <Media src={l.img} alt={l.name} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold">{l.name}</h3>
                      <p className="truncate text-[11px] text-fv-muted">{naira(l.pricePerYard)}/yard</p>
                    </div>
                    <button onClick={() => removeFromCart(l.id)} aria-label="Remove" className="shrink-0">
                      <Trash2 className="h-4 w-4 text-fv-muted" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3 rounded-full border border-fv-line bg-fv-bg px-3 py-1.5">
                      <button onClick={() => setYards(l.id, l.yards - 1)} aria-label="Decrease yards" className="disabled:opacity-40" disabled={l.yards <= MIN_YARDS}>
                        <Minus className="h-3.5 w-3.5 text-white" />
                      </button>
                      <span className="w-14 text-center text-xs font-bold">{l.yards} yd</span>
                      <button onClick={() => setYards(l.id, l.yards + 1)} aria-label="Increase yards">
                        <Plus className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                    <span className="text-[15px] font-extrabold">{naira(l.pricePerYard * l.yards)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Summary */}
          <div className="mx-5 mt-5 rounded-2xl border border-fv-line bg-fv-panel p-4">
            <div className="flex justify-between text-sm">
              <span className="text-fv-muted">Fabric subtotal</span>
              <span className="font-semibold">{naira(subtotal)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="flex items-center gap-1.5 text-fv-muted"><Truck className="h-4 w-4" /> Delivery (waybill)</span>
              <span className="font-semibold text-amber-400">Awaiting quote</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-fv-line pt-3 text-base font-extrabold">
              <span>Payload today</span>
              <span className="text-fv-pink">{naira(total)}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-fv-muted">
              Delivery is charged separately after our admin confirms the real waybill
              price with the transport operator. You&apos;ll review the full total before paying.
            </p>
          </div>

          {error && <p className="mx-5 mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

          <div className="p-5">
            <button
              onClick={() => setStep("delivery")}
              className="w-full rounded-full bg-fv-pink px-5 py-4 text-sm font-bold text-white shadow-lg shadow-fv-pink/30"
            >
              Continue to Delivery Details
            </button>
          </div>
        </>
      )}

      {step === "delivery" && (
        <>
          <div className="flex flex-col gap-3 px-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Full name</label>
              <input className={inputCls} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="e.g. Bola Adebayo" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Phone number</label>
              <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" placeholder="0803 000 0000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">State</label>
                <select className={inputCls} value={form.state} onChange={(e) => set("state", e.target.value)}>
                  <option value="">Select state</option>
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Town / city</label>
                <input className={inputCls} value={form.town} onChange={(e) => set("town", e.target.value)} placeholder="Ikeja" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Area & street</label>
              <input className={inputCls} value={form.area} onChange={(e) => set("area", e.target.value)} placeholder="Area (e.g. Maryland)" />
              <input className={`${inputCls} mt-2`} value={form.street} onChange={(e) => set("street", e.target.value)} placeholder="Street address" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Nearest motor park / landmark</label>
              <input className={inputCls} value={form.nearestPark} onChange={(e) => set("nearestPark", e.target.value)} placeholder="Ikeja Motor Park" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Preferred destination motor park</label>
              <input className={inputCls} value={form.destinationPark} onChange={(e) => set("destinationPark", e.target.value)} placeholder="Ojuelegba Motor Park" />
            </div>

            <div className="rounded-xl border border-fv-line bg-fv-panel p-3 text-[11px] leading-relaxed text-fv-muted">
              Delivery is by public transport / motor-park waybill. You&apos;ll collect your
              parcel at the destination motor park once it arrives — we&apos;ll send you the
              details and a collection code.
            </div>
          </div>

          {error && <p className="mx-5 mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

          <div className="p-5">
            <div className="mb-3 rounded-2xl border border-fv-line bg-fv-panel p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-fv-muted">Fabric subtotal</span>
                <span className="font-semibold">{naira(subtotal)}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-fv-muted">Delivery fee</span>
                <span className="font-semibold text-amber-400">Awaiting quote</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-fv-line pt-2 font-extrabold">
                <span>Payload today</span>
                <span className="text-fv-pink">{naira(total)}</span>
              </div>
            </div>
            <button
              onClick={onPlaceOrder}
              disabled={placing || !formValid}
              className="w-full rounded-full bg-fv-pink px-5 py-4 text-sm font-bold text-white shadow-lg shadow-fv-pink/30 disabled:opacity-60"
            >
              {placing ? "Placing order…" : "Submit Order for Delivery Quote"}
            </button>
            <p className="mt-2 text-center text-[11px] text-fv-muted">
              No delivery charge yet — you&apos;ll approve the full price before paying.
            </p>
          </div>
        </>
      )}
    </Screen>
    </RequireAuth>
  );
}
