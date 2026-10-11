"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { STATUS_META, destinationLabel, naira, useAllOrders } from "@/lib/data";

type Tab = "pending" | "quotes" | "active" | "history";

export default function AdminDeliveryPage() {
  const { items: orders } = useAllOrders();
  const [tab, setTab] = useState<Tab>("pending");

  const pending = orders.filter((o) => o.orderStatus === "awaiting_delivery_quote");
  const quotes = orders.filter((o) => ["quote_sent", "awaiting_payment", "quote_accepted"].includes(o.orderStatus));
  const active = orders.filter((o) =>
    ["paid", "awaiting_dispatch", "dispatched", "in_transit", "arrived_at_destination_park", "ready_for_collection"].includes(o.orderStatus),
  );
  const history = orders.filter((o) => o.deliveryFee !== null);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "pending", label: "Pending Quotes", count: pending.length },
    { key: "quotes", label: "Quotes", count: quotes.length },
    { key: "active", label: "Active", count: active.length },
    { key: "history", label: "Price History", count: history.length },
  ];

  const list = { pending, quotes, active, history }[tab];

  return (
    <div className="px-5 pt-4 pb-6">
      <h1 className="text-2xl font-extrabold">Delivery &amp; Waybills</h1>
      <p className="mt-1 text-sm text-slate-400">Confirm waybill costs and track parcels.</p>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${
              tab === t.key ? "border-violet-500 bg-violet-500 text-white" : "border-white/10 bg-white/[0.03] text-slate-300"
            }`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${tab === t.key ? "bg-white/20" : "bg-white/10"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {list.map((o) => {
          const m = STATUS_META[o.orderStatus];
          return (
            <Link key={o.id} href={`/admin/orders/${o.id}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-bold">{o.code}</div>
                  <div className="text-[11px] text-slate-400">{o.originAddress || "Seller"} → {destinationLabel(o.delivery)}</div>
                  {o.delivery.destinationPark && <div className="text-[11px] text-slate-500">Park: {o.delivery.destinationPark}</div>}
                </div>
                <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${m.color}`}>{m.short}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                <span className="text-slate-400">
                  {tab === "history" || o.deliveryFee !== null ? (
                    <>Delivery <b className="text-white">{naira(o.deliveryFee ?? 0)}</b></>
                  ) : (
                    "Awaiting quote"
                  )}
                </span>
                <span className="font-semibold text-violet-300">
                  {tab === "pending" ? "Enter quote →" : "Open →"}
                </span>
              </div>
            </Link>
          );
        })}
        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 px-3.5 py-8 text-center text-xs text-slate-500">
            {tab === "pending" ? "No orders awaiting a quote. 🎉" : "Nothing here yet."}
          </div>
        )}
      </div>

      {tab === "pending" && pending.length > 0 && (
        <p className="mt-4 rounded-xl bg-violet-500/10 px-3.5 py-3 text-[11px] leading-relaxed text-slate-300">
          Customer fee = actual waybill + packaging + handling + contingency + service charge.
          Open an order to enter the real quote.
        </p>
      )}
    </div>
  );
}
