"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Mic,
  ScanLine,
  TrendingDown,
  Wifi,
  Keyboard,
  ArrowRight,
  Pill,
  FileJson,
} from "lucide-react";
import { Reveal, AuroraBackground, FloatingParticles, BreathingOrb } from "./ambient";

const FEATURES = [
  { icon: Mic, label: "Voice-to-bill", desc: "Speak the bill — AI parses & fills the cart" },
  { icon: ScanLine, label: "Rx OCR", desc: "Photo a prescription → auto-map to inventory" },
  { icon: TrendingDown, label: "Predictive", desc: "Dump-stock alerts & smart reorders" },
  { icon: Wifi, label: "Offline-first", desc: "Keep billing when the net drops, auto-sync" },
  { icon: Keyboard, label: "Keyboard-first", desc: "F2 salt · F4 Rx · F8 bill · mouse-free" },
  { icon: FileJson, label: "GST e-invoice", desc: "IRN-ready JSON + e-way bill structure" },
];

export function PharmacyPromo() {
  return (
    <section id="pharmacia" className="relative overflow-hidden py-24 lg:py-32">
      <AuroraBackground variant="default" />
      <FloatingParticles count={14} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
                <Pill className="h-3.5 w-3.5" />
                New · Nexura Pharmacia
              </span>
            </Reveal>
            <Reveal delay={0.06}>
              <h2 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[3.2rem]">
                The AI pharmacy that <span className="text-gradient-warm">runs in a browser.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Voice-to-bill, prescription OCR, predictive reordering and GST e-invoicing — in a
                calm, keyboard-first web app. No heavy software to install. Open it on any computer
                or tablet and start billing in seconds. Faster, kinder, and far more valuable than
                legacy ERPs.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/pharmacy"
                  className="mat-btn mat-btn--lg mat-btn--clay group"
                  style={
                    {
                      "--mat-accent": "#3F6C51",
                      "--mat-accent-2": "#5A8F6B",
                    } as React.CSSProperties
                  }
                >
                  Launch the POS
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <span className="text-xs text-muted-foreground">
                  No install · works offline · keyboard-first
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                {FEATURES.map((f, i) => (
                  <div
                    key={f.label}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-3"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                      <f.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{f.label}</p>
                      <p className="text-[0.7rem] text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* visual */}
          <Reveal delay={0.2} y={32}>
            <PharmacyVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function PharmacyVisual() {
  return (
    <div className="relative mx-auto aspect-[5/6] w-full max-w-md">
      <BreathingOrb
        size={280}
        color="var(--sage)"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50"
      />

      {/* mock POS card */}
      <motion.div
        className="absolute inset-0 m-auto h-[88%] w-[88%] overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_30px_80px_-30px_oklch(0.4_0.05_45/0.4)]"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-semibold">Nexura Pharmacia</span>
            <span className="flex items-center gap-1 rounded-full bg-sage/25 px-2 py-0.5 text-[0.55rem]">
              <span className="h-1 w-1 rounded-full bg-sage anim-breathe" /> Live
            </span>
          </div>
        </div>
        <div className="space-y-2 p-3">
          {/* voice bar */}
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-2.5 py-1.5">
            <Mic className="h-3.5 w-3.5 text-destructive" />
            <div className="flex flex-1 items-center gap-0.5">
              {[8, 14, 6, 18, 10, 22, 12, 16, 8, 20].map((h, i) => (
                <motion.span
                  key={i}
                  className="w-1 rounded-full bg-destructive"
                  animate={{ height: [h, h + 8, h] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.06 }}
                  style={{ height: h }}
                />
              ))}
            </div>
            <span className="text-[0.55rem] text-destructive">listening</span>
          </div>
          {/* cart rows */}
          {[
            { n: "Dolo 650", b: "DOLC1", q: 2, p: 70 },
            { n: "Azithral 500", b: "AZIB2", q: 1, p: 90 },
            { n: "Cetzine", b: "CETB2", q: 1, p: 18 },
          ].map((r) => (
            <div
              key={r.n}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-2.5 py-1.5"
            >
              <div>
                <p className="text-[0.7rem] font-semibold">{r.n}</p>
                <p className="text-[0.55rem] text-muted-foreground">
                  {r.b} · {r.q} strip(s)
                </p>
              </div>
              <span className="text-[0.7rem] font-medium tabular-nums">₹{r.p}</span>
            </div>
          ))}
          {/* totals */}
          <div className="mt-2 rounded-lg bg-primary/8 p-2.5">
            <div className="flex justify-between text-[0.6rem] text-muted-foreground">
              <span>CGST + SGST</span>
              <span>₹10.68</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-[0.65rem] font-medium">Total</span>
              <span className="font-display text-xl font-bold text-primary">₹188.68</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[0.65rem] font-medium text-primary-foreground">
            Complete sale · F8
          </div>
        </div>
      </motion.div>

      {/* floating chips */}
      <motion.div
        className="absolute -left-2 top-8 w-36 rounded-xl border border-border bg-card p-2.5 shadow-xl"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      >
        <p className="text-[0.55rem] uppercase tracking-wider text-muted-foreground">
          Expiry alert
        </p>
        <p className="text-[0.7rem] font-semibold">Azithral · 3mo left</p>
        <p className="text-[0.55rem] text-clay">dump risk · high</p>
      </motion.div>

      <motion.div
        className="absolute -right-2 bottom-12 w-36 rounded-xl border border-border bg-card p-2.5 shadow-xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      >
        <p className="text-[0.55rem] uppercase tracking-wider text-muted-foreground">Reorder</p>
        <p className="text-[0.7rem] font-semibold">Augmentin · +24</p>
        <p className="text-[0.55rem] text-sage">AI suggested</p>
      </motion.div>
    </div>
  );
}
