"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, FileText, Flame, Image, LogOut, Package, Rss, Settings, Truck, Users, Video } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useAdmin } from "@/lib/admin";

export default function AdminMorePage() {
  const { logout } = useAuth();
  const { isAdmin } = useAdmin();
  const router = useRouter();

  const links = [
    { href: "/admin", label: "Dashboard", sub: "Sales, orders & stock overview", icon: BarChart3 },
    { href: "/admin/orders", label: "Orders", sub: "Manage customer orders", icon: Package },
    { href: "/admin/delivery", label: "Delivery & Waybills", sub: "Quotes, dispatch & tracking", icon: Truck },
    { href: "/admin/products", label: "Products & Stock", sub: "Add fabrics, set price & yards", icon: FileText },
    { href: "/admin/banners", label: "Cover Images", sub: "Home banner images (tap-through)", icon: Image },
    { href: "/admin/categories", label: "Categories", sub: "Add fabric category circles", icon: Flame },
    { href: "/admin/reels", label: "Reels", sub: "Post fabric videos to watch", icon: Video },
    { href: "/feed", label: "Feed", sub: "Seller posts & videos", icon: Rss },
    { href: "/live", label: "Live", sub: "Live shopping session", icon: Users },
  ];

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="px-5 pt-4 pb-6">
      <h1 className="text-2xl font-extrabold">More</h1>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        {links.map((l, i) => {
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href} className={`flex items-center gap-3.5 px-4 py-3.5 ${i > 0 ? "border-t border-white/5" : ""}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15">
                <Icon className="h-5 w-5 text-violet-400" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold">{l.label}</span>
                <span className="block truncate text-xs text-slate-400">{l.sub}</span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3.5 px-4 py-3.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15">
            <Settings className="h-5 w-5 text-violet-400" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Store Settings</span>
            <span className="block truncate text-xs text-slate-400">Payment, delivery & business info</span>
          </span>
        </div>
        <button onClick={onLogout} className="flex w-full items-center gap-3.5 border-t border-white/5 px-4 py-3.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
            <LogOut className="h-5 w-5 text-red-400" />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[15px] font-bold">Log Out</span>
            <span className="block truncate text-xs text-slate-400">Sign out of the admin panel</span>
          </span>
        </button>
      </div>

      {!isAdmin && (
        <p className="mt-4 text-[11px] text-slate-500">You don&apos;t have admin access.</p>
      )}
    </div>
  );
}
