"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { Logo, LogoMark, Screen } from "@/components/ui";

const SLIDES = [
  {
    title: ["Fashion", "is better", "together."],
    body: "Shop from businesses & individuals. Follow your style. Support real people.",
  },
  {
    title: ["Discover", "premium", "fabrics."],
    body: "Ankara, lace, silk, cotton and more — every weave, one marketplace, live shopping daily.",
  },
];

const VIDEOS = [
  { dur: "00:28", tint: "from-fv-purple/50 to-fv-pink/30", img: "/img/onb-1.jpg" },
  { dur: "00:45", tint: "from-fv-pink/50 to-amber-500/30", price: "₦8,500", img: "/img/onb-2.jpg" },
  { dur: "00:32", tint: "from-sky-500/40 to-fv-purple/30", img: "/img/onb-3.jpg" },
];

export default function OnboardingPage() {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  const next = () => (last ? undefined : setI(i + 1));

  return (
    <Screen className="relative">
      {/* Fabric backdrop + brand gradient */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/onb-bg.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(168,85,247,0.30),transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-fv-bg/70 to-fv-bg" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-fv-bg via-fv-bg/90 to-transparent" />

      <div className="relative flex min-h-[100dvh] flex-col">

        <div className="px-6 pt-3">
          <Logo size="md" />
        </div>

        {/* Headline */}
        <div className="px-6 pt-5">
          <h1 className="text-[38px] leading-[1.05] font-extrabold tracking-tight">
            {slide.title[0]}
            <br />
            {slide.title[1]}
            <br />
            <span className="text-fv-pink">{slide.title[2]}</span>
          </h1>
          <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-white/80">
            {slide.body}
          </p>
        </div>

        {/* Video card row (placeholders until real clips are uploaded) */}
        <div className="mt-auto flex items-center justify-center gap-3 px-4 pt-4">
          {VIDEOS.map((v, idx) => {
            const center = idx === 1;
            return (
              <div
                key={v.dur}
                className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br ${v.tint} ${
                    center
                      ? "h-[178px] w-[148px] border-white/70 shadow-2xl"
                      : "h-[142px] w-[100px] border-white/25"
                  }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.img}
                  alt=""
                  className={`absolute inset-0 h-full w-full object-cover ${center ? "" : "opacity-80"}`}
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${v.tint} mix-blend-soft-light`} />
                <LogoMark className={`relative ${center ? "h-14 w-14" : "h-10 w-10"} opacity-90 drop-shadow-lg`} />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 backdrop-blur-sm">
                  <Play className="h-3 w-3 fill-white text-white" />
                  <span className="text-[11px] font-semibold text-white">
                    {v.dur}
                  </span>
                </div>
                {v.price && (
                  <div className="absolute right-2.5 bottom-2.5 rounded-full bg-fv-pink px-2.5 py-1 text-[12px] font-bold text-white">
                    {v.price}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2.5 pt-5">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`h-2.5 rounded-full transition-all ${
                idx === i ? "w-6 bg-fv-pink" : "w-2.5 bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pt-5 pb-3">
          {last ? (
            <Link
              href="/signup"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-fv-pink py-3.5 text-[17px] font-bold shadow-lg shadow-fv-pink/30 transition active:scale-[0.98]"
            >
              Get Started <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <button
              onClick={next}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-fv-pink py-3.5 text-[17px] font-bold shadow-lg shadow-fv-pink/30 transition active:scale-[0.98]"
            >
              Next <ArrowRight className="h-5 w-5" />
            </button>
          )}
          <div className="pt-3 pb-1 text-center">
            <Link
              href="/login"
              className="text-[15px] font-semibold text-white/60"
            >
              Skip
            </Link>
          </div>
        </div>
      </div>
    </Screen>
  );
}
