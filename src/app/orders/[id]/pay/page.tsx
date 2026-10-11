"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { naira, useOrder } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { savePaymentTxRef } from "@/lib/mutations";

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-fv-bg">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-fv-pink border-t-transparent" />
        </div>
      }
    >
      <PayOrder />
    </Suspense>
  );
}

function PayOrder() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user } = useAuth();
  const { order, loading } = useOrder(id);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  async function onPay() {
    if (!order || paying) return;
    setPaying(true);
    setError("");
    try {
      // Backend initializes the hosted checkout with the order total.
      // We are redirected to Flutterwave and back to /pay/result, where the
      // backend — not the client — verifies the transaction before the order
      // is ever marked paid.
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initialize",
          orderId: order.id,
          amount: order.totalAmount,
          email: user?.email ?? "",
          name: order.delivery.fullName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.link) {
        // Persist the tx_ref so a manual return (or a closed tab) can still be
        // reconciled as paid on the order page.
        if (data.reference) {
          await savePaymentTxRef(order.id, String(data.reference)).catch(() => undefined);
        }
        window.location.href = data.link as string;
      } else {
        setError(data.error ?? data.message ?? "Could not start payment. Please try again.");
        setPaying(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setPaying(false);
    }
  }

  const awaitingQuote = order && order.deliveryFee === null;

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

      <div className="px-5 pb-6">
        {loading && <div className="flex justify-center py-20"><span className="h-8 w-8 animate-spin rounded-full border-4 border-fv-pink border-t-transparent" /></div>}

        {!loading && !order && (
          <div className="rounded-2xl border border-dashed border-fv-line bg-fv-panel p-8 text-center">
            <p className="text-sm font-semibold">Order not found</p>
            <Link href="/orders" className="mt-4 inline-block rounded-full bg-fv-pink px-5 py-2.5 text-sm font-bold">Back to Orders</Link>
          </div>
        )}

        {!loading && order && (
          <>
            <h1 className="text-2xl font-extrabold">Checkout</h1>
            <p className="mt-1 text-sm text-fv-muted">{order.code}</p>

            <div className="mt-4 rounded-2xl border border-fv-line bg-fv-panel p-4">
              <div className="flex justify-between text-sm">
                <span className="text-fv-muted">Fabric subtotal</span>
                <span className="font-semibold">{naira(order.productSubtotal)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-fv-muted">Delivery (waybill)</span>
                <span className="font-semibold">{order.deliveryFee === null ? "Awaiting quote" : naira(order.deliveryFee)}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-fv-line pt-3 text-lg font-extrabold">
                <span>Total</span>
                <span className="text-fv-pink">{naira(order.totalAmount)}</span>
              </div>
            </div>

            {awaitingQuote ? (
              <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
                <p className="text-sm font-bold text-amber-400">Awaiting delivery quote</p>
                <p className="mt-1 text-xs leading-relaxed text-fv-muted">
                  We are confirming the waybill cost. You will see the full price
                  and can pay once the quote arrives.
                </p>
                <Link href={`/orders/${order.id}`} className="mt-4 inline-block rounded-full border border-fv-line bg-fv-panel px-5 py-2.5 text-sm font-bold">
                  View order
                </Link>
              </div>
            ) : order.orderStatus === "paid" || order.paymentStatus === "paid" ? (
              <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400" />
                <p className="mt-3 font-bold text-emerald-400">Already paid</p>
                <Link href={`/orders/${order.id}`} className="mt-4 inline-block rounded-full bg-fv-pink px-5 py-2.5 text-sm font-bold">
                  Track order
                </Link>
              </div>
            ) : (
              <>
                <button
                  onClick={onPay}
                  disabled={paying}
                  className="mt-5 w-full rounded-full bg-fv-pink px-5 py-4 text-sm font-bold text-white shadow-lg shadow-fv-pink/30 disabled:opacity-60"
                >
                  {paying ? "Opening secure checkout…" : `Pay ${naira(order.totalAmount)}`}
                </button>
                {error && (
                  <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-400">
                    {error}
                  </p>
                )}
                <p className="mt-3 text-center text-[11px] leading-relaxed text-fv-muted">
                  You will be redirected to Flutterwave&apos;s secure checkout
                  (card, bank transfer, USSD). The order is only marked paid after
                  our backend verifies the transaction — never before.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </Screen>
    </RequireAuth>
  );
}
