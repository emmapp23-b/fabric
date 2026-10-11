"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Eye, Heart, MessageCircle, Share2, Store, X, BadgeCheck, Send, ShoppingBag, Radio } from "lucide-react";
import { BottomNav, Logo, Media, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { fbDb, isFirebaseConfigured } from "@/lib/firebase";
import { fmtTime, naira, useLiveMessages, useLiveSession, useProducts, useReels } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { ensureLiveSession, sendLiveMessage, toggleLiveLike } from "@/lib/mutations";

const SESSION_ID = "main";

export default function LivePage() {
  const { user } = useAuth();
  const session = useLiveSession(SESSION_ID);
  const messages = useLiveMessages(SESSION_ID);
  const { items: products } = useProducts();
  const { items: reels } = useReels();
  const [text, setText] = useState("");
  const [sharing, setSharing] = useState(false);
  const viewCounted = useRef(false);

  // Make sure the live session document exists.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    ensureLiveSession(SESSION_ID, {
      title: "Live Fabric Session",
      sellerName: "FabricVerse",
      featuredProductId: products[0]?.id ?? "",
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseConfigured]);

  // Count this visit once per page load.
  useEffect(() => {
    if (!isFirebaseConfigured || viewCounted.current) return;
    viewCounted.current = true;
    (async () => {
      // firestore loads lazily (see lib/firebase) — never in the SSR graph.
      const { doc, increment, updateDoc } = await import("firebase/firestore");
      updateDoc(doc(await fbDb(), "liveSessions", SESSION_ID), { views: increment(1) }).catch(() => undefined);
    })();
  }, []);

  const liked = session?.likedBy?.includes(user?.uid ?? "") ?? false;
  const likes = session?.likedBy?.length ?? 0;
  const views = (session as unknown as { views?: number } | null)?.views ?? 0;
  const featured = products.find((p) => p.id === session?.featuredProductId) ?? products[0];

  // Products tagged in reels — auto-surfaced here so viewers can shop them.
  const reelProductIds = Array.from(new Set(reels.map((r) => r.productId).filter(Boolean)));
  const shopProducts = reelProductIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 10);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const name = user.displayName || user.email?.split("@")[0] || "Guest";
    const value = text;
    setText("");
    try {
      await sendLiveMessage(SESSION_ID, { uid: user.uid, name }, value);
    } catch {
      setText(value); // restore on failure
    }
  }

  async function onLike() {
    if (!user) return;
    try {
      await toggleLiveLike(SESSION_ID, user.uid, liked);
    } catch {
      /* ignore */
    }
  }

  async function onShare() {
    setSharing(true);
    const url = typeof window !== "undefined" ? window.location.origin + "/live" : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: "FabricVerse Live", text: "Watch the live fabric session!", url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user dismissed share sheet */
    } finally {
      setSharing(false);
    }
  }

  return (
    <RequireAuth>
    <Screen className="relative bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(168,85,247,0.35),transparent_55%),radial-gradient(100%_60%_at_80%_80%,rgba(255,30,99,0.30),transparent_55%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />

      <div className="relative flex min-h-[100dvh] flex-col">

        {/* Top bar */}
        <div className="flex items-start justify-between px-5 pt-2">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 rounded-full bg-black/50 p-1.5 pr-4 backdrop-blur-md">
              <Logo size="sm" className="rounded-full bg-black/40 px-2 py-1" />
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-fv-pink px-2.5 py-1 text-xs font-black tracking-wide">LIVE</span>
              <span className="flex items-center gap-1 rounded-md bg-black/55 px-2.5 py-1 text-xs font-semibold backdrop-blur-md">
                <Eye className="h-3.5 w-3.5" /> {views}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-black/55 px-3 py-2 backdrop-blur-md">
              <Store className="h-4 w-4 text-white/90" />
              <div className="leading-tight">
                <div className="flex items-center gap-1 text-[13px] font-bold">
                  {session?.sellerName ?? "FabricVerse"}
                  <BadgeCheck className="h-3.5 w-3.5 fill-sky-500 text-white" />
                </div>
                <div className="text-[11px] text-white/70">Official Store</div>
              </div>
            </div>
            <Link href="/home" aria-label="Close live" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 backdrop-blur-md">
              <X className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Watermark */}
        <div className="mt-6 flex flex-col items-center gap-1 opacity-90">
          <Logo size="md" />
          <div className="text-sm font-bold text-white/90">{session?.sellerName ?? "FabricVerse"}</div>
          <div className="text-center text-xs text-white/70">Quality Fabrics.<br />Timeless Style.</div>
        </div>

        {/* Chat + actions */}
        <div className="mt-auto flex items-end justify-between gap-3 px-5 pb-3">
          <div className="no-scrollbar flex max-h-[220px] min-w-0 flex-1 flex-col gap-2.5 overflow-y-auto">
            {messages.length === 0 && (
              <div className="rounded-2xl bg-black/40 px-3 py-2 text-xs text-white/60 backdrop-blur-sm">
                Say hello 👋 — messages appear here live.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className="flex max-w-[85%] items-start gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fv-pink to-fv-purple text-[10px] font-black text-white">
                  {m.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="rounded-2xl bg-black/45 px-3 py-1.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-white/90">
                    {m.name}
                    <span className="font-normal text-white/50">{fmtTime(m.createdAt)}</span>
                  </div>
                  <div className="text-[13px] leading-snug text-white">{m.text}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4">
            <button onClick={onLike} className="flex flex-col items-center gap-1">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
                <Heart className={`h-6 w-6 transition ${liked ? "fill-fv-pink text-fv-pink" : "text-fv-pink"}`} />
              </span>
              <span className="text-[11px] font-semibold text-white drop-shadow">{likes}</span>
            </button>
            <button onClick={() => setText((t) => t || "@")} className="flex flex-col items-center gap-1">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
                <MessageCircle className="h-6 w-6 text-white" />
              </span>
              <span className="text-[11px] font-semibold text-white drop-shadow">{messages.length}</span>
            </button>
            <button onClick={onShare} disabled={sharing} className="flex flex-col items-center gap-1">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm">
                <Share2 className="h-6 w-6 text-white" />
              </span>
              <span className="text-[11px] font-semibold text-white drop-shadow">Share</span>
            </button>
            <Link href="/cart" className="flex h-12 w-12 items-center justify-center rounded-full bg-fv-pink shadow-lg shadow-fv-pink/40">
              <ShoppingBag className="h-6 w-6 text-white" />
            </Link>
          </div>
        </div>

        {/* Message input */}
        <form onSubmit={onSend} className="flex items-center gap-2 px-5 pb-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Send a message…"
            className="flex-1 rounded-full border border-white/15 bg-black/45 px-4 py-2.5 text-sm text-white placeholder:text-white/50 backdrop-blur-sm focus:border-fv-pink focus:outline-none"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-fv-pink disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </form>

        {/* Shop the reels — products from admin reels, auto-hosted for live shopping */}
        {shopProducts.length > 0 && (
          <div className="px-4 pb-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-white/80">
              <Radio className="h-3.5 w-3.5 text-fv-pink" /> Shop the reels
            </div>
            <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
              {shopProducts.map((p) => (
                <Link key={p.id} href={`/product/${p.id}`} className="w-24 shrink-0 rounded-2xl border border-fv-line bg-fv-panel/95 p-2 backdrop-blur-md">
                  <span className="relative block h-20 w-full overflow-hidden rounded-xl">
                    <Media src={p.img} alt={p.name} />
                  </span>
                  <div className="mt-1.5 truncate text-[11px] font-bold">{p.name}</div>
                  <div className="text-[11px] font-extrabold text-fv-pink">{naira(p.price)}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Featured product */}
        <div className="px-4 pb-3">
          {featured ? (
            <Link href={`/product/${featured.id}`} className="flex items-center gap-3 rounded-3xl border border-fv-line bg-fv-panel/95 p-3 backdrop-blur-md">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                <Media src={featured.img} alt={featured.name} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{featured.name}</div>
                <div className="text-[11px] text-fv-muted">{featured.spec}</div>
                <div className="mt-0.5">
                  <span className="text-lg font-extrabold">{naira(featured.price)}</span>
                  <span className="text-xs text-fv-muted"> /yard</span>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-fv-pink px-4 py-2.5 text-sm font-bold text-white">
                <ShoppingBag className="h-4 w-4" /> Shop Now
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-3 rounded-3xl border border-dashed border-white/20 bg-black/40 p-4 backdrop-blur-md">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                <Radio className="h-6 w-6 text-white/70" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">No products featured yet</div>
                <div className="text-[11px] text-white/60">Products added by the seller appear here.</div>
              </div>
            </div>
          )}
        </div>

        <BottomNav active="home" />
      </div>
    </Screen>
    </RequireAuth>
  );
}
