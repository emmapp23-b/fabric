"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Heart, MessageCircle, Send, Share2, ShoppingBag, X } from "lucide-react";
import { BottomNav, Logo, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { fmtTime, naira, useProducts, useReels } from "@/lib/data";
import type { Reel } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { addReelComment, incrementReelView, shareReel, toggleReelLike } from "@/lib/mutations";

/**
 * Reels tab — short fabric videos posted from the admin panel. Users watch,
 * like, comment, share, and shop the tagged product.
 */
export default function ReelsPage() {
  const { user } = useAuth();
  const { items: reels, loading } = useReels();

  return (
    <RequireAuth>
      <Screen>
        <header className="flex items-center justify-between px-5 pt-2 pb-3">
          <Logo size="md" />
          <Link href="/cart" className="flex h-9 w-9 items-center justify-center rounded-full bg-fv-pink" aria-label="Cart">
            <ShoppingBag className="h-4.5 w-4.5 text-white" />
          </Link>
        </header>

        <div className="px-5 pb-3">
          <h1 className="text-2xl font-extrabold">Reels</h1>
          <p className="mt-1 text-sm text-fv-muted">Watch fabric videos and shop the looks.</p>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-6">
          {reels.length === 0 && !loading && (
            <div className="rounded-2xl border border-dashed border-fv-line bg-fv-panel p-8 text-center">
              <Heart className="mx-auto h-8 w-8 text-fv-muted" />
              <p className="mt-3 text-sm font-semibold">No reels yet</p>
              <p className="mt-1 text-xs text-fv-muted">New fabric videos will show up here.</p>
            </div>
          )}
          {reels.map((r) => (
            <ReelCard key={r.id} reel={r} uid={user?.uid ?? ""} name={user?.displayName || user?.email?.split("@")[0] || "Guest"} />
          ))}
        </div>

        <BottomNav active="reels" />
      </Screen>
    </RequireAuth>
  );
}

function ReelCard({ reel, uid, name }: { reel: Reel; uid: string; name: string }) {
  const { items: products } = useProducts();
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const vidRef = useRef<HTMLVideoElement>(null);
  const counted = useRef(false);

  const liked = reel.likes.includes(uid);
  const tagged = products.find((p) => p.id === reel.productId);

  // Count a view once when the video first plays.
  useEffect(() => {
    const el = vidRef.current;
    if (!el) return;
    const onPlay = () => {
      if (!counted.current) {
        counted.current = true;
        incrementReelView(reel.id);
      }
    };
    el.addEventListener("play", onPlay);
    return () => el.removeEventListener("play", onPlay);
  }, [reel.id]);

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.origin + "/reels" : "";
    try {
      if (navigator.share) await navigator.share({ title: "FabricVerse", text: reel.caption, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
    } catch {
      /* dismissed */
    }
    await shareReel(reel.id).catch(() => undefined);
  }

  async function onComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !uid) return;
    const value = comment;
    setComment("");
    try {
      await addReelComment(reel.id, { uid, name }, value);
    } catch {
      setComment(value);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-fv-line bg-fv-panel">
      {/* Video */}
      <div className="relative aspect-[9/16] w-full bg-black">
        <video
          ref={vidRef}
          src={reel.video}
          className="h-full w-full object-cover"
          controls
          playsInline
          preload="metadata"
        />
        {/* Right rail actions */}
        <div className="absolute right-2 bottom-2 flex flex-col items-center gap-4">
          <button onClick={() => uid && toggleReelLike(reel.id, uid, liked).catch(() => undefined)} className="flex flex-col items-center gap-1">
            <Heart className={`h-7 w-7 ${liked ? "fill-fv-pink text-fv-pink" : "text-white drop-shadow"}`} />
            <span className="text-[11px] font-bold text-white drop-shadow">{reel.likes.length}</span>
          </button>
          <button onClick={() => setOpen((o) => !o)} className="flex flex-col items-center gap-1">
            <MessageCircle className="h-7 w-7 text-white drop-shadow" />
            <span className="text-[11px] font-bold text-white drop-shadow">{reel.comments.length}</span>
          </button>
          <button onClick={onShare} className="flex flex-col items-center gap-1">
            <Share2 className="h-7 w-7 text-white drop-shadow" />
            <span className="text-[11px] font-bold text-white drop-shadow">{reel.shares}</span>
          </button>
          <button onClick={() => setSaved((s) => !s)} className="flex flex-col items-center gap-1">
            <Bookmark className={`h-7 w-7 ${saved ? "fill-fv-pink text-fv-pink" : "text-white drop-shadow"}`} />
            <span className="text-[11px] font-bold text-white drop-shadow">{saved ? "Saved" : "Save"}</span>
          </button>
        </div>

        {/* Caption */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pb-14">
          <p className="text-sm font-semibold text-white">
            <span className="font-bold">{reel.sellerName}</span> {reel.caption}
          </p>
          <p className="text-[11px] text-white/70">{fmtTime(reel.createdAt)}</p>
        </div>
      </div>

      {/* Tagged product */}
      {tagged && (
        <Link href={`/product/${tagged.id}`} className="flex items-center gap-2 border-t border-fv-line p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-fv-pink/15">
            <ShoppingBag className="h-4 w-4 text-fv-pink" />
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-bold">{tagged.name}</span>
          <span className="text-xs font-extrabold">{naira(tagged.price)}</span>
        </Link>
      )}

      {/* Comments */}
      {open && (
        <div className="border-t border-fv-line px-3 py-2">
          {reel.comments.length === 0 && <p className="py-2 text-xs text-fv-muted">No comments yet.</p>}
          {reel.comments.map((c) => (
            <div key={c.id} className="py-1.5">
              <div className="text-xs font-bold">
                {c.name} <span className="font-normal text-fv-muted">{fmtTime(c.createdAt)}</span>
              </div>
              <div className="text-[13px] text-slate-300">{c.text}</div>
            </div>
          ))}
          {uid && (
            <form onSubmit={onComment} className="mt-2 flex items-center gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
                className="flex-1 rounded-full border border-fv-line bg-fv-bg px-3.5 py-2 text-xs text-white placeholder:text-fv-muted focus:border-fv-pink focus:outline-none"
              />
              <button type="submit" disabled={!comment.trim()} className="flex h-8 w-8 items-center justify-center rounded-full bg-fv-pink disabled:opacity-50" aria-label="Post comment">
                <Send className="h-3.5 w-3.5 text-white" />
              </button>
            </form>
          )}
          <button onClick={() => setOpen(false)} className="mt-2 flex items-center gap-1 text-[11px] text-fv-muted">
            <X className="h-3 w-3" /> Close
          </button>
        </div>
      )}
    </article>
  );
}
