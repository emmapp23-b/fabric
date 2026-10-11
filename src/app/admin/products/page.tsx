"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Media } from "@/components/ui";
import { naira, stockLevel, useProducts } from "@/lib/data";
import type { StockLevel } from "@/lib/data";

const STOCK_STYLE: Record<StockLevel, string> = {
  in: "bg-emerald-500/15 text-emerald-400",
  low: "bg-amber-500/15 text-amber-400",
  out: "bg-red-500/15 text-red-400",
};
const STOCK_LABEL: Record<StockLevel, string> = { in: "In Stock", low: "Low Stock", out: "Out of Stock" };

export default function AdminProductsPage() {
  const { items: products, loading } = useProducts(true);
  const [tab, setTab] = useState<"all" | StockLevel>("all");
  const [search, setSearch] = useState("");

  const list = products.filter((p) => {
    const lvl = stockLevel(p);
    const tabOk = tab === "all" || lvl === tab;
    const searchOk = search.trim() === "" || (p.name + " " + p.category).toLowerCase().includes(search.toLowerCase());
    return tabOk && searchOk;
  });

  return (
    <div className="px-5 pt-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Products &amp; Stock</h1>
        <Link href="/admin/products/new" className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500" aria-label="Add product">
          <Plus className="h-5 w-5 text-white" />
        </Link>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3">
        <Search className="h-5 w-5 shrink-0 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none" />
      </div>

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        {([["all", "All"], ["in", "In Stock"], ["low", "Low Stock"], ["out", "Out of Stock"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
              tab === k ? "border-violet-500 bg-violet-500 text-white" : "border-white/10 bg-white/[0.03] text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {list.map((p) => {
          const lvl = stockLevel(p);
          return (
            <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                <Media src={p.img} alt={p.name} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{p.name}</div>
                <div className="text-xs text-slate-400">{naira(p.price)} • {p.availableYards} yards</div>
                {p.status === "draft" && <div className="text-[10px] font-semibold text-amber-400">Draft</div>}
              </div>
              <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${STOCK_STYLE[lvl]}`}>{STOCK_LABEL[lvl]}</span>
            </Link>
          );
        })}
        {list.length === 0 && !loading && (
          <p className="rounded-xl border border-dashed border-white/10 px-3.5 py-8 text-center text-xs text-slate-500">
            No products yet. Tap + to add your first fabric.
          </p>
        )}
      </div>
    </div>
  );
}
