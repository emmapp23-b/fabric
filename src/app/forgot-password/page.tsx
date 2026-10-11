"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AuthShell, ErrorNote, Field, PrimaryButton } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  const { resetPassword, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!configured) {
      setError("Firebase isn't configured yet — add its keys to .env.local.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-fv-pink">
            Back to log in
          </Link>
        </>
      }
    >
      <ErrorNote message={error} />
      {sent ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-5 text-center">
          <p className="font-bold text-emerald-300">Reset link sent!</p>
          <p className="mt-1 text-sm text-emerald-200/80">
            Check <span className="font-semibold">{email}</span> for a link to
            set a new password.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PrimaryButton type="submit" loading={loading}>
            Send Reset Link
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  );
}
