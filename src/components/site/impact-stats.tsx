"use client";

import { motion } from "framer-motion";
import {
  HeartPulse,
  Stethoscope,
  Clock,
  Globe2,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { Reveal, AuroraBackground, FloatingParticles } from "./ambient";
import { AnimatedNumber } from "./animated-number";

const STATS = [
  {
    icon: HeartPulse,
    value: 184320,
    suffix: "+",
    label: "Patients cared for",
    sub: "across 38 countries",
    accent: "var(--coral)",
  },
  {
    icon: Stethoscope,
    value: 4200,
    suffix: "",
    label: "Verified clinicians",
    sub: "in our network",
    accent: "var(--sage)",
  },
  {
    icon: Clock,
    value: 78,
    suffix: "s",
    label: "Median consult time",
    sub: "until you're seen",
    accent: "var(--honey)",
  },
  {
    icon: TrendingUp,
    value: 98.2,
    suffix: "%",
    decimals: 1,
    label: "AI diagnosis precision",
    sub: "peer-reviewed",
    accent: "var(--clay)",
  },
  {
    icon: Globe2,
    value: 40,
    suffix: "",
    label: "Partner hospitals",
    sub: "on 4 continents",
    accent: "var(--sage)",
  },
  {
    icon: ShieldCheck,
    value: 100,
    suffix: "%",
    label: "HIPAA & GDPR",
    sub: "compliant by design",
    accent: "var(--coral)",
  },
];

export function ImpactStats() {
  return (
    <section
      id="impact"
      className="relative overflow-hidden border-y border-border/60 bg-card/30 py-24 lg:py-28"
    >
      <AuroraBackground variant="default" className="opacity-50" />
      <FloatingParticles count={12} color="var(--honey)" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow">Quiet impact</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="title-lux mt-4 text-3xl sm:text-4xl lg:text-5xl">
              Measured in{" "}
              <span className="text-gold-gradient">calmer lives.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="lede-lux mt-4">
              Not vanity metrics — real outcomes, tracked ethically, with every
              patient's consent.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <StatCard {...s} />
            </Reveal>
          ))}
        </div>

        {/* soft divider with breathing line */}
        <Reveal delay={0.2}>
          <div className="mt-16 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-border" />
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sage anim-breathe" />
              live &amp; counting
            </span>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-border" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  value,
  suffix,
  label,
  sub,
  accent,
  decimals = 0,
}: (typeof STATS)[number] & { decimals?: number }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="card-lux card-lux-hover group relative overflow-hidden rounded-3xl p-6"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-50"
        style={{ background: accent }}
      />
      <div className="relative flex items-center justify-between">
        <span
          className="grid h-11 w-11 place-items-center rounded-2xl"
          style={{
            background: `color-mix(in oklch, ${accent} 16%, transparent)`,
            color: accent,
          }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <span
          className="h-1.5 w-1.5 rounded-full anim-breathe"
          style={{ background: accent }}
        />
      </div>
      <p className="stat-lux relative mt-5 text-4xl sm:text-5xl">
        <AnimatedNumber value={value} format="comma" duration={2} />
        {decimals > 0 && (
          <span className="text-2xl text-muted-foreground">
            .
            {Math.round((value % 1) * Math.pow(10, decimals))
              .toString()
              .padStart(decimals, "0")}
          </span>
        )}
        <span
          className="ml-0.5 text-2xl"
          style={{ color: accent }}
        >
          {suffix}
        </span>
      </p>
      <p className="relative mt-2 text-sm font-medium text-foreground">{label}</p>
      <p className="relative text-xs text-muted-foreground">{sub}</p>

      {/* champagne hairline that grows on hover */}
      <div
        className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
    </motion.div>
  );
}
