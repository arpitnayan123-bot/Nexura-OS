"use client";

import { motion } from "framer-motion";
import { ClipboardList, Stethoscope, Sparkles } from "lucide-react";
import { Reveal, AuroraBackground } from "./ambient";

const STEPS = [
  {
    icon: ClipboardList,
    n: "01",
    title: "Share your story",
    desc: "A 4-minute guided intake — symptoms, history, lifestyle, worries. No forms, just a conversation.",
  },
  {
    icon: Stethoscope,
    n: "02",
    title: "Meet your care team",
    desc: "We match you to clinicians and a 24/7 AI companion tuned to your conditions and rhythms.",
  },
  {
    icon: Sparkles,
    n: "03",
    title: "Live well, every day",
    desc: "Continuous monitoring, adaptive plans, and calm nudges keep you ahead of your health.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative overflow-hidden py-24 lg:py-28">
      <AuroraBackground variant="honey" className="opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-honey anim-breathe" />
                How it works
              </span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.9rem]">
                Care begins with a <span className="text-gradient-warm">quiet conversation.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-4 max-w-md text-muted-foreground">
                Three calm steps stand between you and a health companion that never sleeps and
                never overwhelms.
              </p>
            </Reveal>
          </div>

          <div className="relative">
            {/* connecting line */}
            <div
              className="pointer-events-none absolute left-[2.15rem] top-8 h-[calc(100%-4rem)] w-px bg-gradient-to-b from-coral/40 via-honey/40 to-sage/40"
              aria-hidden
            />
            <div className="space-y-5">
              {STEPS.map((s, i) => (
                <Reveal key={s.n} delay={i * 0.08}>
                  <Step {...s} />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ icon: Icon, n, title, desc }: (typeof STEPS)[number]) {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      className="group relative flex items-start gap-4 rounded-2xl border border-transparent bg-card/60 p-4 transition-colors hover:border-border"
    >
      <div className="relative grid h-[4.3rem] w-[4.3rem] shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-card to-background shadow-[0_10px_30px_-12px_oklch(0.4_0.05_45/0.25)]">
        <Icon className="h-6 w-6 text-primary" strokeWidth={1.8} />
        <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-[0.65rem] font-semibold text-primary-foreground shadow">
          {n}
        </span>
        <span className="absolute inset-0 rounded-2xl ring-1 ring-primary/15" />
      </div>
      <div className="pt-1">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </motion.div>
  );
}
