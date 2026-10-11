// Test helper: sign in, list orders, set order status. Usage:
//   node scripts/fv-admin.mjs list
//   node scripts/fv-admin.mjs setstatus <orderId> <status> [fee]
import { readFileSync, writeFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1] ?? "";

const API_KEY = get("NEXT_PUBLIC_FIREBASE_API_KEY");
const PROJECT = get("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
const EMAIL = process.env.FV_EMAIL ?? "test@fabricverse.app";
const PASSWORD = process.env.FV_PASSWORD ?? "Test1234!";

async function signIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
    },
  );
  const j = await res.json();
  if (!j.idToken) throw new Error("sign-in failed: " + JSON.stringify(j).slice(0, 300));
  return j.idToken;
}

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function runQuery(token, collection) {
  const res = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], limit: 25 } }),
  });
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error(JSON.stringify(rows).slice(0, 300));
  return rows.filter((r) => r.document).map((r) => ({ id: r.document.name.split("/").pop(), fields: r.document.fields ?? {} }));
}

const un = (v) => {
  if (v === undefined || v === null) return v;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  return v;
};

const cmd = process.argv[2];

if (cmd === "list") {
  const token = await signIn();
  const orders = await runQuery(token, "orders");
  for (const o of orders) {
    const f = o.fields;
    console.log(
      o.id,
      "|", un(f.code),
      "|", un(f.orderStatus),
      "|", un(f.paymentStatus),
      "|", "total=" + un(f.totalAmount),
      "|", "fee=" + un(f.deliveryFee),
      "|", un(f.customerId),
    );
  }
} else if (cmd === "setstatus") {
  const [, , orderId, status, fee] = process.argv;
  if (!orderId || !status) throw new Error("setstatus <orderId> <status> [fee]");
  const token = await signIn();
  const patch = { orderStatus: { stringValue: status }, updatedAt: { integerValue: String(Date.now()) } };
  if (fee !== undefined) patch.deliveryFee = { integerValue: String(Number(fee)) };
  const res = await fetch(`${BASE}/orders/${orderId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: patch }),
  });
  const j = await res.json();
  console.log(res.ok ? "OK" : JSON.stringify(j).slice(0, 300));
} else if (cmd === "create") {
  // create an order ready for payment: awaiting_payment with a fee
  const token = await signIn();
  const now = Date.now();
  const code = "#FV-ORD-" + String(now).slice(-6);
  const body = {
    fields: {
      code: { stringValue: code },
      customerId: { stringValue: "paytest" },
      customerName: { stringValue: "Pay Tester" },
      items: { arrayValue: { values: [{ mapValue: { fields: {
        id: { stringValue: "p1" }, name: { stringValue: "Ankara Wax Print" },
        pricePerYard: { integerValue: "12500" }, yards: { integerValue: "6" },
        img: { stringValue: "" }, spec: { stringValue: "Blue & Orange 100% Cotton" },
      } } }] } },
      productSubtotal: { integerValue: "75000" },
      deliveryFee: { integerValue: "5000" },
      totalAmount: { integerValue: "80000" },
      delivery: { mapValue: { fields: {
        fullName: { stringValue: "Pay Tester" }, phone: { stringValue: "08030000000" },
        state: { stringValue: "Lagos" }, town: { stringValue: "Ikeja" },
        area: { stringValue: "Maryland" }, street: { stringValue: "12 Allen Ave" },
        nearestPark: { stringValue: "Ikeja Motor Park" },
        destinationPark: { stringValue: "Ojuelegba Motor Park" },
      } } },
      destinationAddress: { stringValue: "Maryland, Ikeja, Lagos" },
      originAddress: { stringValue: "" },
      paymentStatus: { stringValue: "unpaid" },
      orderStatus: { stringValue: "awaiting_payment" },
      deliveryQuoteId: { stringValue: "quote-test" },
      paymentReference: { nullValue: null },
      totalYards: { integerValue: "6" },
      date: { stringValue: new Date(now).toDateString() },
      img: { stringValue: "" },
      thumbs: { arrayValue: { values: [] } },
      createdAt: { integerValue: String(now) },
      updatedAt: { integerValue: String(now) },
    },
  };
  const res = await fetch(`${BASE}/orders?documentId=${code.replace("#", "")}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  const id = (j.name ?? "").split("/").pop();
  console.log(res.ok ? "CREATED " + id + " " + code : JSON.stringify(j).slice(0, 400));
} else {
  console.log("usage: list | setstatus <id> <status> [fee] | create");
}
