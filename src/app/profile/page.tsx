"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Camera,
  ChevronRight,
  Headphones,
  Heart,
  LogOut,
  MapPin,
  Package,
  User,
} from "lucide-react";
import { BottomNav, Logo, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/cart";

const MENU = [
  { icon: User, label: "My Profile", sub: "Edit your name and photo", href: "/profile/edit" },
  { icon: Heart, label: "My Favorites", sub: "View your saved fabrics and products", href: "/profile/saved" },
  { icon: Package, label: "My Orders", sub: "Track and manage your orders", href: "/orders" },
  { icon: MapPin, label: "Shipping Addresses", sub: "Manage your delivery addresses", href: "/profile/addresses" },
  { icon: Headphones, label: "Customer Support", sub: "Get help and contact us", href: "/profile/support" },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { favorites } = useShop();
  const router = useRouter();
  const name = user?.displayName || user?.email?.split("@")[0] || "FabricVerse Shopper";
  const handle = "@" + (user?.email?.split("@")[0] ?? "shopper");
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <RequireAuth>
      <Screen>
        {/* Header (no stock backdrop — clean gradient) */}
        <div className="bg-gradient-to-b from-fv-purple/15 to-fv-bg">
          <header className="flex items-center justify-between px-5 pt-2 pb-4">
            <Logo size="md" />
          </header>

          {/* Identity */}
          <div className="flex items-center gap-4 px-5 pb-5">
            <Link href="/profile/edit" className="relative h-24 w-24 shrink-0" aria-label="Edit profile photo">
              <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-fv-pink to-fv-purple p-[3px]">
                <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-fv-panel">
                  {user?.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoURL} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-extrabold text-white/80">{initials}</span>
                  )}
                </span>
              </span>
              <span className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full bg-fv-pink ring-2 ring-fv-bg">
                <Camera className="h-4 w-4 text-white" />
              </span>
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-xl font-extrabold">{name}</h1>
                <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
                  <path
                    fill="#ff1e63"
                    d="M12 1.5l2.6 2.1 3.3-.3.9 3.2 2.8 1.8-1.3 3.1 1.3 3.1-2.8 1.8-.9 3.2-3.3-.3L12 22.5l-2.6-2.1-3.3.3-.9-3.2-2.8-1.8 1.3-3.1-1.3-3.1 2.8-1.8.9-3.2 3.3.3z"
                  />
                  <path fill="#fff" d="M10.6 15.9l-3-3 1.2-1.2 1.8 1.8 4.6-4.6 1.2 1.2z" />
                </svg>
              </div>
              <div className="text-sm text-fv-muted">{handle}</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-300">
                Fashion • Fabrics • Culture
                <span className="text-fv-pink">💗</span>
              </div>
            </div>

            <Link href="/profile/saved" className="flex flex-col items-center border-l border-fv-line pl-4">
              <Bookmark className="h-5 w-5 text-white" />
              <span className="mt-1 text-lg font-extrabold leading-none">{favorites.length}</span>
              <span className="text-[11px] text-fv-muted">Saved</span>
            </Link>
          </div>
        </div>

        {/* Menu */}
        <div className="mx-5 overflow-hidden rounded-2xl border border-fv-line bg-fv-panel">
          {MENU.map((m, i) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.label}
                href={m.href}
                className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-white/[0.03] ${
                  i > 0 ? "border-t border-fv-line" : ""
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fv-pink/15">
                  <Icon className="h-5 w-5 text-fv-pink" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">{m.label}</span>
                  <span className="block truncate text-xs text-fv-muted">{m.sub}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-fv-muted" />
              </Link>
            );
          })}

          {/* Log out */}
          <button onClick={onLogout} className="flex w-full items-center gap-3.5 border-t border-fv-line px-4 py-3.5 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fv-pink/15">
              <LogOut className="h-5 w-5 text-fv-pink" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">Log Out</span>
              <span className="block truncate text-xs text-fv-muted">Sign out from your account</span>
            </span>
            <ArrowRight className="h-5 w-5 text-fv-muted" />
          </button>
        </div>

        <BottomNav active="profile" />
      </Screen>
    </RequireAuth>
  );
}
