import { NextResponse } from "next/server";

/**
 * Flutterwave v3 payment initialize + verify.
 *
 * Roadmap rules enforced here (backend only):
 *  - The gateway is initialized with the amount the server was given once and
 *    re-checked against the gateway on verify (status + amount + currency).
 *  - An order is NEVER marked paid because the customer returned to the app —
 *    the client must call action:"verify" and this route must answer paid:true.
 *  - The secret key never leaves this server.
 *
 * Env: NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY, FLUTTERWAVE_SECRET_KEY,
 *      FLUTTERWAVE_ENCRYPTION_KEY (unused for hosted checkout), NEXT_PUBLIC_SITE_URL
 */

const SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const BASE = "https://api.flutterwave.com/v3";

interface InitBody {
  action?: string;
  orderId?: string;
  amount?: number;
  email?: string;
  name?: string;
}

interface VerifyBody {
  action?: string;
  reference?: string;
  transactionId?: string;
  expectedAmount?: number;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as InitBody & VerifyBody;

  if (!SECRET) {
    return NextResponse.json(
      { configured: false, paid: false, message: "Payment gateway not configured yet." },
      { status: 200 },
    );
  }

  /* ---------------- initialize: create hosted checkout ------------- */
  if (body.action === "initialize") {
    const orderId = body.orderId?.trim();
    const amount = Number(body.amount);
    if (!orderId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "orderId and a positive amount are required." }, { status: 400 });
    }

    // Auto-return must land on the same origin the customer started from:
    // localhost in dev, the live domain in production.
    const reqOrigin = (() => {
      try {
        return new URL(req.url).origin;
      } catch {
        return "";
      }
    })();
    const headerOrigin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
    const base = headerOrigin.replace(/\/$/, "") || reqOrigin || process.env.NEXT_PUBLIC_SITE_URL || "";
    const origin = base.replace(/\/$/, "");
    const txRef = `FV-${orderId}-${Date.now()}`;

    // Flutterwave Standard: POST /v3/payments returns a hosted checkout link.
    const res = await fetch(`${BASE}/payments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency: "NGN",
        redirect_url: `${origin}/orders/${encodeURIComponent(orderId)}/pay/result`,
        customer: {
          email: body.email ?? "",
          name: body.name ?? "",
        },
        customizations: {
          title: "FabricVerse",
          description: "Fabric order payment",
        },
        meta: { orderId },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      data?: { link?: string };
      message?: string;
    };

    if (!res.ok || !data.data?.link) {
      return NextResponse.json(
        { error: data.message ?? "Could not initialize payment." },
        { status: res.status || 502 },
      );
    }

    return NextResponse.json({ configured: true, link: data.data.link, reference: txRef });
  }

  /* ---------------- verify: authoritative paid check ---------------- */
  if (body.action === "verify") {
    // Preferred: verify by the transaction_id Flutterwave appends to the
    // redirect URL (GET /v3/transactions/{id}/verify).
    const transactionId = body.transactionId?.trim();
    const reference = body.reference?.trim();
    if (!transactionId && !reference) {
      return NextResponse.json({ error: "transactionId or reference is required." }, { status: 400 });
    }

    let tx:
      | { status?: string; amount?: number; currency?: string; id?: number | string; tx_ref?: string }
      | undefined;
    let gwMessage = "";

    if (transactionId) {
      const res = await fetch(`${BASE}/transactions/${encodeURIComponent(transactionId)}/verify`, {
        headers: { Authorization: `Bearer ${SECRET}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        data?: typeof tx;
        message?: string;
      };
      tx = data.data;
      gwMessage = data.message ?? "";
    } else {
      // Manual-return reconciliation: find the transaction by its tx_ref.
      const res = await fetch(
        `${BASE}/transactions?tx_ref=${encodeURIComponent(reference!)}&status=successful`,
        { headers: { Authorization: `Bearer ${SECRET}` } },
      );
      const data = (await res.json().catch(() => ({}))) as {
        data?: Array<NonNullable<typeof tx>>;
        message?: string;
      };
      const list = Array.isArray(data.data) ? data.data : [];
      tx = list.find((t) => t.status === "successful" && (t.currency ?? "NGN") === "NGN");
      gwMessage = data.message ?? "";
    }

    const ok = tx?.status === "successful" && (tx.currency ?? "NGN") === "NGN";
    const resolvedRef = String(tx?.tx_ref ?? reference ?? transactionId ?? "");

    // Amount check: the charged amount must match what the order expects.
    const expected = Number(body.expectedAmount);
    const amountOk =
      !Number.isFinite(expected) || expected <= 0
        ? true
        : Math.abs(Number(tx?.amount ?? 0) - expected) < 1;

    if (!ok) {
      // A tx_ref lookup with no hit means the customer never completed payment.
      const reason = transactionId
        ? gwMessage || "Payment not successful."
        : "No successful payment was found for this order. If you paid, it may still be processing — refresh in a moment or contact support with your order code.";
      return NextResponse.json({
        configured: true,
        paid: false,
        reason,
      });
    }
    if (!amountOk) {
      return NextResponse.json({
        configured: true,
        paid: false,
        reason: "Paid amount does not match the order total.",
        charged: tx?.amount,
        expected,
      });
    }

    return NextResponse.json({
      configured: true,
      paid: true,
      reference: resolvedRef,
      gatewayId: tx?.id,
      amount: tx?.amount,
    });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
