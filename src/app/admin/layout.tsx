"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BarChart3, Home, MoreHorizontal, Package, Truck } from "lucide-react";
import { Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { RequireAdmin } from "@/lib/admin";

const NAV = [
  { href: "/admin", label: "Home", icon: Home, exact: true },
  { href: "/admin/orders", label: "Orders", icon: Package },
  { href: "/admin/products", label: "Products", icon: BarChart3 },
  { href: "/admin/delivery", label: "Delivery", icon: Truck },
  { href: "/admin/more", label: "More", icon: MoreHorizontal },
];

function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-40 mt-auto w-full border-t border-white/10 bg-[#0a0713]/95 backdrop-blur-md">
      <div className="flex items-stretch justify-around px-2 pt-2.5">
        {NAV.map((item) => {
          const on = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-16 flex-col items-center gap-1 pb-1 text-[11px] font-medium transition-colors ${
                on ? "text-violet-400" : "text-slate-400"
              }`}
            >
              <Icon className="h-6 w-6" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    // RequireAuth/RequireAdmin call usePathname (runtime URL data) — a
    // Suspense boundary is required for prerendering in this Next version.
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0713]">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <RequireAuth>
        <RequireAdmin>
          <Screen className="bg-[#0a0713]">
            <div className="flex flex-1 flex-col">{children}</div>
            <Suspense fallback={<div className="h-16" />}>
              <AdminNav />
            </Suspense>
          </Screen>
        </RequireAdmin>
      </RequireAuth>
    </Suspense>
  );
}
