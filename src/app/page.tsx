import Link from "next/link";
import { Logo, LogoMark, Screen } from "@/components/ui";

export default function SplashPage() {
  return (
    <Screen className="relative">
      {/* No stock photo — brand gradient backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(168,85,247,0.35),transparent_60%),radial-gradient(100%_60%_at_80%_20%,rgba(255,30,99,0.30),transparent_55%)]" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-fv-bg via-fv-bg/90 to-transparent" />

      {/* Decorative fabric waves */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25">
        <LogoMark className="h-72 w-72" />
      </div>

      <div className="relative flex min-h-[100dvh] flex-col">
        <div className="mt-auto flex flex-col items-center px-6 pb-10 text-center">
          <Logo size="lg" className="drop-shadow-lg" />

          <h1 className="mt-7 text-[34px] font-extrabold leading-tight tracking-tight">
            Discover. Shop. Repeat.
          </h1>
          <p className="mt-4 max-w-[280px] text-[15px] leading-relaxed text-white/75">
            Shop from businesses &amp; individuals. Follow your style. Support
            real people.
          </p>

          <Link
            href="/onboarding"
            className="mt-9 w-full rounded-full bg-fv-pink py-4 text-[17px] font-bold text-white shadow-lg shadow-fv-pink/30 transition active:scale-[0.98]"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="mt-4 w-full rounded-full border border-white/30 py-4 text-[17px] font-semibold text-white transition active:scale-[0.98]"
          >
            I already have an account
          </Link>
        </div>
      </div>
    </Screen>
  );
}
