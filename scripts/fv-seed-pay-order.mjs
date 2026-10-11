// Test helper: write a complete order doc for payment E2E testing.
// Usage: node scripts/fv-seed-pay-order.mjs
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1] ?? "";
const PROJECT = get("NEXT_PUBLIC_FIREBASE_PROJECT_ID");

const EMAIL = process.env.FV_EMAIL ?? "paytest@fabricverse.app";
const PASSWORD = process.env.FV_PASSWORD ?? "PayTest123!";
// Browser session uid (existing signed-in test user in the dev browser).
const CUSTOMER = process.env.FV_CUSTOMER ?? "1Vecc5cT1pMbMQRbCWFKBp4tazx2";
const ORDER_ID = process.env.FV_ORDER_ID ?? "FV-ORD-627599";

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const authRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${get("NEXT_PUBLIC_FIREBASE_API_KEY")}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true }),
  },
);
const auth = await authRes.json();
if (!auth.idToken) throw new Error("sign-in failed: " + JSON.stringify(auth).slice(0, 300));

const now = Date.now();
const code = "#FV-ORD-" + String(now).slice(-6);
const s = (v) => ({ stringValue: v });
const i = (v) => ({ integerValue: String(v) });

const fields = {
  code: s(code),
  customerId: s(CUSTOMER),
  customerName: s("Pay Tester"),
  items: {
    arrayValue: {
      values: [
        {
          mapValue: {
            fields: {
              id: s("p1"),
              name: s("Ankara Wax Print"),
              spec: s("Blue & Orange 100% Cotton"),
              pricePerYard: i(12500),
              yards: i(6),
              img: s(""),
            },
          },
        },
      ],
    },
  },
  productSubtotal: i(75000),
  deliveryFee: i(5000),
  totalAmount: i(80000),
  delivery: {
    mapValue: {
      fields: {
        fullName: s("Pay Tester"),
        phone: s("08030000000"),
        state: s("Lagos"),
        town: s("Ikeja"),
        area: s("Maryland"),
        street: s("12 Allen Ave"),
        nearestPark: s("Ikeja Motor Park"),
        destinationPark: s("Ojuelegba Motor Park"),
      },
    },
  },
  destinationAddress: s("Maryland, Ikeja, Lagos"),
  originAddress: s(""),
  paymentStatus: s("pending"),
  orderStatus: s("awaiting_payment"),
  deliveryQuoteId: s("quote-test"),
  paymentTxRef: s("FV-FV-ORD-627599-E2E"),
  paymentReference: { nullValue: null },
  totalYards: i(6),
  date: s(new Date(now).toDateString()),
  img: s(""),
  thumbs: { arrayValue: { values: [] } },
  createdAt: i(now),
  updatedAt: i(now),
};

// DELETE then POST so we get a fresh doc with the full field set.
await fetch(`${BASE}/orders/${ORDER_ID}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${auth.idToken}` },
});
const res = await fetch(`${BASE}/orders?documentId=${ORDER_ID}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${auth.idToken}`, "Content-Type": "application/json" },
  body: JSON.stringify({ fields }),
});
const j = await res.json();
console.log(res.ok ? `SEEDED ${ORDER_ID} ${code} customer=${CUSTOMER} total=80000` : JSON.stringify(j).slice(0, 400));
