"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, Screen } from "@/components/ui";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Screen>
      <div className="px-5 pt-2 pb-4">
        <Link href="/" aria-label="Home">
          <Logo size="md" />
        </Link>
      </div>

      <div className="flex-1 px-5">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-fv-muted">{subtitle}</p>}

        <div className="mt-7 flex flex-col gap-4">{children}</div>
      </div>

      {footer && <div className="px-5 pb-8 pt-6 text-center text-sm text-fv-muted">{footer}</div>}
    </Screen>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-slate-300">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-fv-line bg-fv-panel px-4 py-3.5 text-[15px] text-white placeholder:text-fv-muted focus:border-fv-pink focus:outline-none"
      />
    </label>
  );
}

export function PrimaryButton({
  loading,
  children,
  ...props
}: { loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="w-full rounded-full bg-fv-pink py-4 text-[17px] font-bold text-white shadow-lg shadow-fv-pink/30 transition active:scale-[0.98] disabled:opacity-60"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          Please wait…
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {message}
    </p>
  );
}
