"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Activity,
  HeartHandshake,
  Video,
  Pill,
  BellRing,
} from "lucide-react";
import { Reveal, AuroraBackground, FloatingParticles } from "./ambient";

const FEATURES = [
  {
    icon: Brain,
    title: "AI diagnostics",
    desc: "Multi-modal models cross-reference symptoms, imaging, and history to surface earlier, calmer insight.",
    accent: "var(--coral)",
    tag: "98.2% precision",
  },
  {
    icon: Activity,
    title: "Continuous monitoring",
    desc: "Wearables stream vitals to a private mesh — your care team is alerted before you ever feel unwell.",
    accent: "var(--sage)",
    tag: "24/7 streaming",
  },
  {
    icon: HeartHandshake,
    title: "Living care plans",
    desc: "Care plans that adapt to your sleep, stress, and recovery — written with you, not at you.",
    accent: "var(--honey)",
    tag: "Adaptive",
  },
  {
    icon: Video,
    title: "Telemedicine",
    desc: "Connect to verified clinicians in under 90 seconds, with AI scribing every visit into your record.",
    accent: "var(--clay)",
    tag: "Avg 78s",
  },
  {
    icon: Pill,
    title: "Pharmacy sync",
    desc: "Prescriptions, refills, and interactions checked in real time — delivered the same day.",
    accent: "var(--coral)",
    tag: "Same-day",
  },
  {
    icon: BellRing,
    title: "Gentle nudges",
    desc: "Thoughtful reminders that learn your rhythm. No noise — only the right nudge at the right moment.",
    accent: "var(--sage)",
    tag: "Quiet by design",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 lg:py-32">
      <AuroraBackground variant="sage" className="opacity-60" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-coral anim-breathe" />
              The platform
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              One warm system,{" "}
              <span className="text-gradient-warm">six gentle superpowers.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-4 text-muted-foreground sm:text-lg">
              Each capability is designed to reduce noise and increase trust —
              the operating system your body would choose.
            </p>
          </Reveal>
        </div>

        {/* Grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <FeatureCard {...f} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  accent,
  tag,
}: (typeof FEATURES)[number]) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="group relative h-full overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[0_1px_0_0_oklch(1_0_0/0.7)_inset,0_10px_30px_-18px_oklch(0.4_0.05_45/0.2)]"
    >
      {/* hover glow */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between">
        <span
          className="grid h-12 w-12 place-items-center rounded-2xl"
          style={{
            background: `color-mix(in oklch, ${accent} 18%, transparent)`,
            color: accent,
          }}
        >
          <Icon className="h-5.5 w-5.5" strokeWidth={1.8} />
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-[0.65rem] font-medium"
          style={{
            background: `color-mix(in oklch, ${accent} 14%, transparent)`,
            color: accent,
          }}
        >
          {tag}
        </span>
      </div>

      <h3 className="relative mt-5 font-display text-xl font-semibold tracking-tight">
        {title}
      </h3>
      <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>

      <div className="relative mt-5 flex items-center gap-2 text-sm font-medium text-foreground/70">
        <span
          className="h-px flex-1 origin-left scale-x-100 bg-gradient-to-r from-transparent to-transparent transition-all duration-300 group-hover:from-transparent"
          style={{ backgroundImage: `linear-gradient(to right, ${accent}, transparent)` }}
        />
        <span
          className="transition-colors"
          style={{ color: "inherit" }}
        >
          Learn more →
        </span>
      </div>
    </motion.article>
  );
}
