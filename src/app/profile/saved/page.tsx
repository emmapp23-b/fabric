"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { BottomNav, Logo, Media, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { naira, useProducts } from "@/lib/data";
import { useShop } from "@/lib/cart";

/**
 * Saved screen — shows every product the user tapped the heart on
 * (from Home, Explore or the product page).
 */
export default function SavedPage() {
  const { favorites, isFavorite, toggleFavorite, addToCart } = useShop();
  const { items: all } = useProducts();
  const saved = all.filter((p) => favorites.includes(p.id));

  return (
    <RequireAuth>
      <Screen>
        <header className="flex items-center justify-between px-5 pt-2 pb-3">
          <Logo size="md" />
          <Link href="/cart" className="flex h-9 w-9 items-center justify-center rounded-full bg-fv-pink" aria-label="Cart">
            <ShoppingBag className="h-4.5 w-4.5 text-white" />
          </Link>
        </header>

        <div className="px-5 pb-3">
          <h1 className="text-2xl font-extrabold">Saved</h1>
          <p className="mt-1 text-sm text-fv-muted">Fabrics you&apos;ve bookmarked.</p>
        </div>

        {saved.length === 0 ? (
          <div className="mx-5 mb-6 rounded-2xl border border-dashed border-fv-line bg-fv-panel p-8 text-center">
            <Heart className="mx-auto h-8 w-8 text-fv-muted" />
            <p className="mt-3 text-sm font-semibold">Nothing saved yet</p>
            <p className="mt-1 text-xs text-fv-muted">Tap the heart on any product to save it here.</p>
            <Link href="/explore" className="mt-4 inline-block rounded-full bg-fv-pink px-5 py-2.5 text-sm font-bold text-white">
              Explore fabrics
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 px-5 pb-6">
            {saved.map((p) => (
              <article key={p.id} className="overflow-hidden rounded-2xl border border-fv-line bg-fv-panel">
                <div className="relative h-36">
                  <Link href={`/product/${p.id}`} className="absolute inset-0">
                    <Media src={p.img} alt={p.name} />
                  </Link>
                  {p.badge && (
                    <span className={`pointer-events-none absolute top-2 left-2 rounded-full px-2.5 py-1 text-[10px] font-bold text-white ${p.badgeClass}`}>
                      {p.badge}
                    </span>
                  )}
                  <button
                    onClick={() => toggleFavorite(p.id)}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm"
                    aria-label="Unsave"
                  >
                    <Heart className={`h-3.5 w-3.5 ${isFavorite(p.id) ? "fill-fv-pink text-fv-pink" : "text-white"}`} />
                  </button>
                </div>
                <div className="p-3">
                  <Link href={`/product/${p.id}`}>
                    <h3 className="truncate text-sm font-bold">{p.name}</h3>
                    <p className="mt-0.5 truncate text-[11px] text-fv-muted">{p.spec}</p>
                  </Link>
                  <div className="mt-1.5 flex items-center gap-1 text-[12px]">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{p.rating}</span>
                    <span className="text-fv-muted">({p.reviews})</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[15px] font-extrabold">
                      {naira(p.price)}
                      <span className="text-[11px] font-medium text-fv-muted"> /yard</span>
                    </span>
                    <button
                      onClick={() => addToCart(p)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-fv-pink text-white"
                      aria-label="Add to cart"
                    >
                      <ShoppingBag className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <BottomNav active="profile" />
      </Screen>
    </RequireAuth>
  );
}
