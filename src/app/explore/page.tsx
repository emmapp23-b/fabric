"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Search, ShoppingBag, Star, SlidersHorizontal } from "lucide-react";
import { BottomNav, Logo, Media, Screen, SectionHead } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { naira, useCategories, useProducts } from "@/lib/data";
import { useShop } from "@/lib/cart";

export default function ExplorePage() {
  const [chip, setChip] = useState("All");
  const [query, setQuery] = useState("");
  const { items: categories } = useCategories();
  const { items: all, loading } = useProducts();
  const { addToCart, isFavorite, toggleFavorite } = useShop();

  const chips = ["All", ...categories.map((c) => c.name)];
  const ITEMS = all.filter(
    (p) =>
      (chip === "All" || p.category === chip) &&
      (query.trim() === "" ||
        (p.name + " " + p.spec + " " + p.category).toLowerCase().includes(query.toLowerCase())),
  );

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
        <h1 className="text-2xl font-extrabold">Explore</h1>
        <p className="mt-1 text-sm text-fv-muted">
          Find the perfect fabric for your next project.
        </p>
      </div>

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

      {/* Chips (from Firestore categories) */}
      <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-5 pb-5">
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

      <SectionHead icon={<Star className="h-5 w-5 fill-white text-white" />} title="All Fabrics" action="Sort" />

      {/* Two-column grid */}
      {ITEMS.length === 0 ? (
        <div className="mx-5 mb-6 rounded-2xl border border-dashed border-fv-line bg-fv-panel p-8 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-fv-muted" />
          <p className="mt-3 text-sm font-semibold">
            {loading ? "Loading fabrics…" : "No products yet"}
          </p>
          <p className="mt-1 text-xs text-fv-muted">
            {loading
              ? ""
              : "Products added from the admin panel will appear here in real time."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 px-5 pb-6">
          {ITEMS.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-2xl border border-fv-line bg-fv-panel"
            >
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

      <BottomNav active="explore" />
    </Screen>
    </RequireAuth>
  );
}
