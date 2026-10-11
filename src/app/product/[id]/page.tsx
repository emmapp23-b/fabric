"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Heart, Minus, Package, Plus, ShoppingBag, Star, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { Logo, Media, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { MIN_YARDS, naira, stockLevel, useProduct } from "@/lib/data";
import { useShop } from "@/lib/cart";

export default function ProductDetailsPage() {
  // cacheComponents: useParams suspends during prerender for dynamic params.
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-fv-bg">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-fv-pink border-t-transparent" />
        </div>
      }
    >
      <ProductDetails />
    </Suspense>
  );
}

function ProductDetails() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { product, loading } = useProduct(id);
  const { addToCart, isFavorite, toggleFavorite } = useShop();
  const [yards, setYards] = useState(MIN_YARDS);
  const [color, setColor] = useState(0);
  const [added, setAdded] = useState(false);

  const level = product ? stockLevel(product) : "in";
  const out = level === "out";
  const max = product ? Math.max(MIN_YARDS, product.availableYards) : MIN_YARDS;
  const cappedYards = Math.min(yards, max);

  function onAdd() {
    if (!product || out) return;
    addToCart(product, cappedYards);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function onBuyNow() {
    if (!product || out) return;
    addToCart(product, cappedYards);
    router.push("/cart");
  }

  return (
    <RequireAuth>
    <Screen>

      <header className="flex items-center justify-between px-5 pt-2 pb-3">
        <button onClick={() => router.back()} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full border border-fv-line bg-fv-panel">
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <Logo size="sm" />
        <button
          onClick={() => id && toggleFavorite(id)}
          aria-label="Save"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-fv-line bg-fv-panel"
        >
          <Heart className={`h-5 w-5 ${id && isFavorite(id) ? "fill-fv-pink text-fv-pink" : "text-white"}`} />
        </button>
      </header>

      {loading && (
        <div className="flex flex-1 items-center justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-fv-pink border-t-transparent" />
        </div>
      )}

      {!loading && !product && (
        <div className="mx-5 mt-10 rounded-2xl border border-dashed border-fv-line bg-fv-panel p-8 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-fv-muted" />
          <p className="mt-3 text-sm font-semibold">Product not found</p>
          <p className="mt-1 text-xs text-fv-muted">This product may have been removed.</p>
          <Link href="/explore" className="mt-4 inline-block rounded-full bg-fv-pink px-5 py-2.5 text-sm font-bold">
            Back to Explore
          </Link>
        </div>
      )}

      {!loading && product && (
        <>
          {/* Image */}
          <div className="relative mx-5 h-72 overflow-hidden rounded-3xl border border-fv-line">
            <Media src={product.img} alt={product.name} />
            {product.badge && (
              <span className={`absolute top-3 left-3 rounded-full px-3 py-1.5 text-[11px] font-bold text-white ${product.badgeClass}`}>
                {product.badge}
              </span>
            )}
            {out && (
              <span className="absolute top-3 right-3 rounded-full bg-red-500 px-3 py-1.5 text-[11px] font-black text-white">
                OUT OF STOCK
              </span>
            )}
            {!out && level === "low" && (
              <span className="absolute top-3 right-3 rounded-full bg-amber-500 px-3 py-1.5 text-[11px] font-black text-white">
                LOW STOCK
              </span>
            )}
          </div>

          <div className="px-5 pt-5">
            {/* Title */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl leading-tight font-extrabold">{product.name}</h1>
                <p className="mt-1 text-sm text-fv-muted">{product.spec}</p>
              </div>
              <span className="shrink-0 rounded-full border border-fv-line bg-fv-panel px-3 py-1 text-xs font-semibold text-slate-300">
                {product.category}
              </span>
            </div>

            {/* Rating + stock */}
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="font-bold">{product.rating}</span>
                <span className="text-fv-muted">({product.reviews})</span>
              </span>
              <span className="flex items-center gap-1 text-fv-muted">
                <Package className="h-4 w-4" />
                {out ? "Out of stock" : `${product.availableYards} yards available`}
              </span>
            </div>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-fv-pink">{naira(product.price)}</span>
              <span className="text-sm text-fv-muted">/yard</span>
            </div>

            {/* Colors */}
            {product.colors.length > 0 && (
              <div className="mt-5">
                <div className="text-sm font-bold">Colour</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {product.colors.map((c, i) => (
                    <button
                      key={c + i}
                      onClick={() => setColor(i)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        color === i ? "border-fv-pink bg-fv-pink/10 text-white" : "border-fv-line bg-fv-panel text-slate-300"
                      }`}
                    >
                      <span className="h-3.5 w-3.5 rounded-full border border-white/30" style={{ background: c }} />
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Yards picker (min 6) */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">Quantity (yards)</div>
                <div className="text-xs text-fv-muted">Min {MIN_YARDS} yards (1 piece)</div>
              </div>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex items-center gap-4 rounded-full border border-fv-line bg-fv-panel px-4 py-2">
                  <button
                    onClick={() => setYards((y) => Math.max(MIN_YARDS, y - 1))}
                    aria-label="Decrease"
                    className="disabled:opacity-40"
                    disabled={out || cappedYards <= MIN_YARDS}
                  >
                    <Minus className="h-4 w-4 text-white" />
                  </button>
                  <span className="w-8 text-center text-base font-extrabold">{cappedYards}</span>
                  <button
                    onClick={() => setYards((y) => Math.min(max, y + 1))}
                    aria-label="Increase"
                    className="disabled:opacity-40"
                    disabled={out || cappedYards >= max}
                  >
                    <Plus className="h-4 w-4 text-white" />
                  </button>
                </div>
                <span className="text-sm text-fv-muted">
                  Subtotal: <b className="text-white">{naira(product.price * cappedYards)}</b>
                </span>
              </div>
            </div>

            {/* Perks */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { icon: Truck, label: "Waybill delivery" },
                { icon: ShieldCheck, label: "Quality checked" },
                { icon: RotateCcw, label: "7-day returns" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 rounded-2xl border border-fv-line bg-fv-panel px-2 py-3 text-center">
                  <Icon className="h-5 w-5 text-fv-pink" />
                  <span className="text-[11px] text-slate-300">{label}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="mt-5">
              <h2 className="text-sm font-bold">Description</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-fv-muted">
                {product.description || `${product.name} — ${product.spec}. Sold per yard, quality checked before dispatch.`}
              </p>
            </div>
          </div>

          {/* Sticky action bar */}
          <div className="sticky bottom-0 mt-auto border-t border-fv-line bg-fv-bg/95 px-5 py-4 backdrop-blur-md">
            {out ? (
              <button disabled className="w-full rounded-full bg-slate-600/40 px-5 py-3.5 text-sm font-bold text-slate-400">
                Out of Stock
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={onAdd}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-5 py-3.5 text-sm font-bold transition ${
                    added ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : "border-fv-line bg-fv-panel text-white"
                  }`}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {added ? "Added ✓" : "Add to Cart"}
                </button>
                <button
                  onClick={onBuyNow}
                  className="flex-1 rounded-full bg-fv-pink px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-fv-pink/30"
                >
                  Buy Now
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </Screen>
    </RequireAuth>
  );
}
