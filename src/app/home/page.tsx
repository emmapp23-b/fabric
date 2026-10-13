"use client";

import Link from "next/link";
import { useState } from "react";
import { Flame, Search, ShoppingCart, SlidersHorizontal, Star, Heart, ShoppingBag, Radio, Clapperboard } from "lucide-react";
import { BottomNav, Logo, Media, Screen, SectionHead } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { PushOptIn } from "@/components/pwa";
import { naira, useBanners, useCategories, useProducts, useReels } from "@/lib/data";
import { useShop } from "@/lib/cart";

export default function HomePage() {
  const [chip, setChip] = useState("All");
  const [query, setQuery] = useState("");
  const { items: categories } = useCategories();
  const { items: banners } = useBanners();
  const { items: reels } = useReels();
  const { items: allProducts } = useProducts();
  const { addToCart, cartCount, isFavorite, toggleFavorite } = useShop();

  // Chips come from real Firestore categories (no hardcoded list).
  const chips = ["All", ...categories.map((c) => c.name)];
  const PRODUCTS = allProducts.filter(
    (p) =>
      (chip === "All" || p.category === chip) &&
      (query.trim() === "" ||
        (p.name + " " + p.spec + " " + p.category).toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <RequireAuth>
    <Screen>

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-2 pb-3">
        <Logo size="md" />
        <Link href="/cart" className="relative" aria-label="Cart">
          <ShoppingCart className="h-6 w-6 text-white" />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-fv-pink px-1 text-[10px] font-bold">
              {cartCount}
            </span>
          )}
        </Link>
      </header>

      {/* Push notifications opt-in */}
      <PushOptIn />

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-3 rounded-full border border-fv-line bg-fv-panel px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-fv-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-[15px] text-white placeholder:text-fv-muted focus:outline-none"
            placeholder="Search fabrics, brands, or styles..."
          />
          <SlidersHorizontal className="h-5 w-5 shrink-0 text-fv-muted" />
        </div>
      </div>

      {/* Category chips (from Firestore) */}
      <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-5 pb-4">
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => setChip(c)}
            className={`shrink-0 rounded-full border px-5 py-2 text-sm font-semibold transition ${
              chip === c
                ? "border-fv-pink bg-fv-pink text-white"
                : "border-fv-line bg-fv-panel text-slate-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Cover banners (admin-uploaded images — the image is the whole promo, no text overlay) */}
      {banners.length > 0 && (
        <div className="no-scrollbar mb-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5">
          {banners.map((b) => (
            <Link
              key={b.id}
              href={b.link || "/explore"}
              className="relative h-40 w-full shrink-0 snap-center overflow-hidden rounded-3xl border border-fv-line bg-fv-panel"
              aria-label="Promotion"
            >
              <Media src={b.img} alt="Promotion" />
            </Link>
          ))}
        </div>
      )}

      {/* Explore by category */}
      {categories.length > 0 && (
        <>
          <SectionHead icon={<Flame className="h-5 w-5 fill-fv-pink text-fv-pink" />} title="Explore by Category" href="/explore" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-7">
            {categories.map((c) => (
              <button key={c.id} onClick={() => setChip(c.name)} className="flex w-16 shrink-0 flex-col items-center gap-2">
                <span className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-fv-line">
                  <Media src={c.img} alt={c.name} icon={<span className="text-lg font-extrabold text-white/80">{c.name.slice(0, 1)}</span>} />
                </span>
                <span className="text-xs font-medium text-slate-300">{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Popular products */}
      <SectionHead icon={<Star className="h-5 w-5 fill-white text-white" />} title="Popular Products" href="/explore" />
      {PRODUCTS.length === 0 ? (
        <div className="mx-5 mb-6 rounded-2xl border border-dashed border-fv-line bg-fv-panel p-8 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-fv-muted" />
          <p className="mt-3 text-sm font-semibold">No products yet</p>
          <p className="mt-1 text-xs text-fv-muted">
            Products added from the admin panel will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-6">
          {PRODUCTS.map((p) => (
            <article
              key={p.id}
              className="w-[172px] shrink-0 overflow-hidden rounded-2xl border border-fv-line bg-fv-panel"
            >
              <div className="relative h-32">
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
                  aria-label="Save"
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

      {/* Reels (short fabric videos) */}
      {reels.length > 0 && (
        <>
          <SectionHead icon={<Clapperboard className="h-5 w-5 text-fv-pink" />} title="Reels" href="/reels" />
          <div className="no-scrollbar mb-6 flex gap-3 overflow-x-auto px-5">
            {reels.slice(0, 8).map((r) => (
              <Link key={r.id} href="/reels" className="relative h-44 w-28 shrink-0 overflow-hidden rounded-2xl border border-fv-line bg-fv-panel">
                <video src={r.video} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <span className="block truncate text-[11px] font-semibold text-white">{r.caption || "Watch"}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Live banner (no stock image) */}
      <div className="px-5 pb-6">
        <Link
          href="/live"
          className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-fv-line bg-fv-panel p-3"
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fv-pink/50 to-fv-purple/40">
            <Radio className="h-6 w-6 text-white" />
            <span className="absolute top-1 left-1 rounded bg-fv-pink px-1 text-[8px] font-black text-white">
              LIVE
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">Live shopping</span>
            <span className="block truncate text-xs text-fv-muted">
              Join live fabric sessions from sellers
            </span>
          </span>
          <span className="rounded-full bg-fv-pink px-4 py-2 text-xs font-bold text-white">
            Join
          </span>
        </Link>
      </div>

      <BottomNav active="home" />
    </Screen>
    </RequireAuth>
  );
}
