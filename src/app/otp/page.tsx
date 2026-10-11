"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AuthShell, ErrorNote, PrimaryButton } from "@/components/auth-shell";

function OtpForm() {
  const { verifyOtp, requestOtp } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const code = digits.join("");

  function setDigit(i: number, value: string) {
    const v = value.replace(/\D/g, "");
    if (!v) {
      const next = [...digits];
      next[i] = "";
      setDigits(next);
      return;
    }
    const next = [...digits];
    // support paste of a full code
    if (v.length > 1) {
      v.split("").slice(0, 6 - i).forEach((ch, k) => (next[i + k] = ch));
      setDigits(next);
      refs.current[Math.min(i + v.length, 5)]?.focus();
      return;
    }
    next[i] = v;
    setDigits(next);
    refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (code.length < 6) {
      setError("Enter all 6 digits.");
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(email, code);
      router.replace("/home");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  async function resend() {
    setError("");
    setNotice("");
    try {
      await requestOtp(email);
      setNotice("A new code is on its way.");
      setCooldown(30);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!email) {
    return (
      <AuthShell title="Verify email" footer={<Link href="/signup" className="font-semibold text-fv-pink">Sign up again</Link>}>
        <ErrorNote message="We couldn't find your email. Start from sign up." />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Check your inbox"
      subtitle={`We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
      footer={
        <>
          Wrong email?{" "}
          <Link href="/signup" className="font-semibold text-fv-pink">
            Start over
          </Link>
        </>
      }
    >
      <ErrorNote message={error} />
      {notice && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <div className="flex justify-between gap-2" dir="ltr">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              inputMode="numeric"
              maxLength={6}
              aria-label={`Digit ${i + 1}`}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className="h-16 w-full rounded-2xl border border-fv-line bg-fv-panel text-center text-2xl font-extrabold text-white focus:border-fv-pink focus:outline-none"
            />
          ))}
        </div>

        <PrimaryButton type="submit" loading={loading}>
          Verify & Continue
        </PrimaryButton>
      </form>

      <div className="pt-2 text-center text-sm">
        {cooldown > 0 ? (
          <span className="text-fv-muted">Resend in {cooldown}s</span>
        ) : (
          <button onClick={resend} className="font-semibold text-fv-pink">
            Resend code
          </button>
        )}
      </div>
    </AuthShell>
  );
}

export default function OtpPage() {
  return (
    <Suspense>
      <OtpForm />
    </Suspense>
  );
}
