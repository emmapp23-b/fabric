"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { naira, useOrder } from "@/lib/data";
import { markPaid } from "@/lib/mutations";

export default function PayResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-fv-bg">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-fv-pink border-t-transparent" />
        </div>
      }
    >
      <PayResult />
    </Suspense>
  );
}

type Phase = "verifying" | "paid" | "failed";

function PayResult() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const search = useSearchParams();
  const { order, loading } = useOrder(id);
  const [phase, setPhase] = useState<Phase>("verifying");
  const [reason, setReason] = useState("");
  const [marked, setMarked] = useState(false);
  const started = useRef(false);

  // Flutterwave redirects back with status, tx_ref and transaction_id.
  const txRef = search.get("tx_ref") ?? search.get("reference") ?? "";
  const transactionId = search.get("transaction_id") ?? "";
  const gwStatus = search.get("status") ?? "";

  useEffect(() => {
    if (!order || loading || started.current) return;
    started.current = true;
    let cancelled = false;

    (async () => {
      try {
        if (!txRef && !transactionId) {
          setPhase("failed");
          setReason("No transaction reference was returned. If you were charged, contact support with your order code.");
          return;
        }
        if (gwStatus && gwStatus !== "successful") {
          setPhase("failed");
          setReason("The payment was not completed. You have not been charged — please try again.");
          return;
        }
        // The backend verifies with Flutterwave (status + currency + amount).
        // Only a paid:true answer from OUR server may mark the order paid.
        const res = await fetch("/api/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify",
            transactionId,
            reference: txRef,
            expectedAmount: order.totalAmount,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.ok && data.paid) {
          if (!marked) {
            await markPaid(order.id, String(data.reference ?? txRef));
            setMarked(true);
          }
          setPhase("paid");
        } else {
          setPhase("failed");
          setReason(
            data.reason ??
              "The payment was not confirmed by the gateway. You have not been charged, or it may still be processing — check your order in a moment.",
          );
        }
      } catch {
        if (!cancelled) {
          setPhase("failed");
          setReason("Could not reach the payment verifier. Please check your order — it will update once the gateway confirms.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [order, loading, txRef, transactionId, gwStatus, marked]);

  return (
    <RequireAuth>
    <Screen>
      <div className="px-5 pt-8 pb-6">
        {phase === "verifying" && (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-fv-pink border-t-transparent" />
            <p className="mt-5 font-bold">Verifying your payment…</p>
            <p className="mt-1 text-xs text-fv-muted">
              Our backend is confirming the transaction with Flutterwave.
            </p>
          </div>
        )}

        {phase === "paid" && order && (
          <div className="flex flex-col items-center py-10 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-400" />
            <h1 className="mt-4 text-2xl font-extrabold text-emerald-400">Payment confirmed</h1>
            <p className="mt-2 text-sm text-fv-muted">
              {naira(order.totalAmount)} received for {order.code}.
            </p>
            <div className="mt-4 w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left text-xs leading-relaxed text-slate-300">
              <p className="flex items-center gap-2 font-bold text-emerald-400">
                <ShieldCheck className="h-4 w-4" /> Verified by backend
              </p>
              <p className="mt-1">
                The gateway confirmed this transaction before the order was marked
                paid — it was not marked paid just because you returned.
              </p>
            </div>
            <Link
              href={`/orders/${order.id}`}
              className="mt-6 w-full rounded-full bg-fv-pink px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-fv-pink/30"
            >
              Track my order
            </Link>
          </div>
        )}

        {phase === "failed" && (
          <div className="flex flex-col items-center py-10 text-center">
            <XCircle className="h-16 w-16 text-red-400" />
            <h1 className="mt-4 text-2xl font-extrabold text-red-400">Payment not confirmed</h1>
            <p className="mt-2 px-2 text-xs leading-relaxed text-fv-muted">{reason}</p>
            <Link
              href={order ? `/orders/${order.id}/pay` : "/orders"}
              className="mt-6 w-full rounded-full bg-fv-pink px-5 py-3.5 text-sm font-bold text-white"
            >
              {order ? "Try again" : "Back to orders"}
            </Link>
            <Link
              href="/orders"
              className="mt-3 w-full rounded-full border border-fv-line bg-fv-panel px-5 py-3.5 text-sm font-bold"
            >
              Back to orders
            </Link>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-fv-pink border-t-transparent" />
          </div>
        )}
      </div>
    </Screen>
    </RequireAuth>
  );
}
