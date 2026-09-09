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
  AuroraBackground,
  FloatingParticles,
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
      {/* Background layers */}
      <AuroraBackground variant="default" />
      <FloatingParticles count={22} />
      <GrainOverlay />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: copy */}
          <div className="max-w-2xl">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Now in private beta · 40+ hospitals
              </span>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.2rem]">
                A calmer{" "}
                <span className="relative inline-block">
                  <span className="text-gradient-warm">operating system</span>
                  <svg
                    className="absolute -bottom-2 left-0 w-full text-primary/50"
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
                    className="group h-12 rounded-full bg-primary px-6 text-primary-foreground shadow-[0_14px_40px_-10px_oklch(0.70_0.145_45/0.7)] transition-all hover:shadow-[0_18px_50px_-10px_oklch(0.70_0.145_45/0.9)]"
                  >
                    <span className="flex items-center gap-2">
                      Start your health scan
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                </Magnetic>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full border-border bg-background/60 px-5 backdrop-blur"
                >
                  <Link href="#dashboard" className="flex items-center gap-2">
                    <PlayCircle className="h-4.5 w-4.5 text-primary" />
                    Watch the demo
                  </Link>
                </Button>
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
                    <strong className="text-foreground">4.9</strong> · 2.4k reviews
                  </span>
                </div>
                <div className="hidden h-4 w-px bg-border sm:block" />
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sage" />
                  HIPAA &amp; GDPR certified
                </div>
                <div className="hidden h-4 w-px bg-border sm:block" />
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-coral anim-breathe" />
                  <AnimatedNumber value={184320} suffix=" cared for" />
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
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.31_0.02_55_0.55)] via-transparent to-transparent" />

        {/* name plate */}
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl bg-white/85 px-4 py-3 backdrop-blur-md">
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
        className="absolute -left-3 top-6 w-44 rounded-2xl border border-white/60 bg-white/90 p-3 shadow-xl backdrop-blur sm:-left-6"
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-coral/15 text-coral">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-[0.7rem] font-medium text-muted-foreground">
              AI diagnosis
            </p>
            <p className="text-sm font-semibold">98.2% precision</p>
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
        className="absolute -right-2 top-1/3 w-52 rounded-2xl border border-white/60 bg-white/90 p-3.5 shadow-xl backdrop-blur sm:-right-6"
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
        className="absolute -bottom-3 left-4 w-40 rounded-2xl border border-white/60 bg-white/90 p-3 shadow-xl backdrop-blur sm:left-8"
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
