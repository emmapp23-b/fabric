"use client";

import Link from "next/link";
import { AlertTriangle, IndianRupee, Package, PackageCheck, Plus, TrendingUp, Truck } from "lucide-react";
import { naira, stockLevel, useAllOrders, useProducts } from "@/lib/data";

export default function AdminDashboard() {
  const { items: orders } = useAllOrders();
  const { items: products, loading } = useProducts(true);

  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const totalSales = paid.reduce((n, o) => n + o.totalAmount, 0);
  const pendingQuotes = orders.filter((o) => o.orderStatus === "awaiting_delivery_quote").length;
  const active = orders.filter((o) =>
    ["paid", "awaiting_dispatch", "dispatched", "in_transit", "arrived_at_destination_park", "ready_for_collection"].includes(o.orderStatus),
  ).length;
  const lowStock = products.filter((p) => stockLevel(p) !== "in").length;

  const stats = [
    { label: "Total sales (paid)", value: naira(totalSales), icon: IndianRupee, color: "text-emerald-400", bg: "bg-emerald-500/15" },
    { label: "Total orders", value: String(orders.length), icon: Package, color: "text-violet-400", bg: "bg-violet-500/15" },
    { label: "Awaiting quote", value: String(pendingQuotes), icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/15" },
    { label: "Low / out of stock", value: String(lowStock), icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/15" },
  ];

  const actions = [
    { href: "/admin/products/new", label: "Add Product", icon: Plus },
    { href: "/admin/orders", label: "Manage Orders", icon: Package },
    { href: "/admin/delivery", label: "Delivery & Waybills", icon: Truck },
    { href: "/admin/products", label: "Products & Stock", icon: PackageCheck },
  ];

  return (
    <div className="px-5 pt-4 pb-6">
      <h1 className="text-2xl font-extrabold">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">Here&apos;s what&apos;s happening with your store today.</p>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}>
                <Icon className={`h-5 w-5 ${s.color}`} />
              </span>
              <div className="mt-2.5 text-lg font-extrabold">{s.value}</div>
              <div className="text-[11px] text-slate-400">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <h2 className="mt-6 text-sm font-bold">Quick Actions</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.href} href={a.href} className="flex flex-col items-start gap-2 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
                <Icon className="h-5 w-5 text-violet-300" />
              </span>
              <span className="text-sm font-bold">{a.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Recent orders */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-bold">Recent Orders</h2>
        <Link href="/admin/orders" className="text-xs font-semibold text-violet-400">View all</Link>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {orders.slice(0, 5).map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{o.code}</div>
              <div className="truncate text-[11px] text-slate-400">{o.customerName || "Customer"} • {o.totalYards} yards</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-extrabold">{naira(o.totalAmount)}</div>
              <div className="text-[10px] uppercase text-slate-500">{o.orderStatus.replace(/_/g, " ")}</div>
            </div>
          </Link>
        ))}
        {orders.length === 0 && !loading && (
          <p className="rounded-xl border border-dashed border-white/10 px-3.5 py-6 text-center text-xs text-slate-500">
            No orders yet.
          </p>
        )}
      </div>
    </div>
  );
}
