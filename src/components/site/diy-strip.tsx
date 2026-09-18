"use client";

/* ============================================================
   DIY FEATURED BENTO — Nexura DIY's homepage moment.
   Terracotta sprout orb over an inner aurora, FREE · NO SIGN-IN
   badge, capability chips, and a Start-the-chat CTA into /diy.
   Sits under the product grid like Clinical OS / Pharmacia's
   featured cards. Server-rendered link, zero client JS.
   ============================================================ */

import Link from "next/link";
import { Sprout, ArrowRight, ShieldCheck, MessageSquareText, TimerReset } from "lucide-react";

export function DiyStrip() {
  return (
    <section aria-labelledby="diy-strip-title" className="relative py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/diy"
          className="mat-card--clay group relative block overflow-hidden rounded-[2rem] p-7 transition-transform duration-300 hover:-translate-y-0.5 sm:p-10"
          style={{ "--mat-accent": "#4D7C0F", "--mat-accent-2": "#7BB661" } as React.CSSProperties}
        >
          {/* inner aurora */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(42rem 22rem at 82% -10%, rgba(226,154,114,0.34), transparent 62%), radial-gradient(34rem 20rem at -6% 118%, rgba(122,154,123,0.30), transparent 58%)",
            }}
          />
          <div className="relative flex flex-col items-start gap-8 sm:flex-row sm:items-center">
            {/* sprout orb */}
            <div
              aria-hidden
              className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full text-[#FFF6EA] shadow-[0_18px_34px_-14px_rgba(150,76,40,0.55)]"
              style={{
                background: "linear-gradient(160deg, #E29A72 0%, #C96F45 55%, #A95530 100%)",
              }}
            >
              <div
                className="absolute inset-0 rounded-full opacity-50 mix-blend-soft-light"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23g)'/%3E%3C/svg%3E\")",
                }}
              />
              <Sprout size={34} strokeWidth={1.7} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#B05A34] px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#FFF6EA]">
                  Free · No sign-in
                </span>
                <span className="nx-micro" style={{ color: "#8A7454" }}>
                  Nexura DIY — new
                </span>
              </div>
              <h2
                id="diy-strip-title"
                className="mt-3 font-display text-2xl font-semibold tracking-tight text-[#2E2A26] sm:text-3xl"
              >
                Tell it like it is.{" "}
                <span className="text-gradient-warm">We&apos;ll do the rest.</span>
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#6B5D4E] sm:text-[15px]">
                One chat about your situation — a safety screen, realistic timeframes and one plan
                that doesn&apos;t fight itself, all follow from what you say. Hinglish welcome. Not
                a diagnosis.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#6B5138]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E7D9C4] bg-white/70 px-3 py-1">
                  <MessageSquareText size={12} aria-hidden /> Chat-first intake
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E7D9C4] bg-white/70 px-3 py-1">
                  <ShieldCheck size={12} aria-hidden /> Deterministic safety screen
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E7D9C4] bg-white/70 px-3 py-1">
                  <TimerReset size={12} aria-hidden /> Honest timeframes
                </span>
              </div>
            </div>

            <span
              className="mat-btn mat-btn--textured mat-btn--lg shrink-0 text-sm"
              style={
                { "--mat-accent": "#4D7C0F", "--mat-accent-2": "#7BB661" } as React.CSSProperties
              }
            >
              Start the chat{" "}
              <ArrowRight
                size={15}
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
