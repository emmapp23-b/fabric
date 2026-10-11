import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Brand mark: gradient wave + Fabric(white)Verse(pink)                */
/* ------------------------------------------------------------------ */

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="fv-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b2fe8" />
          <stop offset="55%" stopColor="#d81fa0" />
          <stop offset="100%" stopColor="#ff1e63" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke="url(#fv-grad)"
        strokeWidth="8"
        strokeLinecap="round"
      >
        <path d="M8 34 C16 44, 24 24, 34 32 C42 38, 50 30, 56 34" />
        <path d="M8 22 C16 32, 24 12, 34 20 C42 26, 50 18, 56 22" />
        <path d="M12 10 C19 18, 26 2, 35 9 C42 14, 49 8, 55 11" />
      </g>
    </svg>
  );
}

export function Logo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const map = {
    sm: { mark: "h-5 w-5", text: "text-lg" },
    md: { mark: "h-7 w-7", text: "text-2xl" },
    lg: { mark: "h-12 w-12", text: "text-5xl" },
  }[size];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={map.mark} />
      <span
        className={`font-extrabold tracking-tight ${map.text} leading-none`}
      >
        <span className="text-white">Fabric</span>
        <span className="text-fv-pink">Verse</span>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Phone-width screen shell                                            */
/* ------------------------------------------------------------------ */

export function Screen({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col overflow-x-hidden bg-fv-bg text-white">
      {children}
    </div>
  );
}

export function HomeIndicator() {
  return (
    <div className="flex justify-center pt-2 pb-2">
      <div className="h-[5px] w-32 rounded-full bg-white/80" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom navigation                                                   */
/* ------------------------------------------------------------------ */

const NAV = [
  { href: "/home", label: "Home", icon: IconHome },
  { href: "/explore", label: "Explore", icon: IconCompass },
  { href: "/reels", label: "Reels", icon: IconPlay },
  { href: "/orders", label: "Orders", icon: IconBag },
  { href: "/profile", label: "Profile", icon: IconUser },
];

export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="sticky bottom-0 z-40 mt-auto w-full border-t border-fv-line bg-fv-bg/95 backdrop-blur-md">
      <div className="flex items-stretch justify-around px-2 pt-2.5">
        {NAV.map((item) => {
          const on = item.label.toLowerCase() === active;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-16 flex-col items-center gap-1 pb-1 text-[11px] font-medium transition-colors ${
                on ? "text-fv-pink" : "text-slate-400"
              }`}
            >
              <Icon className="h-6 w-6" active={on} />
              <span>{item.label}</span>
              <span
                className={`h-[3px] w-5 rounded-full transition-opacity ${
                  on ? "bg-fv-pink opacity-100" : "opacity-0"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */

export function SectionHead({
  icon,
  title,
  action = "View All",
  href,
}: {
  icon: ReactNode;
  title: string;
  action?: string;
  href?: string;
}) {
  const inner = (
    <>
      {action}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </>
  );
  return (
    <div className="mb-3 flex items-center justify-between px-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className="text-fv-pink">{icon}</span>
        {title}
      </h2>
      {href ? (
        <Link href={href} className="flex items-center gap-1 text-[13px] font-semibold text-fv-pink">
          {inner}
        </Link>
      ) : (
        <button className="flex items-center gap-1 text-[13px] font-semibold text-fv-pink">{inner}</button>
      )}
    </div>
  );
}

export function ProductImage({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 430px) 50vw, 200px"
      className={`object-cover ${className}`}
    />
  );
}

/**
 * Renders the product/category image when one exists (Cloudinary URL from
 * Firestore); otherwise a fabric-themed gradient placeholder. Never shows
 * bundled stock photos.
 */
export function Media({
  src,
  alt,
  className = "",
  icon,
}: {
  src: string;
  alt: string;
  className?: string;
  icon?: ReactNode;
}) {
  const remote = /^https?:\/\//.test(src) || src.startsWith("data:");
  if (remote) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 430px) 50vw, 200px"
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-label={alt}
      role="img"
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-fv-purple/40 via-fv-pink/25 to-fv-panel ${className}`}
    >
      {icon ?? <LogoMark className="h-1/3 w-1/3 opacity-70" />}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Icons (stroke-based, match reference)                               */
/* ------------------------------------------------------------------ */

type IconProps = { className?: string; active?: boolean };

function stroke(active?: boolean) {
  return active ? 2.4 : 2;
}

export function IconHome({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={stroke(active)} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function IconCompass({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={stroke(active)} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.2 5-5 2.2 2.2-5z" />
    </svg>
  );
}

export function IconBag({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={stroke(active)} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

export function IconUser({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={stroke(active)} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.2-3.5 4-5.5 7.5-5.5s6.3 2 7.5 5.5" />
    </svg>
  );
}

export function IconPlay({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={stroke(active)} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M10 8.5v7l6-3.5z" fill="currentColor" />
    </svg>
  );
}
