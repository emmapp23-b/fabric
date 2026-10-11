"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, MapPin, Package, Truck } from "lucide-react";
import { Logo, Media, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { STATUS_META, destinationLabel, naira, useOrder, useStatusHistory } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { acceptQuote, markPaid } from "@/lib/mutations";

export default function OrderDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-fv-bg">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-fv-pink border-t-transparent" />
        </div>
      }
    >
      <OrderDetail />
    </Suspense>
  );
}

function OrderDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user } = useAuth();
  const { order, loading } = useOrder(id);
  const history = useStatusHistory(id);
  const [busy, setBusy] = useState(false);
  const reconciled = useRef(false);

  const meta = order ? STATUS_META[order.orderStatus] : null;

  // Manual-return reconciliation: if the customer paid on Flutterwave but
  // closed the browser before our /pay/result page ran, the order still sits
  // at awaiting_payment with a saved tx_ref. Re-verify it with the backend
  // (which asks Flutterwave) so it flips to paid without them paying twice.
  useEffect(() => {
    if (!order || reconciled.current) return;
    if (order.orderStatus !== "awaiting_payment" || order.paymentStatus === "paid") return;
    if (!order.paymentTxRef) return;
    reconciled.current = true;
    (async () => {
      try {
        const res = await fetch("/api/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify",
            reference: order.paymentTxRef,
            expectedAmount: order.totalAmount,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.paid) {
          await markPaid(order.id, String(data.reference ?? order.paymentTxRef));
        }
      } catch {
        /* offline or gateway hiccup — leave the order as-is */
      }
    })();
  }, [order]);

  async function onAccept() {
    if (!order || !order.deliveryQuoteId || !user) return;
    setBusy(true);
    try {
      await acceptQuote(order.id, order.deliveryQuoteId, user.uid);
      router.push(`/orders/${order.id}/pay`);
    } catch {
      setBusy(false);
    }
  }

  return (
    <RequireAuth>
    <Screen>
      <header className="flex items-center justify-between px-5 pt-2 pb-3">
        <button onClick={() => router.back()} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full border border-fv-line bg-fv-panel">
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <Logo size="sm" />
        <span className="w-9" />
      </header>

      {loading && (
        <div className="flex flex-1 items-center justify-center py-20">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-fv-pink border-t-transparent" />
        </div>
      )}

      {!loading && !order && (
        <div className="mx-5 mt-10 rounded-2xl border border-dashed border-fv-line bg-fv-panel p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-fv-muted" />
          <p className="mt-3 text-sm font-semibold">Order not found</p>
          <Link href="/orders" className="mt-4 inline-block rounded-full bg-fv-pink px-5 py-2.5 text-sm font-bold">Back to Orders</Link>
        </div>
      )}

      {!loading && order && meta && (
        <div className="px-5 pb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold">{order.code}</h1>
            <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${meta.color}`}>{meta.short}</span>
          </div>
          <p className="mt-1 text-xs text-fv-muted">{order.date}</p>

          {/* Items */}
          <div className="mt-4 rounded-2xl border border-fv-line bg-fv-panel p-3">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                  <Media src={it.img} alt={it.name} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{it.name}</div>
                  <div className="text-[11px] text-fv-muted">{it.yards} yards × {naira(it.pricePerYard)}</div>
                </div>
                <div className="text-sm font-extrabold">{naira(it.yards * it.pricePerYard)}</div>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-fv-line pt-2 text-sm">
              <span className="text-fv-muted">Fabric subtotal</span>
              <span className="font-semibold">{naira(order.productSubtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-fv-muted">Delivery fee</span>
              <span className="font-semibold">
                {order.deliveryFee === null ? <span className="text-amber-400">Awaiting quote</span> : naira(order.deliveryFee)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-fv-line pt-2 text-base font-extrabold">
              <span>Total</span>
              <span className="text-fv-pink">{naira(order.totalAmount)}</span>
            </div>
          </div>

          {/* Quote CTA */}
          {order.orderStatus === "quote_sent" && order.deliveryFee !== null && (
            <div className="mt-4 rounded-2xl border border-fv-pink/30 bg-fv-pink/10 p-4">
              <p className="text-sm leading-relaxed">
                Your delivery quote is ready. Fabric subtotal is{" "}
                <b>{naira(order.productSubtotal)}</b>, delivery is{" "}
                <b>{naira(order.deliveryFee)}</b>, so your total is{" "}
                <b className="text-fv-pink">{naira(order.totalAmount)}</b>. Review and
                pay before the quote expires.
              </p>
              <button
                onClick={onAccept}
                disabled={busy}
                className="mt-3 w-full rounded-full bg-fv-pink px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "Accepting…" : `Accept & Pay ${naira(order.totalAmount)}`}
              </button>
            </div>
          )}

          {/* Delivery address */}
          <div className="mt-4 rounded-2xl border border-fv-line bg-fv-panel p-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <MapPin className="h-4 w-4 text-fv-pink" /> Delivery
            </div>
            <p className="mt-2 text-sm text-slate-300">
              {order.delivery.fullName} • {order.delivery.phone}
            </p>
            <p className="mt-1 text-sm text-fv-muted">{destinationLabel(order.delivery)}</p>
            <p className="mt-1 text-xs text-fv-muted">
              {order.delivery.street}{order.delivery.nearestPark ? ` • Near ${order.delivery.nearestPark}` : ""}
            </p>
            {order.delivery.destinationPark && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-fv-muted">
                <Truck className="h-3.5 w-3.5" /> Collect at {order.delivery.destinationPark}
              </p>
            )}
          </div>

          {/* Timeline */}
          <div className="mt-5">
            <h2 className="text-sm font-bold">Order timeline</h2>
            <div className="mt-3">
              {history.length === 0 && (
                <p className="text-xs text-fv-muted">No updates yet.</p>
              )}
              {history.map((h, i) => {
                const m = STATUS_META[h.status];
                const last = i === history.length - 1;
                return (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {last ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-fv-pink" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-fv-muted/40" />
                      )}
                      {!last && <span className="w-px flex-1 bg-fv-line" />}
                    </div>
                    <div className={`min-w-0 flex-1 ${last ? "pb-4" : "pb-5"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${m.color}`}>{m.short}</span>
                        <span className="text-[11px] text-fv-muted">
                          {h.timestamp ? new Date(h.timestamp).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-300">{h.message}</p>
                      {h.location && <p className="text-[11px] text-fv-muted">{h.location}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Screen>
    </RequireAuth>
  );
}
