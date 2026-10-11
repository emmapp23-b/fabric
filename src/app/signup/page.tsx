"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AuthShell, ErrorNote, Field, PrimaryButton } from "@/components/auth-shell";

export default function SignupPage() {
  const { signUp, requestOtp, configured } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
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
      await signUp(name, email, password);
      // Account exists — now verify the email with a code.
      await requestOtp(email);
      router.replace(`/otp?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create account"
      subtitle="Join FabricVerse and discover premium fabrics."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-fv-pink">
            Log in
          </Link>
        </>
      }
    >
      <ErrorNote message={error} />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label="Full name"
          required
          autoComplete="name"
          placeholder="Blessing Ade"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PrimaryButton type="submit" loading={loading}>
          Sign Up
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}
