"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AuthShell, ErrorNote, Field, PrimaryButton } from "@/components/auth-shell";

function LoginForm() {
  const { login, configured } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
      await login(email, password);
      router.replace(next);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to keep shopping premium fabrics."
      footer={
        <>
          New to FabricVerse?{" "}
          <Link href="/signup" className="font-semibold text-fv-pink">
            Create an account
          </Link>
        </>
      }
    >
      <ErrorNote message={error} />
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
        <Field
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-sm font-semibold text-fv-pink">
            Forgot password?
          </Link>
        </div>
        <PrimaryButton type="submit" loading={loading}>
          Log In
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
