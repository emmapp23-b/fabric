"use client";

/**
 * Client-side Firestore writes for the customer app and admin panel.
 *
 * Delivery-fee calculation and payment verification happen in API routes
 * (/api/payment) per the delivery roadmap — never trusted to the client.
 * Admin writes here are gated by role-checked security rules.
 *
 * NOTE: "firebase/firestore" must never be statically imported here — its
 * protobufjs codegen runs `new Function` at module scope, which the
 * Cloudflare Workers runtime rejects while handling requests. Every function
 * loads it on demand instead (see ./firebase).
 */

import { fbDb } from "./firebase";
import { pushNotify } from "./push";
import type { DeliveryInfo, OrderItem, OrderStatus, Product } from "./data";

/** Lazily loads the firestore helpers + db handle in one shot (browser only). */
async function fs() {
  const [mod, db] = await Promise.all([import("firebase/firestore"), fbDb()]);
  return { ...mod, db };
}

/* ------------------------------------------------------------------ */
/* Orders + delivery                                                   */
/* ------------------------------------------------------------------ */

export interface CreateOrderInput {
  customerId: string;
  customerName: string;
  items: OrderItem[];
  productSubtotal: number;
  delivery: DeliveryInfo;
  originAddress?: string;
}

function destinationLabel(d: DeliveryInfo): string {
  return [d.area, d.town, d.state].filter(Boolean).join(", ");
}

/** Creates an order awaiting a delivery quote + writes the first history entry. */
export async function createOrder(input: CreateOrderInput): Promise<string> {
  const { addDoc, collection, db } = await fs();
  const now = Date.now();
  const code = "#FV-ORD-" + String(now).slice(-6);
  const ref = await addDoc(collection(db, "orders"), {
    code,
    customerId: input.customerId,
    customerName: input.customerName,
    items: input.items,
    productSubtotal: input.productSubtotal,
    deliveryFee: null,
    totalAmount: input.productSubtotal,
    delivery: input.delivery,
    destinationAddress: destinationLabel(input.delivery),
    originAddress: input.originAddress ?? "",
    paymentStatus: "unpaid",
    orderStatus: "awaiting_delivery_quote",
    deliveryQuoteId: null,
    paymentReference: null,
    totalYards: input.items.reduce((n, i) => n + i.yards, 0),
    date: new Date(now).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" }),
    img: input.items[0]?.img ?? "",
    thumbs: input.items.map((i) => i.img).filter(Boolean).slice(0, 3),
    createdAt: now,
    updatedAt: now,
  });
  await addDoc(collection(db, "deliveryStatusHistory"), {
    orderId: ref.id,
    status: "awaiting_delivery_quote",
    message: "Order received. We're confirming the delivery (waybill) cost with the transport operator.",
    location: destinationLabel(input.delivery),
    updatedBy: input.customerId,
    timestamp: now,
  });
  return ref.id;
}

/** Admin/customer status transition + history entry. */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  opts: { message?: string; location?: string; updatedBy?: string; fee?: number; quoteId?: string } = {},
): Promise<void> {
  const { addDoc, collection, doc, updateDoc, db } = await fs();
  const now = Date.now();
  const patch: Record<string, unknown> = { orderStatus: status, updatedAt: now };
  if (opts.fee !== undefined) patch.deliveryFee = opts.fee;
  if (opts.quoteId !== undefined) patch.deliveryQuoteId = opts.quoteId;
  await updateDoc(doc(db, "orders", orderId), patch);
  await addDoc(collection(db, "deliveryStatusHistory"), {
    orderId,
    status,
    message: opts.message ?? status.replace(/_/g, " "),
    location: opts.location ?? "",
    updatedBy: opts.updatedBy ?? "admin",
    timestamp: now,
  });
}

/** Admin enters a delivery (waybill) quote; fee = waybill + packaging + handling + contingency + service charge. */
export async function createDeliveryQuote(input: {
  orderId: string;
  transportOperator: string;
  originPark: string;
  destinationPark: string;
  actualWaybillCost: number;
  packagingCost: number;
  handlingCost: number;
  contingencyAllowance: number;
  serviceCharge?: number;
  estimatedArrival: string;
  expiresAt: string;
  createdBy: string;
}): Promise<string> {
  const { addDoc, collection, db } = await fs();
  const customerDeliveryFee =
    input.actualWaybillCost +
    input.packagingCost +
    input.handlingCost +
    input.contingencyAllowance +
    (input.serviceCharge ?? 0);

  const ref = await addDoc(collection(db, "deliveryQuotes"), {
    orderId: input.orderId,
    transportOperator: input.transportOperator,
    originPark: input.originPark,
    destinationPark: input.destinationPark,
    actualWaybillCost: input.actualWaybillCost,
    packagingCost: input.packagingCost,
    handlingCost: input.handlingCost,
    contingencyAllowance: input.contingencyAllowance,
    customerDeliveryFee,
    quoteStatus: "sent",
    expiresAt: input.expiresAt,
    estimatedArrival: input.estimatedArrival,
    createdBy: input.createdBy,
    createdAt: Date.now(),
    acceptedAt: null,
  });

  await updateOrderStatus(input.orderId, "quote_sent", {
    message: `Delivery quote ready: ${customerDeliveryFee.toLocaleString()} naira. Review and pay before it expires.`,
    updatedBy: input.createdBy,
    fee: customerDeliveryFee,
    quoteId: ref.id,
  });

  // Notify the customer who owns this order — the delivery price is set.
  try {
    const { doc, getDoc, db: db2 } = await fs();
    const orderSnap = await getDoc(doc(db2, "orders", input.orderId));
    const o = orderSnap.exists() ? (orderSnap.data() as { customerId?: string; code?: string }) : null;
    if (o?.customerId) {
      void pushNotify(
        {
          title: "Delivery price ready 🚚",
          body: `Delivery for ${o.code ?? "your order"} is ₦${customerDeliveryFee.toLocaleString()}. Review and pay before it expires.`,
          url: `/orders/${input.orderId}`,
          tag: "quote",
        },
        { uid: o.customerId },
      );
    }
  } catch {
    /* never block the quote on a notification */
  }

  return ref.id;
}

/** Customer accepts a quote → moves to awaiting_payment. */
export async function acceptQuote(orderId: string, quoteId: string, userId: string): Promise<void> {
  const { doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "deliveryQuotes", quoteId), {
    quoteStatus: "accepted",
    acceptedAt: Date.now(),
  });
  await updateOrderStatus(orderId, "awaiting_payment", {
    message: "Quote accepted. Complete payment to confirm your order.",
    updatedBy: userId,
  });
}

/** Record payment reference after backend verification. */
export async function markPaid(orderId: string, reference: string): Promise<void> {
  const { doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "orders", orderId), {
    paymentStatus: "paid",
    paymentReference: reference,
    updatedAt: Date.now(),
  });
  await updateOrderStatus(orderId, "paid", {
    message: "Payment confirmed. Your parcel will be dispatched soon.",
    updatedBy: "system",
  });
}

/**
 * Save the gateway tx_ref on the order when we start a checkout. This lets a
 * customer who closes the browser mid-payment have their payment reconciled
 * when they come back — the order page re-verifies against this reference.
 */
export async function savePaymentTxRef(orderId: string, txRef: string): Promise<void> {
  const { doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "orders", orderId), {
    paymentTxRef: txRef,
    paymentStatus: "pending",
    updatedAt: Date.now(),
  });
}

/* ------------------------------------------------------------------ */
/* Admin: products                                                     */
/* ------------------------------------------------------------------ */

export type ProductInput = Omit<Product, "id" | "rating" | "reviews">;

export async function createProduct(p: ProductInput): Promise<string> {
  const { addDoc, collection, db } = await fs();
  const ref = await addDoc(collection(db, "products"), {
    ...p,
    rating: 0,
    reviews: 0,
    createdAt: Date.now(),
  });
  // Broadcast: every subscribed device gets the new-product alert.
  void pushNotify({ title: "New product just dropped 🛍️", body: p.name, url: `/product/${ref.id}`, tag: "product" });
  return ref.id;
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
  const { doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "products", id), { ...patch, updatedAt: Date.now() });
}

/** Decrements stock when an order is placed (never below 0). */
export async function decrementStock(items: { productId: string; yards: number }[]): Promise<void> {
  const { doc, increment, updateDoc, db } = await fs();
  const writes = items.map((it) =>
    updateDoc(doc(db, "products", it.productId), {
      availableYards: increment(-it.yards),
    }).catch(() => undefined), // product may have been removed
  );
  await Promise.all(writes);
}

export async function deleteProduct(id: string): Promise<void> {
  const { deleteDoc, doc, db } = await fs();
  await deleteDoc(doc(db, "products", id));
}

/* ------------------------------------------------------------------ */
/* Live shopping                                                       */
/* ------------------------------------------------------------------ */

export async function sendLiveMessage(sessionId: string, user: { uid: string; name: string }, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const { addDoc, collection, db } = await fs();
  await addDoc(collection(db, "liveSessions", sessionId, "messages"), {
    userId: user.uid,
    name: user.name,
    text: trimmed,
    createdAt: Date.now(),
  });
}

/** Toggle the current viewer's like on the live session. */
export async function toggleLiveLike(sessionId: string, uid: string, liked: boolean): Promise<void> {
  const { arrayRemove, arrayUnion, doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "liveSessions", sessionId), {
    likedBy: liked ? arrayRemove(uid) : arrayUnion(uid),
  });
}

/** Ensure the live session doc exists (idempotent). */
export async function ensureLiveSession(sessionId: string, data: { title: string; sellerName: string; featuredProductId?: string }): Promise<void> {
  const { doc, setDoc, getDoc, db } = await fs();
  const ref = doc(db, "liveSessions", sessionId);
  const before = await getDoc(ref).catch(() => null);
  const wasActive = before?.exists() ? Boolean((before.data() as { active?: boolean }).active) : false;
  await setDoc(
    ref,
    { active: true, likedBy: [], ...data },
    { merge: true },
  );
  // Broadcast only when the session (re)starts, never on ordinary visits.
  if (!wasActive) {
    void pushNotify({
      title: "🔴 We're LIVE",
      body: `${data.sellerName}: ${data.title}`,
      url: "/live",
      tag: "live",
    });
  }
}

/* ------------------------------------------------------------------ */
/* Feed (photo/video posts)                                            */
/* ------------------------------------------------------------------ */

export async function togglePostLike(postId: string, uid: string, liked: boolean): Promise<void> {
  const { arrayRemove, arrayUnion, doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "posts", postId), {
    likes: liked ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export async function togglePostSave(postId: string, uid: string, saved: boolean): Promise<void> {
  const { arrayRemove, arrayUnion, doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "posts", postId), {
    saves: saved ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export async function sharePost(postId: string): Promise<void> {
  const { doc, increment, updateDoc, db } = await fs();
  await updateDoc(doc(db, "posts", postId), { shares: increment(1) });
}

export async function addPostComment(
  postId: string,
  user: { uid: string; name: string },
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const { arrayUnion, doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "posts", postId), {
    comments: arrayUnion({
      id: `${Date.now()}`,
      userId: user.uid,
      name: user.name,
      text: trimmed,
      createdAt: Date.now(),
    }),
  });
}

export async function createPost(input: {
  userId: string;
  sellerName: string;
  caption: string;
  media: { type: "image" | "video"; url: string }[];
  taggedProductId?: string;
}): Promise<string> {
  const { addDoc, collection, db } = await fs();
  const ref = await addDoc(collection(db, "posts"), {
    ...input,
    taggedProductId: input.taggedProductId ?? "",
    likes: [],
    saves: [],
    shares: 0,
    comments: [],
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function deletePost(id: string): Promise<void> {
  const { deleteDoc, doc, db } = await fs();
  await deleteDoc(doc(db, "posts", id));
}

/* ------------------------------------------------------------------ */
/* Admin: home cover banners                                           */
/* ------------------------------------------------------------------ */

export async function createBanner(input: { img: string; link?: string; order?: number; createdBy?: string }): Promise<string> {
  const { addDoc, collection, db } = await fs();
  const ref = await addDoc(collection(db, "banners"), {
    img: input.img,
    link: input.link ?? "/explore",
    order: input.order ?? 0,
    createdBy: input.createdBy ?? "",
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function deleteBanner(id: string): Promise<void> {
  const { deleteDoc, doc, db } = await fs();
  await deleteDoc(doc(db, "banners", id));
}

export async function setBannerOrder(id: string, order: number): Promise<void> {
  const { doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "banners", id), { order });
}

/* ------------------------------------------------------------------ */
/* Admin: categories (name + circle image)                             */
/* ------------------------------------------------------------------ */

export async function createCategory(input: { name: string; img?: string }): Promise<string> {
  const { addDoc, collection, db } = await fs();
  const ref = await addDoc(collection(db, "categories"), {
    name: input.name.trim(),
    img: input.img ?? "",
  });
  return ref.id;
}

export async function updateCategory(id: string, patch: { name?: string; img?: string }): Promise<void> {
  const { doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "categories", id), patch);
}

export async function deleteCategory(id: string): Promise<void> {
  const { deleteDoc, doc, db } = await fs();
  await deleteDoc(doc(db, "categories", id));
}

/* ------------------------------------------------------------------ */
/* Admin + users: reels (short fabric videos)                          */
/* ------------------------------------------------------------------ */

export async function createReel(input: {
  sellerName: string;
  caption: string;
  video: string;
  productId?: string;
}): Promise<string> {
  const { addDoc, collection, db } = await fs();
  const ref = await addDoc(collection(db, "reels"), {
    sellerName: input.sellerName,
    caption: input.caption,
    video: input.video,
    productId: input.productId ?? "",
    likes: [],
    comments: [],
    shares: 0,
    views: 0,
    createdAt: Date.now(),
  });
  void pushNotify({
    title: "New reel 🎬",
    body: input.caption || `${input.sellerName} posted a new reel`,
    url: "/reels",
    tag: "reel",
  });
  return ref.id;
}

export async function deleteReel(id: string): Promise<void> {
  const { deleteDoc, doc, db } = await fs();
  await deleteDoc(doc(db, "reels", id));
}

export async function toggleReelLike(reelId: string, uid: string, liked: boolean): Promise<void> {
  const { arrayRemove, arrayUnion, doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "reels", reelId), {
    likes: liked ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export async function addReelComment(
  reelId: string,
  user: { uid: string; name: string },
  text: string,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const { arrayUnion, doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "reels", reelId), {
    comments: arrayUnion({
      id: `${Date.now()}`,
      userId: user.uid,
      name: user.name,
      text: trimmed,
      createdAt: Date.now(),
    }),
  });
}

export async function shareReel(reelId: string): Promise<void> {
  const { doc, increment, updateDoc, db } = await fs();
  await updateDoc(doc(db, "reels", reelId), { shares: increment(1) });
}

export async function incrementReelView(reelId: string): Promise<void> {
  const { doc, increment, updateDoc, db } = await fs();
  await updateDoc(doc(db, "reels", reelId), { views: increment(1) }).catch(() => undefined);
}

/* ------------------------------------------------------------------ */
/* User addresses                                                      */
/* ------------------------------------------------------------------ */

export interface AddressInput {
  userId: string;
  label: string;
  recipient: string;
  phone: string;
  line: string;
  city: string;
  state: string;
  isDefault?: boolean;
}

export async function addAddress(input: AddressInput): Promise<string> {
  const { addDoc, collection, db } = await fs();
  const ref = await addDoc(collection(db, "addresses"), {
    ...input,
    isDefault: input.isDefault ?? false,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateAddress(id: string, patch: Partial<AddressInput>): Promise<void> {
  const { doc, updateDoc, db } = await fs();
  await updateDoc(doc(db, "addresses", id), patch);
}

export async function deleteAddress(id: string): Promise<void> {
  const { deleteDoc, doc, db } = await fs();
  await deleteDoc(doc(db, "addresses", id));
}

/** Make one address the default and clear the flag on the others. */
export async function setDefaultAddress(
  id: string,
  userId: string,
  allIds: string[],
): Promise<void> {
  const { doc, updateDoc, db } = await fs();
  const writes = allIds
    .filter((other) => other !== id)
    .map((other) => updateDoc(doc(db, "addresses", other), { isDefault: false }).catch(() => undefined));
  writes.push(updateDoc(doc(db, "addresses", id), { isDefault: true }));
  await Promise.all(writes);
}
