"use client";

/**
 * Firestore-backed data layer (real-time via onSnapshot, NO dummy fallback).
 *
 * Collections:
 *   products:   { name, spec, price, rating, reviews, badge, badgeClass, category,
 *                 img, availableYards, colors[], description, status, lowStockAt, createdAt }
 *   categories: { name, img, createdAt }
 *   orders:     full delivery-aware order (see Order below)
 *   deliveryQuotes / deliveries / deliveryStatusHistory: waybill lifecycle
 *   posts:      feed (photo/video) with likes, saves, shares, comments
 *   liveSessions / liveSessions/{id}/messages: live shopping chat
 */

import { useEffect, useState } from "react";
import { fbDb, isFirebaseConfigured } from "./firebase";

/* ------------------------------------------------------------------ */
/* Products & categories                                               */
/* ------------------------------------------------------------------ */

export interface Product {
  id: string;
  name: string;
  spec: string;
  price: number;
  rating: number;
  reviews: number;
  badge: string;
  badgeClass: string;
  category: string;
  img: string;
  availableYards: number;
  colors: string[];
  description: string;
  status: "published" | "draft";
  lowStockAt: number;
}

export interface Category {
  id: string;
  name: string;
  img: string;
}

/** A full "piece" of fabric is 6 yards — the minimum a customer can order. */
export const MIN_YARDS = 6;

export type StockLevel = "out" | "low" | "in";
export function stockLevel(p: Pick<Product, "availableYards" | "lowStockAt">): StockLevel {
  if (p.availableYards <= 0) return "out";
  if (p.availableYards <= (p.lowStockAt || 5)) return "low";
  return "in";
}

/* ------------------------------------------------------------------ */
/* Orders + delivery lifecycle                                         */
/* ------------------------------------------------------------------ */

export const ORDER_STATUSES = [
  "awaiting_delivery_quote",
  "quote_sent",
  "quote_accepted",
  "awaiting_payment",
  "paid",
  "awaiting_dispatch",
  "dispatched",
  "in_transit",
  "arrived_at_destination_park",
  "ready_for_collection",
  "collected",
  "delivery_issue",
  "cancelled",
  "refund_pending",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_META: Record<OrderStatus, { label: string; color: string; short: string }> = {
  awaiting_delivery_quote: { label: "Awaiting delivery quote", color: "bg-amber-500/15 text-amber-400", short: "Quote pending" },
  quote_sent: { label: "Quote sent — review & pay", color: "bg-sky-500/15 text-sky-400", short: "Quote sent" },
  quote_accepted: { label: "Quote accepted", color: "bg-sky-500/15 text-sky-400", short: "Accepted" },
  awaiting_payment: { label: "Awaiting payment", color: "bg-violet-500/15 text-violet-400", short: "Awaiting payment" },
  paid: { label: "Paid", color: "bg-emerald-500/15 text-emerald-400", short: "Paid" },
  awaiting_dispatch: { label: "Preparing for dispatch", color: "bg-emerald-500/15 text-emerald-400", short: "Preparing" },
  dispatched: { label: "Dispatched", color: "bg-emerald-500/15 text-emerald-400", short: "Dispatched" },
  in_transit: { label: "In transit", color: "bg-teal-500/15 text-teal-400", short: "In transit" },
  arrived_at_destination_park: { label: "Arrived at destination park", color: "bg-teal-500/15 text-teal-400", short: "Arrived" },
  ready_for_collection: { label: "Ready for collection", color: "bg-fv-pink/15 text-fv-pink", short: "Ready" },
  collected: { label: "Collected", color: "bg-emerald-500/15 text-emerald-400", short: "Collected" },
  delivery_issue: { label: "Delivery issue", color: "bg-red-500/15 text-red-400", short: "Issue" },
  cancelled: { label: "Cancelled", color: "bg-slate-500/15 text-slate-400", short: "Cancelled" },
  refund_pending: { label: "Refund pending", color: "bg-amber-500/15 text-amber-400", short: "Refund pending" },
  refunded: { label: "Refunded", color: "bg-slate-500/15 text-slate-400", short: "Refunded" },
};

export type PaymentStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded";

export interface OrderItem {
  productId: string;
  name: string;
  spec: string;
  yards: number;
  pricePerYard: number;
  img: string;
}

export interface DeliveryInfo {
  fullName: string;
  phone: string;
  state: string;
  town: string;
  area: string;
  street: string;
  nearestPark: string;
  destinationPark: string;
}

export interface Order {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  productSubtotal: number;
  deliveryFee: number | null;
  totalAmount: number;
  delivery: DeliveryInfo;
  destinationAddress: string;
  originAddress: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryQuoteId: string | null;
  paymentReference: string | null;
  paymentTxRef: string | null;
  totalYards: number;
  // legacy display fields kept for list rendering
  date: string;
  img: string;
  thumbs: string[];
}

export interface DeliveryQuote {
  id: string;
  orderId: string;
  transportOperator: string;
  originPark: string;
  destinationPark: string;
  actualWaybillCost: number;
  packagingCost: number;
  handlingCost: number;
  contingencyAllowance: number;
  customerDeliveryFee: number;
  quoteStatus: "pending" | "sent" | "accepted" | "declined" | "expired" | "revised";
  expiresAt: string;
  estimatedArrival: string;
  createdBy: string;
  createdAt: string;
  acceptedAt: string | null;
}

export interface Delivery {
  id: string;
  orderId: string;
  transportOperator: string;
  waybillReference: string;
  waybillReceiptUrl: string;
  dispatchDate: string;
  estimatedArrival: string;
  actualArrival: string;
  collectionCode: string;
  deliveryStatus: OrderStatus;
  collectedAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  orderId: string;
  status: OrderStatus;
  message: string;
  location: string;
  updatedBy: string;
  timestamp: number;
}

/** Order total including delivery, computed on the backend normally. */
export function orderTotal(o: Pick<Order, "productSubtotal" | "deliveryFee">): number {
  return o.productSubtotal + (o.deliveryFee ?? 0);
}

export function destinationLabel(d?: DeliveryInfo): string {
  if (!d) return "";
  return [d.area, d.town, d.state].filter(Boolean).join(", ");
}

/* ------------------------------------------------------------------ */
/* Feed (photo/video posts)                                            */
/* ------------------------------------------------------------------ */

export interface FeedComment {
  id: string;
  userId: string;
  name: string;
  text: string;
  createdAt: number;
}

export interface PostMedia {
  type: "image" | "video";
  url: string;
}

export interface Post {
  id: string;
  userId: string;
  sellerName: string;
  caption: string;
  media: PostMedia[];
  taggedProductId: string;
  likes: string[];
  saves: string[];
  shares: number;
  comments: FeedComment[];
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Live shopping                                                       */
/* ------------------------------------------------------------------ */

export interface LiveMessage {
  id: string;
  userId: string;
  name: string;
  text: string;
  createdAt: number;
}

export interface LiveSession {
  id: string;
  title: string;
  sellerName: string;
  active: boolean;
  likedBy: string[];
  featuredProductId: string;
}

/* ------------------------------------------------------------------ */
/* Home cover banners (admin-uploaded images, no text overlay)         */
/* ------------------------------------------------------------------ */

export interface Banner {
  id: string;
  img: string;
  link: string;
  order: number;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Reels (short fabric videos posted by admin)                         */
/* ------------------------------------------------------------------ */

export interface Reel {
  id: string;
  sellerName: string;
  caption: string;
  video: string;
  productId: string;
  likes: string[];
  comments: FeedComment[];
  shares: number;
  views: number;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export function naira(n: number): string {
  return "₦" + n.toLocaleString("en-NG");
}

export function isRemoteImage(src: string): boolean {
  return /^https?:\/\//.test(src) || src.startsWith("data:");
}

export function fmtTime(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ------------------------------------------------------------------ */
/* Generic snapshot hooks                                              */
/* ------------------------------------------------------------------ */

function useSnapshotCollection<T extends { id: string }>(
  name: string,
  map: (id: string, data: Record<string, unknown>) => T,
  constraints?: { field: string; value: string },
  ordered?: { field: string; dir: "asc" | "desc" },
): { items: T[]; loading: boolean } {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  const field = constraints?.field;
  const value = constraints?.value;
  const ordField = ordered?.field;
  const ordDir = ordered?.dir ?? "desc";

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      // firestore loads lazily (see ./firebase) — it must never be in the SSR graph.
      const { collection, onSnapshot, orderBy, query, where } = await import("firebase/firestore");
      if (cancelled) return;
      try {
        const col = collection(await fbDb(), name);
        const constraintsList = [];
        if (field && value !== undefined) constraintsList.push(where(field, "==", value));
        let q =
          constraintsList.length > 0
            ? query(col, ...constraintsList)
            : col;
        if (ordField) {
          q = query(col, ...constraintsList, orderBy(ordField, ordDir));
        }
        unsub = onSnapshot(
          q,
          (snap) => {
            setItems(snap.docs.map((d) => map(d.id, d.data() as Record<string, unknown>)));
            setLoading(false);
          },
          () => {
            setItems([]);
            setLoading(false);
          },
        );
      } catch {
        setItems([]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, field, value, ordField, ordDir]);

  return { items, loading };
}

/* ------------------------------------------------------------------ */
/* Product / category hooks                                            */
/* ------------------------------------------------------------------ */

export function mapProduct(id: string, d: Record<string, unknown>): Product {
  return {
    id,
    name: String(d.name ?? "Untitled fabric"),
    spec: String(d.spec ?? ""),
    price: Number(d.price ?? 0),
    rating: Number(d.rating ?? 0),
    reviews: Number(d.reviews ?? 0),
    badge: String(d.badge ?? ""),
    badgeClass: String(d.badgeClass ?? "bg-fv-purple"),
    category: String(d.category ?? "All"),
    img: String(d.img ?? ""),
    availableYards: Number(d.availableYards ?? 0),
    colors: Array.isArray(d.colors) ? (d.colors as string[]) : [],
    description: String(d.description ?? ""),
    status: (d.status === "draft" ? "draft" : "published") as Product["status"],
    lowStockAt: Number(d.lowStockAt ?? 5),
  };
}

export function useProducts(includeDrafts = false) {
  const { items, loading } = useSnapshotCollection<Product>("products", mapProduct);
  return {
    items: includeDrafts ? items : items.filter((p) => p.status !== "draft"),
    loading,
  };
}

export function useProduct(id?: string): { product: Product | null; loading: boolean } {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured && Boolean(id));

  useEffect(() => {
    if (!isFirebaseConfigured || !id) {
      setProduct(null);
      setLoading(false);
      return;
    }    let unsub = () => {};
    let cancelled = false;
    (async () => {
      const { doc, onSnapshot } = await import("firebase/firestore");
      if (cancelled) return;
      try {
        unsub = onSnapshot(
          doc(await fbDb(), "products", id),
          (snap) => {
            setProduct(snap.exists() ? mapProduct(snap.id, snap.data() as Record<string, unknown>) : null);
            setLoading(false);
          },
          () => {
            setProduct(null);
            setLoading(false);
          },
        );
      } catch {
        setProduct(null);

        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [id]);

  return { product, loading };
}

export function useCategories() {
  return useSnapshotCollection<Category>("categories", (id, d) => ({
    id,
    name: String(d.name ?? "Category"),
    img: String(d.img ?? ""),
  }));
}

/* ------------------------------------------------------------------ */
/* User addresses (per signed-in user)                                 */
/* ------------------------------------------------------------------ */

export interface Address {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line: string;
  city: string;
  state: string;
  isDefault: boolean;
}

export function useAddresses(uid?: string) {
  return useSnapshotCollection<Address>(
    "addresses",
    (id, d) => ({
      id,
      label: String(d.label ?? "Address"),
      recipient: String(d.recipient ?? ""),
      phone: String(d.phone ?? ""),
      line: String(d.line ?? ""),
      city: String(d.city ?? ""),
      state: String(d.state ?? ""),
      isDefault: Boolean(d.isDefault),
    }),
    uid ? { field: "userId", value: uid } : undefined,
  );
}

export function useBanners() {
  const { items, loading } = useSnapshotCollection<Banner>(
    "banners",
    (id, d) => ({
      id,
      img: String(d.img ?? ""),
      link: String(d.link ?? "/explore"),
      order: Number(d.order ?? 0),
      createdAt: Number(d.createdAt ?? 0),
    }),
  );
  return { items: [...items].sort((a, b) => a.order - b.order), loading };
}

export function useReels() {
  return useSnapshotCollection<Reel>(
    "reels",
    (id, d) => ({
      id,
      sellerName: String(d.sellerName ?? "FabricVerse"),
      caption: String(d.caption ?? ""),
      video: String(d.video ?? ""),
      productId: String(d.productId ?? ""),
      likes: Array.isArray(d.likes) ? (d.likes as string[]) : [],
      comments: Array.isArray(d.comments) ? (d.comments as FeedComment[]) : [],
      shares: Number(d.shares ?? 0),
      views: Number(d.views ?? 0),
      createdAt: Number(d.createdAt ?? 0),
    }),
    undefined,
    { field: "createdAt", dir: "desc" },
  );
}

/* ------------------------------------------------------------------ */
/* Order hooks                                                         */
/* ------------------------------------------------------------------ */

export function mapOrder(id: string, d: Record<string, unknown>): Order {
  const rawItems = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  const items: OrderItem[] = rawItems.map((it) => ({
    productId: String(it.productId ?? ""),
    name: String(it.name ?? "Item"),
    spec: String(it.spec ?? ""),
    yards: Number(it.yards ?? 0),
    pricePerYard: Number(it.pricePerYard ?? 0),
    img: String(it.img ?? ""),
  }));
  const rawDelivery = (d.delivery ?? {}) as Record<string, unknown>;
  return {
    id,
    code: String(d.code ?? "#FV-ORD-000000"),
    customerId: String(d.customerId ?? ""),
    customerName: String(d.customerName ?? ""),
    items,
    productSubtotal: Number(d.productSubtotal ?? 0),
    deliveryFee: d.deliveryFee === null || d.deliveryFee === undefined ? null : Number(d.deliveryFee),
    totalAmount: Number(d.totalAmount ?? d.productSubtotal ?? 0),
    delivery: {
      fullName: String(rawDelivery.fullName ?? ""),
      phone: String(rawDelivery.phone ?? ""),
      state: String(rawDelivery.state ?? ""),
      town: String(rawDelivery.town ?? ""),
      area: String(rawDelivery.area ?? ""),
      street: String(rawDelivery.street ?? ""),
      nearestPark: String(rawDelivery.nearestPark ?? ""),
      destinationPark: String(rawDelivery.destinationPark ?? ""),
    },
    destinationAddress: String(d.destinationAddress ?? ""),
    originAddress: String(d.originAddress ?? ""),
    paymentStatus: (d.paymentStatus ?? "unpaid") as PaymentStatus,
    orderStatus: (ORDER_STATUSES.includes(d.orderStatus as OrderStatus)
      ? d.orderStatus
      : "awaiting_delivery_quote") as OrderStatus,
    deliveryQuoteId: d.deliveryQuoteId ? String(d.deliveryQuoteId) : null,
    paymentReference: d.paymentReference ? String(d.paymentReference) : null,
    paymentTxRef: d.paymentTxRef ? String(d.paymentTxRef) : null,
    totalYards: Number(d.totalYards ?? items.reduce((n, i) => n + i.yards, 0)),
    // legacy/display
    date: String(d.date ?? ""),
    img: String(d.img ?? (items[0]?.img ?? "")),
    thumbs: Array.isArray(d.thumbs) ? (d.thumbs as string[]) : [],
  };
}

export function useOrders(userId?: string) {
  const { items, loading } = useSnapshotCollection<Order>("orders", mapOrder);
  return { items: userId ? items.filter((o) => o.customerId === userId) : [], loading };
}

export function useAllOrders() {
  return useSnapshotCollection<Order>("orders", mapOrder, undefined, { field: "createdAt", dir: "desc" });
}

export function useOrder(id?: string): { order: Order | null; loading: boolean } {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured && Boolean(id));

  useEffect(() => {
    if (!isFirebaseConfigured || !id) {
      setOrder(null);
      setLoading(false);
      return;
    }
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      const { doc, onSnapshot } = await import("firebase/firestore");
      if (cancelled) return;
      try {
        unsub = onSnapshot(
          doc(await fbDb(), "orders", id),
          (snap) => {
            setOrder(snap.exists() ? mapOrder(snap.id, snap.data() as Record<string, unknown>) : null);
            setLoading(false);
          },
          () => {
            setOrder(null);
            setLoading(false);
          },
        );
      } catch {
        setOrder(null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [id]);

  return { order, loading };
}

export function useStatusHistory(orderId?: string) {
  const [entries, setEntries] = useState<StatusHistoryEntry[]>([]);
  useEffect(() => {
    if (!isFirebaseConfigured || !orderId) {
      setEntries([]);
      return;
    }
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      const { collection, onSnapshot, query, where } = await import("firebase/firestore");
      if (cancelled) return;
      try {
        const q = query(
          collection(await fbDb(), "deliveryStatusHistory"),
          where("orderId", "==", orderId),
        );
        unsub = onSnapshot(q, (snap) => {
          setEntries(
            snap.docs
              .map((d) => {
                const x = d.data() as Record<string, unknown>;
                return {
                  id: d.id,
                  orderId: String(x.orderId ?? ""),
                  status: (x.status ?? "awaiting_delivery_quote") as OrderStatus,
                  message: String(x.message ?? ""),
                  location: String(x.location ?? ""),
                  updatedBy: String(x.updatedBy ?? ""),
                  timestamp: Number(x.timestamp ?? 0),
                };
              })
              .sort((a, b) => a.timestamp - b.timestamp),
          );
        });
      } catch {
        setEntries([]);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [orderId]);
  return entries;
}

/* ------------------------------------------------------------------ */
/* Feed + live hooks                                                   */
/* ------------------------------------------------------------------ */

export function usePosts() {
  return useSnapshotCollection<Post>(
    "posts",
    (id, d) => ({
      id,
      userId: String(d.userId ?? ""),
      sellerName: String(d.sellerName ?? "Seller"),
      caption: String(d.caption ?? ""),
      media: Array.isArray(d.media) ? (d.media as PostMedia[]) : [],
      taggedProductId: String(d.taggedProductId ?? ""),
      likes: Array.isArray(d.likes) ? (d.likes as string[]) : [],
      saves: Array.isArray(d.saves) ? (d.saves as string[]) : [],
      shares: Number(d.shares ?? 0),
      comments: Array.isArray(d.comments) ? (d.comments as FeedComment[]) : [],
      createdAt: Number(d.createdAt ?? 0),
    }),
    undefined,
    { field: "createdAt", dir: "desc" },
  );
}

export function useLiveSession(sessionId = "main") {
  const [session, setSession] = useState<LiveSession | null>(null);
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      const { doc, onSnapshot } = await import("firebase/firestore");
      if (cancelled) return;
      try {
        unsub = onSnapshot(doc(await fbDb(), "liveSessions", sessionId), (snap) => {
          if (snap.exists()) {
            const d = snap.data() as Record<string, unknown>;
            setSession({
              id: snap.id,
              title: String(d.title ?? "Live Fabric Session"),
              sellerName: String(d.sellerName ?? "FabricVerse"),
              active: Boolean(d.active),
              likedBy: Array.isArray(d.likedBy) ? (d.likedBy as string[]) : [],
              featuredProductId: String(d.featuredProductId ?? ""),
            });
          } else {
            setSession(null);
          }
        });
      } catch {
        setSession(null);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [sessionId]);
  return session;
}

export function useLiveMessages(sessionId = "main") {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      const { collection, onSnapshot, orderBy, query } = await import("firebase/firestore");
      if (cancelled) return;
      try {
        const q = query(
          collection(await fbDb(), "liveSessions", sessionId, "messages"),
          orderBy("createdAt", "desc"),
        );
        unsub = onSnapshot(q, (snap) => {
          setMessages(
            snap.docs.map((d) => {
              const x = d.data() as Record<string, unknown>;
              return {
                id: d.id,
                userId: String(x.userId ?? ""),
                name: String(x.name ?? "Guest"),
                text: String(x.text ?? ""),
                createdAt: Number(x.createdAt ?? 0),
              };
            }),
          );
        });
      } catch {
        setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
      unsub();
    };
  }, [sessionId]);
  return messages;
}
