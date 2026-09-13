"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Sparkles,
  Stethoscope,
  HeartPulse,
  Star,
  ArrowRight,
  PlayCircle,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBooking } from "./booking-context";
import { Magnetic } from "./magnetic";
import {
  BreathingOrb,
  EcgLine,
  Reveal,
  GrainOverlay,
} from "./ambient";
import { AnimatedNumber } from "./animated-number";

export function Hero() {
  const { openBooking } = useBooking();
  return (
    <section
      id="top"
      className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24 lg:pt-44 lg:pb-28"
    >
      {/* Background layers — Liquid Gold spec: calm stone canvas,
          breathing champagne aurora, ≤2% fine grain */}
      <div
        aria-hidden
        className="aurora-gold -top-40 right-[-10%] h-[30rem] w-[46rem] opacity-70"
      />
      <div
        aria-hidden
        className="aurora-gold top-1/3 left-[-12%] h-[22rem] w-[30rem] opacity-40"
        style={{ animationDelay: "-6s" }}
      />
      <GrainOverlay className="opacity-[0.02]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: copy */}
          <div className="max-w-2xl">
            <Reveal>
              <span className="badge-lux">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#A16207] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#A16207]" />
                </span>
                One OS for every layer of care
              </span>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="display-xl mt-5 text-foreground">
                A calmer{" "}
                <span className="relative inline-block">
                  <span className="text-gold-gradient">operating system</span>
                  <svg
                    className="absolute -bottom-2 left-0 w-full text-[#A16207]/45"
                    viewBox="0 0 300 12"
                    fill="none"
                    aria-hidden
                  >
                    <motion.path
                      d="M2 8 Q 75 2 150 6 T 298 5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, delay: 0.6, ease: "easeInOut" }}
                    />
                  </svg>
                </span>{" "}
                for your health.
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Nexura OS quietly listens, learns, and breathes with you —
                unifying AI diagnostics, continuous monitoring, and real human
                care into one warm, intelligent platform.
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Magnetic strength={0.4}>
                  <Button
                    onClick={() => openBooking()}
                    size="lg"
                    className="btn-gold group h-11 rounded-full px-6 text-[0.95rem] font-medium"
                  >
                    <span className="flex items-center gap-2">
                      Start your health scan
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                </Magnetic>
                <Link
                  href="/hospital"
                  className="btn-glass-lux h-11 rounded-full px-6 text-[0.95rem] font-medium"
                >
                  <PlayCircle className="h-4.5 w-4.5 text-[#A16207]" />
                  Watch the demo
                </Link>
              </div>
            </Reveal>

            {/* Quick-access to new products */}
            <Reveal delay={0.28}>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/know-your-health"
                  className="group flex items-center gap-1.5 rounded-full glass-chip px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:scale-105"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#9DB89E]" />
                  Know Your Health
                  <span className="rounded-full bg-[#9DB89E]/15 px-1.5 py-0.5 text-[0.5rem] font-bold text-[#5A7A5B]">15 AI tools</span>
                </Link>
                <Link
                  href="/connect"
                  className="group flex items-center gap-1.5 rounded-full glass-chip px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:scale-105"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-[#D98B6E]" />
                  Nexura Connect
                  <span className="rounded-full bg-[#D98B6E] px-1.5 py-0.5 text-[0.5rem] font-bold text-white">NEW</span>
                </Link>
              </div>
            </Reveal>

            {/* trust row */}
            <Reveal delay={0.32}>
              <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-honey text-honey"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <span>
                    <strong className="text-foreground">DPDP</strong>-aligned · privacy-first
                  </span>
                </div>
                <div className="hidden h-4 w-px bg-border sm:block" />
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sage" />
                  Built on HIPAA &amp; GDPR principles
                </div>
                <div className="hidden h-4 w-px bg-border sm:block" />
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-coral anim-breathe" />
                  <AnimatedNumber value={22} suffix=" apps · one OS" />
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right: visual collage */}
          <Reveal delay={0.2} y={32}>
            <HeroVisual />
          </Reveal>
        </div>
      </div>

      {/* bottom soft fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />
    </section>
  );
}

function HeroVisual() {
  // Graceful degradation: if the doctor portrait ever fails to load
  // (transient 404 during a preview sandbox restart, proxy hiccup),
  // render a warm branded gradient instead of an empty white card.
  const doctorFallback =
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 600' preserveAspectRatio='xMidYMid slice'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#F6EBE0'/><stop offset='0.55' stop-color='#EAD8C6'/><stop offset='1' stop-color='#DCC3AB'/></linearGradient><radialGradient id='o' cx='0.5' cy='0.42' r='0.5'><stop offset='0' stop-color='#AC5335' stop-opacity='0.35'/><stop offset='1' stop-color='#AC5335' stop-opacity='0'/></radialGradient><radialGradient id='s' cx='0.25' cy='0.85' r='0.45'><stop offset='0' stop-color='#9DB89E' stop-opacity='0.4'/><stop offset='1' stop-color='#9DB89E' stop-opacity='0'/></radialGradient></defs><rect width='500' height='600' fill='url(#g)'/><rect width='500' height='600' fill='url(#o)'/><rect width='500' height='600' fill='url(#s)'/><circle cx='250' cy='235' r='74' fill='none' stroke='#AC5335' stroke-opacity='0.45' stroke-width='2.5'/><path d='M175 420 Q 250 330 325 420' fill='none' stroke='#AC5335' stroke-opacity='0.45' stroke-width='2.5' stroke-linecap='round'/><circle cx='205' cy='215' r='5' fill='#AC5335' fill-opacity='0.5'/><circle cx='295' cy='215' r='5' fill='#AC5335' fill-opacity='0.5'/><path d='M225 265 Q 250 285 275 265' fill='none' stroke='#AC5335' stroke-opacity='0.5' stroke-width='2.5' stroke-linecap='round'/></svg>`
    );

  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-md sm:max-w-lg">
      {/* big breathing orb behind */}
      <BreathingOrb
        size={300}
        color="var(--coral)"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60"
      />

      {/* main doctor card */}
      <motion.div
        className="absolute inset-0 m-auto h-[88%] w-[80%] overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_30px_80px_-30px_oklch(0.4_0.05_45/0.4)]"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <img
          src="/nexura/hero-doctor.png"
          alt="Nexura OS care companion"
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
          ref={(el) => {
            // Above-the-fold portrait: hint the browser to prioritise it
            // (kept as a ref attribute so every React version stays happy).
            if (el) el.setAttribute("fetchpriority", "high");
          }}
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.startsWith("data:image/svg+xml")) {
              img.src = doctorFallback;
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.31_0.02_55_0.55)] via-transparent to-transparent" />

        {/* name plate — Liquid Glass */}
        <div className="glass-lux absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-sage/30 text-foreground">
              <Stethoscope className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Dr. Amelia Hart</p>
              <p className="text-xs text-muted-foreground">Care Companion · online</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-sage/30 px-2.5 py-1 text-[0.65rem] font-medium text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-sage anim-breathe" /> Live
          </span>
        </div>
      </motion.div>

      {/* floating chip: AI diagnosis */}
      <motion.div
        className="glass-lux absolute -left-3 top-6 w-44 rounded-2xl p-3 sm:-left-6"
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#A16207]/12 text-[#A16207]">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-[0.7rem] font-medium text-muted-foreground">
              AI risk signals
            </p>
            <p className="text-sm font-semibold">12 domains mapped</p>
          </div>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-coral to-honey"
            initial={{ width: "10%" }}
            animate={{ width: ["10%", "96%", "96%", "10%"] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.45, 0.85, 1],
            }}
          />
        </div>
      </motion.div>

      {/* floating chip: live vitals */}
      <motion.div
        className="glass-lux absolute -right-2 top-1/3 w-52 rounded-2xl p-3.5 sm:-right-6"
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[0.7rem] font-medium text-muted-foreground">
            Heart rate
          </span>
          <span className="flex items-center gap-1 text-[0.65rem] font-medium text-coral">
            <span className="h-1.5 w-1.5 rounded-full bg-coral anim-breathe" />
            streaming
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-display text-2xl font-semibold text-foreground">
            72
          </span>
          <span className="text-[0.7rem] text-muted-foreground">bpm</span>
        </div>
        <EcgLine className="mt-1" width={180} height={36} />
      </motion.div>

      {/* floating chip: care score */}
      <motion.div
        className="glass-lux absolute -bottom-3 left-4 w-40 rounded-2xl p-3 sm:left-8"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      >
        <p className="text-[0.7rem] font-medium text-muted-foreground">
          Care score
        </p>
        <div className="mt-1 flex items-end justify-between">
          <span className="font-display text-2xl font-semibold text-gradient-warm">
            A+
          </span>
          <div className="flex gap-0.5">
            {[6, 9, 5, 11, 7].map((h, i) => (
              <motion.span
                key={i}
                className="w-1 rounded-full bg-sage"
                animate={{ height: [h, h + 6, h] }}
                transition={{
                  duration: 1.6 + i * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.1,
                }}
                style={{ height: h }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
