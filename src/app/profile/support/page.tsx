"use client";

import Link from "next/link";
import { ChevronLeft, Headphones, Mail, MessageCircle, Phone } from "lucide-react";
import { BottomNav, Logo, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";

const CONTACTS = [
  { icon: MessageCircle, label: "Chat with us", sub: "Instant help in the app", href: "https://wa.me/2348000000000" },
  { icon: Phone, label: "Call support", sub: "Mon–Sat, 8am–6pm", href: "tel:+2348000000000" },
  { icon: Mail, label: "Email us", sub: "support@fabricverse.com.ng", href: "mailto:support@fabricverse.com.ng" },
];

export default function SupportPage() {
  return (
    <RequireAuth>
      <Screen>
        <header className="flex items-center gap-3 px-5 pt-2 pb-3">
          <Link href="/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-fv-panel" aria-label="Back">
            <ChevronLeft className="h-5 w-5 text-white" />
          </Link>
          <Logo size="md" />
        </header>

        <div className="px-5 pb-3">
          <h1 className="text-2xl font-extrabold">Customer Support</h1>
          <p className="mt-1 text-sm text-fv-muted">We&apos;re here to help.</p>
        </div>

        <div className="flex flex-col gap-3 px-5 pb-6">
          {CONTACTS.map((c) => {
            const Icon = c.icon;
            return (
              <a
                key={c.label}
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-fv-line bg-fv-panel p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fv-pink/15">
                  <Icon className="h-5 w-5 text-fv-pink" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold">{c.label}</div>
                  <p className="truncate text-xs text-fv-muted">{c.sub}</p>
                </div>
              </a>
            );
          })}

          <div className="flex items-center gap-3 rounded-2xl border border-fv-line bg-fv-panel p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fv-pink/15">
              <Headphones className="h-5 w-5 text-fv-pink" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold">Order help</div>
              <p className="truncate text-xs text-fv-muted">Have an issue? Quote your order number.</p>
            </div>
          </div>
        </div>

        <BottomNav active="profile" />
      </Screen>
    </RequireAuth>
  );
}
