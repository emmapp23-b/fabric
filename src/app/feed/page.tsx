"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, Heart, MessageCircle, Play, Send, Share2, ShoppingBag } from "lucide-react";
import { BottomNav, Logo, Media, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { fmtTime, naira, usePosts, useProducts } from "@/lib/data";
import type { Post } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { addPostComment, sharePost, togglePostLike, togglePostSave } from "@/lib/mutations";

export default function FeedPage() {
  const { user } = useAuth();
  const { items: posts, loading } = usePosts();
  const { items: products } = useProducts();

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
        <h1 className="text-2xl font-extrabold">Feed</h1>
        <p className="mt-1 text-sm text-fv-muted">Fabric textures, videos and seller posts.</p>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-6">
        {posts.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-fv-line bg-fv-panel p-8 text-center">
            <Play className="mx-auto h-8 w-8 text-fv-muted" />
            <p className="mt-3 text-sm font-semibold">No posts yet</p>
            <p className="mt-1 text-xs text-fv-muted">Seller videos and photos will show up here.</p>
          </div>
        )}
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            uid={user?.uid ?? ""}
            name={user?.displayName || user?.email?.split("@")[0] || "Guest"}
            productName={products.find((x) => x.id === p.taggedProductId)?.name}
            productPrice={products.find((x) => x.id === p.taggedProductId)?.price}
          />
        ))}
      </div>

      <BottomNav active="explore" />
    </Screen>
    </RequireAuth>
  );
}

function PostCard({
  post,
  uid,
  name,
  productName,
  productPrice,
}: {
  post: Post;
  uid: string;
  name: string;
  productName?: string;
  productPrice?: number;
}) {
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const liked = post.likes.includes(uid);
  const saved = post.saves.includes(uid);
  const media = post.media[0];

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.origin + "/feed" : "";
    try {
      if (navigator.share) await navigator.share({ title: "FabricVerse", text: post.caption, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(url);
    } catch {
      /* dismissed */
    }
    await sharePost(post.id).catch(() => undefined);
  }

  async function onComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !uid) return;
    const value = comment;
    setComment("");
    try {
      await addPostComment(post.id, { uid, name }, value);
    } catch {
      setComment(value);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-fv-line bg-fv-panel">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-fv-pink to-fv-purple text-sm font-black text-white">
          {post.sellerName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-bold">
            {post.sellerName}
            <Badge />
          </div>
          <div className="text-[11px] text-fv-muted">{fmtTime(post.createdAt)}</div>
        </div>
      </div>

      {/* Media */}
      {media && (
        <div className="relative aspect-[4/5] w-full bg-fv-bg">
          {media.type === "video" ? (
            <video src={media.url} className="h-full w-full object-cover" controls playsInline />
          ) : (
            <Media src={media.url} alt={post.caption} />
          )}
          {media.type === "video" && (
            <span className="pointer-events-none absolute top-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
              VIDEO
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-3 py-2.5">
        <button onClick={() => uid && togglePostLike(post.id, uid, liked).catch(() => undefined)} className="flex items-center gap-1.5">
          <Heart className={`h-6 w-6 ${liked ? "fill-fv-pink text-fv-pink" : "text-white"}`} />
          <span className="text-sm font-semibold">{post.likes.length}</span>
        </button>
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5">
          <MessageCircle className="h-6 w-6 text-white" />
          <span className="text-sm font-semibold">{post.comments.length}</span>
        </button>
        <button onClick={onShare} className="flex items-center gap-1.5">
          <Share2 className="h-6 w-6 text-white" />
          <span className="text-sm font-semibold">{post.shares}</span>
        </button>
        <button onClick={() => uid && togglePostSave(post.id, uid, saved).catch(() => undefined)} className="ml-auto">
          <Bookmark className={`h-6 w-6 ${saved ? "fill-fv-pink text-fv-pink" : "text-white"}`} />
        </button>
      </div>

      {/* Caption + tagged product */}
      <div className="px-3 pb-2">
        <p className="text-sm text-slate-200">
          <span className="font-bold">{post.sellerName}</span> {post.caption}
        </p>
        {post.taggedProductId && productName && (
          <Link href={`/product/${post.taggedProductId}`} className="mt-2 flex items-center gap-2 rounded-xl border border-fv-line bg-fv-bg p-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fv-pink/15">
              <ShoppingBag className="h-4 w-4 text-fv-pink" />
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-bold">{productName}</span>
            {productPrice !== undefined && <span className="text-xs font-extrabold">{naira(productPrice)}</span>}
          </Link>
        )}
      </div>

      {/* Comments */}
      {open && (
        <div className="border-t border-fv-line px-3 py-2">
          {post.comments.map((c) => (
            <div key={c.id} className="py-1.5">
              <div className="text-xs font-bold">{c.name} <span className="font-normal text-fv-muted">{fmtTime(c.createdAt)}</span></div>
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
        </div>
      )}
    </article>
  );
}

function Badge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
      <path fill="#ff1e63" d="M12 1.5l2.6 2.1 3.3-.3.9 3.2 2.8 1.8-1.3 3.1 1.3 3.1-2.8 1.8-.9 3.2-3.3-.3L12 22.5l-2.6-2.1-3.3.3-.9-3.2-2.8-1.8 1.3-3.1-1.3-3.1 2.8-1.8.9-3.2 3.3.3z" />
      <path fill="#fff" d="M10.6 15.9l-3-3 1.2-1.2 1.8 1.8 4.6-4.6 1.2 1.2z" />
    </svg>
  );
}
