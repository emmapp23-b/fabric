"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, PackageOpen } from "lucide-react";
import { BottomNav, Logo, Media, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { STATUS_META, naira, useOrders } from "@/lib/data";
import type { OrderStatus } from "@/lib/data";
import { useAuth } from "@/lib/auth";

// Customer-facing filter buckets → the orderStatuses they include.
const TABS: { key: string; label: string; match: (s: OrderStatus) => boolean }[] = [
  { key: "all", label: "All Orders", match: () => true },
  { key: "quote", label: "Needs Action", match: (s) => s === "quote_sent" || s === "awaiting_payment" },
  { key: "active", label: "In Progress", match: (s) => ["paid", "awaiting_dispatch", "dispatched", "in_transit", "arrived_at_destination_park", "ready_for_collection"].includes(s) },
  { key: "done", label: "Completed", match: (s) => s === "collected" },
];

export default function OrdersPage() {
  const [tab, setTab] = useState("all");
  const { user } = useAuth();
  const { items: ORDERS, loading } = useOrders(user?.uid);
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const list = ORDERS.filter((o) => active.match(o.orderStatus));
  const count = (t: (typeof TABS)[number]) => ORDERS.filter((o) => t.match(o.orderStatus)).length;

  return (
    <RequireAuth>
    <Screen>

      <header className="flex items-center justify-between px-5 pt-2 pb-1">
        <Logo size="md" />
      </header>

      <div className="px-5 pt-3 pb-4">
        <h1 className="text-3xl font-extrabold">My Orders</h1>
        <p className="mt-1.5 text-sm text-fv-muted">Track your parcels and delivery quotes.</p>
      </div>

      <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-5 pb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
              tab === t.key ? "border-fv-pink bg-fv-pink text-white" : "border-fv-line bg-fv-panel text-slate-300"
            }`}
          >
            {t.label}
            <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${tab === t.key ? "bg-white/25 text-white" : "bg-white/10 text-slate-400"}`}>
              {count(t)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-5 pb-6">
        {list.map((o) => {
          const m = STATUS_META[o.orderStatus];
          const needsAction = o.orderStatus === "quote_sent";
          return (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className={`flex items-center gap-3.5 rounded-2xl border p-3.5 ${needsAction ? "border-fv-pink/40 bg-fv-pink/5" : "border-fv-line bg-fv-panel"}`}
            >
              <span className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-xl">
                <Media src={o.img} alt={o.code} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold">{o.code}</div>
                    <div className="text-xs text-fv-muted">{o.date} • {o.totalYards} yards</div>
                  </div>
                  <span className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold ${m.color}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {m.short}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-fv-muted">
                  {o.items.map((i) => i.name).join(", ")}
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[15px] font-extrabold">{naira(o.totalAmount)}</span>
                  {needsAction && <span className="text-[11px] font-bold text-fv-pink">Review quote →</span>}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-fv-muted" />
            </Link>
          );
        })}
        {list.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-fv-line bg-fv-panel p-8 text-center">
            <PackageOpen className="mx-auto h-8 w-8 text-fv-muted" />
            <p className="mt-3 text-sm font-semibold">No orders yet</p>
            <p className="mt-1 text-xs text-fv-muted">Orders you place will show up here with live delivery updates.</p>
            <Link href="/explore" className="mt-4 inline-block rounded-full bg-fv-pink px-5 py-2.5 text-sm font-bold">Start Shopping</Link>
          </div>
        )}
      </div>

      <BottomNav active="orders" />
    </Screen>
    </RequireAuth>
  );
}
