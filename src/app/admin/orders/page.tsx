"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { naira, STATUS_META, useAllOrders } from "@/lib/data";
import type { OrderStatus } from "@/lib/data";

const FILTERS: { key: string; label: string; match: (s: OrderStatus, p: string) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "quote", label: "Needs Quote", match: (s) => s === "awaiting_delivery_quote" },
  { key: "quotesent", label: "Quote Sent", match: (s) => s === "quote_sent" || s === "awaiting_payment" },
  { key: "active", label: "Active", match: (s) => ["paid", "awaiting_dispatch", "dispatched", "in_transit", "arrived_at_destination_park", "ready_for_collection"].includes(s) },
  { key: "done", label: "Collected", match: (s) => s === "collected" },
];

export default function AdminOrdersPage() {
  const { items: orders } = useAllOrders();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const list = orders.filter(
    (o) =>
      active.match(o.orderStatus, o.paymentStatus) &&
      (search.trim() === "" ||
        (o.code + " " + o.customerName + " " + o.destinationAddress).toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="px-5 pt-4 pb-6">
      <h1 className="text-2xl font-extrabold">Orders</h1>

      {/* Search */}
      <div className="mt-3 flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3">
        <Search className="h-5 w-5 shrink-0 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order ID, customer…"
          className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
        />
      </div>

      {/* Filters */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
              filter === f.key ? "border-violet-500 bg-violet-500 text-white" : "border-white/10 bg-white/[0.03] text-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-4 flex flex-col gap-3">
        {list.map((o) => {
          const m = STATUS_META[o.orderStatus];
          const urgent = o.orderStatus === "awaiting_delivery_quote";
          return (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className={`rounded-2xl border p-4 ${urgent ? "border-amber-500/40 bg-amber-500/5" : "border-white/10 bg-white/[0.03]"}`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-base font-bold">{o.code}</div>
                  <div className="text-xs text-slate-400">{o.customerName || "Customer"}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{o.originAddress || "Seller"} → {o.destinationAddress || "—"}</div>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${m.color}`}>{m.short}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                <span className="text-xs text-slate-400">{o.items.reduce((n, i) => n + i.yards, 0)} yards • {o.items.length} item{o.items.length > 1 ? "s" : ""}</span>
                <div className="text-right">
                  <div className="text-sm font-extrabold">{naira(o.totalAmount)}</div>
                  <div className={`text-[10px] font-semibold ${o.paymentStatus === "paid" ? "text-emerald-400" : "text-amber-400"}`}>
                    {o.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {list.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-3.5 py-8 text-center text-xs text-slate-500">
            No orders match this filter.
          </p>
        )}
      </div>
    </div>
  );
}
