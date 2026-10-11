"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { Media, Screen } from "@/components/ui";
import { STATUS_META, destinationLabel, naira, useOrder, useStatusHistory } from "@/lib/data";
import type { OrderStatus } from "@/lib/data";
import { createDeliveryQuote, updateOrderStatus } from "@/lib/mutations";

export default function AdminOrderDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60dvh] items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <AdminOrderDetail />
    </Suspense>
  );
}

function AdminOrderDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { order, loading } = useOrder(id);
  const history = useStatusHistory(id);
  const [showQuote, setShowQuote] = useState(false);

  if (loading) {
    return <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" /></div>;
  }
  if (!order) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-sm font-semibold">Order not found</p>
        <Link href="/admin/orders" className="mt-4 inline-block rounded-full bg-violet-500 px-5 py-2.5 text-sm font-bold">Back to Orders</Link>
      </div>
    );
  }

  const meta = STATUS_META[order.orderStatus];

  return (
    <div className="px-5 pt-4 pb-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/orders" aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${meta.color}`}>{meta.label}</span>
      </div>

      <h1 className="mt-3 text-xl font-extrabold">{order.code}</h1>
      <p className="text-xs text-slate-400">{order.date} • {order.paymentStatus}</p>

      {/* Customer */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold">{order.customerName || "Customer"}</div>
            <div className="text-xs text-slate-400">{destinationLabel(order.delivery)}</div>
          </div>
          {order.delivery.phone && (
            <a href={`tel:${order.delivery.phone}`} className="flex items-center gap-1 rounded-full bg-violet-500/20 px-3 py-1.5 text-xs font-semibold text-violet-300">
              <Phone className="h-3.5 w-3.5" /> Call
            </a>
          )}
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          {order.delivery.street}{order.delivery.nearestPark ? ` • Near ${order.delivery.nearestPark}` : ""}
          {order.delivery.destinationPark ? ` • Collect at ${order.delivery.destinationPark}` : ""}
        </div>
      </div>

      {/* Items */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-sm font-bold">Order Items</div>
        {order.items.map((it, i) => (
          <div key={i} className="mt-2 flex items-center gap-3">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
              <Media src={it.img} alt={it.name} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{it.name}</div>
              <div className="text-[11px] text-slate-400">{it.yards} yards</div>
            </div>
            <div className="text-sm font-bold">{naira(it.yards * it.pricePerYard)}</div>
          </div>
        ))}
        <div className="mt-3 flex justify-between border-t border-white/5 pt-2 text-sm">
          <span className="text-slate-400">Product subtotal</span>
          <span className="font-semibold">{naira(order.productSubtotal)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-slate-400">Delivery fee</span>
          <span className="font-semibold">
            {order.deliveryFee === null ? <span className="text-amber-400">Not set</span> : naira(order.deliveryFee)}
          </span>
        </div>
        <div className="mt-2 flex justify-between border-t border-white/5 pt-2 text-base font-extrabold">
          <span>Total</span>
          <span className="text-violet-400">{naira(order.totalAmount)}</span>
        </div>
      </div>

      {/* Delivery quote / status controls */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-sm font-bold">Delivery Management</div>

        {order.orderStatus === "awaiting_delivery_quote" && !showQuote && (
          <button onClick={() => setShowQuote(true)} className="mt-3 w-full rounded-full bg-violet-500 px-4 py-3 text-sm font-bold text-white">
            Enter Delivery Quote
          </button>
        )}

        {showQuote && <QuoteForm orderId={order.id} originPark={order.originAddress} destinationPark={order.delivery.destinationPark} onDone={() => setShowQuote(false)} />}

        {/* Status advance for post-quote stages */}
        {order.orderStatus !== "awaiting_delivery_quote" && order.orderStatus !== "collected" && (
          <StatusControl order={order} />
        )}
      </div>

      {/* Timeline */}
      <div className="mt-5">
        <h2 className="text-sm font-bold">Status History</h2>
        <div className="mt-2">
          {history.length === 0 && <p className="text-xs text-slate-500">No updates yet.</p>}
          {history.map((h) => (
            <div key={h.id} className="border-l border-white/10 pl-3 pb-4">
              <div className="flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${STATUS_META[h.status].color}`}>{STATUS_META[h.status].short}</span>
                <span className="text-[10px] text-slate-500">
                  {h.timestamp ? new Date(h.timestamp).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300">{h.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuoteForm({ orderId, originPark, destinationPark, onDone }: { orderId: string; originPark: string; destinationPark: string; onDone: () => void }) {
  const [f, setF] = useState({
    transportOperator: "",
    originPark,
    destinationPark,
    actualWaybillCost: "",
    packagingCost: "0",
    handlingCost: "0",
    contingencyAllowance: "0",
    serviceCharge: "0",
    estimatedArrival: "",
    expiresInHours: "24",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const fee =
    Number(f.actualWaybillCost || 0) +
    Number(f.packagingCost || 0) +
    Number(f.handlingCost || 0) +
    Number(f.contingencyAllowance || 0) +
    Number(f.serviceCharge || 0);

  async function submit() {
    if (!f.transportOperator.trim() || !Number(f.actualWaybillCost)) return;
    setBusy(true);
    try {
      const expiresAt = new Date(Date.now() + Number(f.expiresInHours || 24) * 3600 * 1000).toISOString();
      await createDeliveryQuote({
        orderId,
        transportOperator: f.transportOperator,
        originPark: f.originPark,
        destinationPark: f.destinationPark,
        actualWaybillCost: Number(f.actualWaybillCost),
        packagingCost: Number(f.packagingCost || 0),
        handlingCost: Number(f.handlingCost || 0),
        contingencyAllowance: Number(f.contingencyAllowance || 0),
        serviceCharge: Number(f.serviceCharge || 0),
        estimatedArrival: f.estimatedArrival,
        expiresAt,
        createdBy: "admin",
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  const inp = "w-full rounded-lg border border-white/10 bg-[#0a0713] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none";
  const lab = "mb-1 block text-[11px] font-semibold text-slate-400";

  return (
    <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2"><label className={lab}>Transport operator</label><input className={inp} value={f.transportOperator} onChange={(e) => set("transportOperator", e.target.value)} placeholder="e.g. Chisco" /></div>
        <div><label className={lab}>Origin park</label><input className={inp} value={f.originPark} onChange={(e) => set("originPark", e.target.value)} /></div>
        <div><label className={lab}>Destination park</label><input className={inp} value={f.destinationPark} onChange={(e) => set("destinationPark", e.target.value)} /></div>
        <div><label className={lab}>Actual waybill (₦)</label><input className={inp} inputMode="numeric" value={f.actualWaybillCost} onChange={(e) => set("actualWaybillCost", e.target.value)} placeholder="4000" /></div>
        <div><label className={lab}>Packaging (₦)</label><input className={inp} inputMode="numeric" value={f.packagingCost} onChange={(e) => set("packagingCost", e.target.value)} /></div>
        <div><label className={lab}>Handling (₦)</label><input className={inp} inputMode="numeric" value={f.handlingCost} onChange={(e) => set("handlingCost", e.target.value)} /></div>
        <div><label className={lab}>Contingency (₦)</label><input className={inp} inputMode="numeric" value={f.contingencyAllowance} onChange={(e) => set("contingencyAllowance", e.target.value)} /></div>
        <div><label className={lab}>Service charge (₦)</label><input className={inp} inputMode="numeric" value={f.serviceCharge} onChange={(e) => set("serviceCharge", e.target.value)} /></div>
        <div><label className={lab}>Expires (hrs)</label><input className={inp} inputMode="numeric" value={f.expiresInHours} onChange={(e) => set("expiresInHours", e.target.value)} /></div>
        <div className="col-span-2"><label className={lab}>Estimated arrival</label><input className={inp} value={f.estimatedArrival} onChange={(e) => set("estimatedArrival", e.target.value)} placeholder="e.g. 2–3 days" /></div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2">
        <span className="text-xs text-slate-400">Customer delivery fee</span>
        <span className="text-base font-extrabold text-violet-400">{naira(fee)}</span>
      </div>
      <button onClick={submit} disabled={busy || !f.transportOperator.trim() || !Number(f.actualWaybillCost)} className="mt-3 w-full rounded-full bg-violet-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "Sending…" : "Send Quote to Customer"}
      </button>
    </div>
  );
}

function StatusControl({ order }: { order: { id: string; orderStatus: OrderStatus; delivery: { town: string; state: string } } }) {
  const [busy, setBusy] = useState(false);
  const nextMap: Partial<Record<OrderStatus, OrderStatus>> = {
    paid: "awaiting_dispatch",
    awaiting_dispatch: "dispatched",
    dispatched: "in_transit",
    in_transit: "arrived_at_destination_park",
    arrived_at_destination_park: "ready_for_collection",
    ready_for_collection: "collected",
  };
  const next = nextMap[order.orderStatus];

  async function advance() {
    if (!next) return;
    setBusy(true);
    try {
      await updateOrderStatus(order.id, next, {
        message: STATUS_META[next].label,
        location: destinationLabel({ ...order.delivery, fullName: "", phone: "", area: "", street: "", nearestPark: "", destinationPark: "" } as never),
        updatedBy: "admin",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!next) return null;
  return (
    <button onClick={advance} disabled={busy} className="mt-3 w-full rounded-full bg-emerald-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
      {busy ? "Updating…" : `Mark as ${STATUS_META[next].label}`}
    </button>
  );
}
