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
      {/* Background layers — Liquid Gold spec + MATERIAL SPECTRUM:
          champagne auroras plus a masked multi-color mesh
          (violet / teal / rose / sage) so the hero breathes in
          every material hue without losing the warm canvas */}
      <div
        aria-hidden
        className="aurora-gold -top-40 right-[-10%] h-[30rem] w-[46rem] opacity-70"
      />
      <div
        aria-hidden
        className="aurora-gold top-1/3 left-[-12%] h-[22rem] w-[30rem] opacity-40"
        style={{ animationDelay: "-6s" }}
      />
      <div
        aria-hidden
        className="anim-aurora pointer-events-none absolute -top-24 left-1/2 h-[34rem] w-[64rem] -translate-x-1/2 opacity-[0.5] [mask-image:radial-gradient(58%_58%_at_50%_38%,black,transparent)]"
        style={{
          background:
            "radial-gradient(at 18% 30%, color-mix(in srgb, #6D28D9 16%, transparent) 0%, transparent 44%), radial-gradient(at 78% 18%, color-mix(in srgb, #0E7490 15%, transparent) 0%, transparent 42%), radial-gradient(at 88% 68%, color-mix(in srgb, #BE123C 11%, transparent) 0%, transparent 40%), radial-gradient(at 12% 74%, color-mix(in srgb, #4D7C0F 12%, transparent) 0%, transparent 42%), radial-gradient(at 50% 50%, color-mix(in srgb, #C88A1F 13%, transparent) 0%, transparent 46%)",
        }}
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
                  <button
                    type="button"
                    onClick={() => openBooking()}
                    className="mat-btn mat-btn--lg mat-btn--textured group h-11 px-7 text-[0.95rem]"
                    style={{ "--mat-accent": "#A16207", "--mat-accent-2": "#C88A1F" } as React.CSSProperties}
                  >
                    Start your health scan
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
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
                  className="group relative flex items-center gap-1.5 overflow-hidden rounded-full border px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:scale-105"
                  style={{
                    borderColor: "color-mix(in srgb, #C2410C 32%, transparent)",
                    background: "linear-gradient(120deg, color-mix(in srgb, #C2410C 8%, white 82%), color-mix(in srgb, #EA580C 6%, white 88%))",
                    backgroundSize: "220% 220%",
                    animation: "mat-aurora-shift 6s ease-in-out infinite",
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#C2410C]" />
                  Know Your Health
                  <span className="rounded-full bg-[#C2410C]/12 px-1.5 py-0.5 text-[0.5rem] font-bold text-[#9A3412]">15 AI tools</span>
                </Link>
                <Link
                  href="/connect"
                  className="group relative flex items-center gap-1.5 overflow-hidden rounded-full border border-transparent bg-[linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(135deg,#D97706,#B45309_55%,#F59E0B)_border-box] px-3.5 py-2 text-xs font-medium text-foreground shadow-[0_0_14px_-4px_color-mix(in_srgb,#B45309_45%,transparent)] transition-all hover:scale-105 hover:shadow-[0_0_22px_-4px_color-mix(in_srgb,#B45309_60%,transparent)]"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-[#B45309]" />
                  Nexura Connect
                  <span className="rounded-full bg-[#B45309] px-1.5 py-0.5 text-[0.5rem] font-bold text-white">NEW</span>
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
      {/* rotating spectrum halo — gold → violet → teal → crimson, forever */}
      <div aria-hidden className="hero-halo" />

      {/* counter-rotating orbit rings, each carrying a glowing satellite */}
      <div aria-hidden className="hero-orbit">
        <span className="hero-sat hero-sat--gold" />
      </div>
      <div aria-hidden className="hero-orbit hero-orbit--b">
        <span className="hero-sat hero-sat--teal" />
      </div>

      {/* big breathing orb behind */}
      <BreathingOrb
        size={300}
        color="var(--coral)"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60"
      />

      {/* twinkling sparks — tiny gold stars scattered around the frame */}
      <span aria-hidden className="hero-spark left-[10%] top-[4%]" />
      <span aria-hidden className="hero-spark right-[6%] top-[15%]" style={{ animationDelay: "-1.2s" }} />
      <span aria-hidden className="hero-spark bottom-[14%] left-[4%]" style={{ animationDelay: "-2.1s" }} />
      <span aria-hidden className="hero-spark bottom-[4%] right-[15%]" style={{ animationDelay: "-3s" }} />
      <span aria-hidden className="hero-spark left-[24%] top-[47%] h-1 w-1" style={{ animationDelay: "-0.6s" }} />

      {/* main doctor card — gold-ringed, sheen-swept */}
      <motion.div
        className="absolute inset-0 m-auto h-[88%] w-[80%] overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_34px_90px_-30px_oklch(0.4_0.06_45/0.45),0_0_0_1px_color-mix(in_srgb,#C88A1F_22%,transparent)]"
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
        {/* gold inset hairline + soft top light */}
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-[#C88A1F]/30" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/30 to-transparent" />
        {/* endless specular sheen sweep */}
        <div aria-hidden className="hero-sheen" />

        {/* name plate — Liquid Glass w/ gold ring
            (inline position beats .glass-lux's unlayered `position: relative`,
             which would otherwise cancel the `absolute` utility and clip
             the plate below the card's overflow edge) */}
        <div
          className="glass-lux absolute inset-x-4 bottom-4 z-[3] flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
          style={{ position: "absolute" }}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-sage/30 text-foreground ring-1 ring-[#C88A1F]/40">
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

      {/* DPDP privacy seal — glass disc inside a rotating gold dashed ring */}
      <motion.div
        className="absolute right-[3%] top-[1%] grid h-16 w-16 place-items-center"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
      >
        <span aria-hidden className="hero-seal-ring" />
        <span
          title="Privacy-first · DPDP aligned"
          className="grid h-12 w-12 place-items-center rounded-full border border-[#C88A1F]/30 bg-white/70 text-[#A16207] shadow-[0_10px_22px_-10px_rgba(161,98,7,0.55)] backdrop-blur-md dark:bg-[#241E14]/70 dark:text-[#E3C77E]"
        >
          <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
        </span>
      </motion.div>

      {/* floating chip: AI diagnosis — neon amber */}
      <motion.div
        className="mat-chip mat-chip--neon absolute -left-3 top-6 w-44 rounded-2xl p-3 sm:-left-6"
        style={{ "--mat-accent": "#B45309", "--mat-accent-2": "#F59E0B" } as React.CSSProperties}
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#F59E0B] to-[#B45309] text-white shadow-[0_6px_14px_-6px_rgba(180,83,9,0.7)] ring-1 ring-white/30">
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
            className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#B45309]"
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

      {/* floating chip: live vitals — crimson glass */}
      <motion.div
        className="mat-chip mat-chip--glass absolute -right-2 top-1/3 w-52 rounded-2xl p-3.5 sm:-right-6"
        style={{ "--mat-accent": "#BE123C", "--mat-accent-2": "#F43F5E" } as React.CSSProperties}
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[0.7rem] font-medium text-muted-foreground">
            Heart rate
          </span>
          <span className="flex items-center gap-1 text-[0.65rem] font-medium text-[#BE123C]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#BE123C] anim-breathe" />
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

      {/* floating chip: care score — rose clay */}
      <motion.div
        className="mat-chip mat-chip--clay absolute -bottom-3 left-4 w-40 rounded-2xl p-3 sm:left-8"
        style={{ "--mat-accent": "#9F5B6B", "--mat-accent-2": "#C48B9F" } as React.CSSProperties}
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
                className="w-1 rounded-full bg-[#9F5B6B]"
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
