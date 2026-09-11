"use client";

/* ============================================================
 * FORESIGHT LANDING — cinematic hero, the reactive-vs-
 * predictive argument, the 12-domain map preview, safety strip.
 * ============================================================ */

import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, HeartPulse, MoonStar, ShieldCheck, Sparkles, Wind, UtensilsCrossed, Dna, Activity } from "lucide-react";
import { Eyebrow, GlassCard, Ornament, fadeUp } from "./ui";

const SIGNAL_SOURCES = [
  { icon: Activity, label: "Symptoms", sub: "40+ patterns, severity-weighted" },
  { icon: UtensilsCrossed, label: "Diet", sub: "mithai · fried · rice/roti · salt" },
  { icon: Dna, label: "Body & BMI", sub: "South-Asian bands start at 23" },
  { icon: HeartPulse, label: "Vitals & labs", sub: "BP · sugar · HbA1c · thyroid…" },
  { icon: MoonStar, label: "Sleep", sub: "hours · snoring · daytime dozes" },
  { icon: Wind, label: "Environment", sub: "your city's air quality load" },
];

export function Landing({
  onStart, onHistory, hasHistory,
}: {
  onStart: () => void;
  onHistory: () => void;
  hasHistory: boolean;
}) {
  return (
    <div className="space-y-16 pb-6">
      {/* ---------------- HERO ---------------- */}
      <section className="relative pt-10 text-center sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
        >
          <Eyebrow className="mb-4">Nexura Predictive 2.0 · Health Foresight Engine</Eyebrow>
          <h1 className="mx-auto max-w-3xl font-display text-[2.5rem] font-semibold leading-[1.08] tracking-tight nxf-hi sm:text-6xl">
            Healthcare is Reactive.
            <span className="nxf-goldgrad mt-1 block">
              But Nexura is Predictive.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed nxf-dim sm:text-base">
            Share your symptoms, diet, BMI, fitness, sleep and history — Nexura maps
            twelve disease-risk domains into one honest picture of where your health
            is heading, and exactly what would change its course. Built for Indian bodies.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button type="button" className="nxf-cta" onClick={onStart}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Map My Health Future
            </button>
            {hasHistory && (
              <button type="button" className="nxf-cta nxf-cta-ghost" onClick={onHistory}>
                My history
              </button>
            )}
          </div>
          <p className="mt-4 text-[12px] nxf-mute">
            Free · anonymous session · delete everything anytime · not a medical device
          </p>
          {/* figma-style stat strip — precision-design signature */}
          <p className="nxf-mono mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.22em] nxf-gold-soft">
            <span aria-hidden="true" className="nxf-glyph-glow">✦</span> 12 risk domains
            <span aria-hidden="true" className="nxf-glyph-glow">✦</span> 60+ factors
            <span aria-hidden="true" className="nxf-glyph-glow">✦</span> live what-if studio
            <span aria-hidden="true" className="nxf-glyph-glow">✦</span> 5-year horizon
            <span aria-hidden="true" className="nxf-glyph-glow">✦</span> EN · हिंदी
          </p>
        </motion.div>

        {/* animated scroll cue */}
        <motion.div
          className="mt-12 flex justify-center"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <ChevronDown className="h-5 w-5 text-amber-300/80" />
        </motion.div>
        <Ornament label="Precision · Clarity · Calm" className="mt-8" />
      </section>

      {/* ---------------- REACTIVE VS PREDICTIVE ---------------- */}
      <motion.section {...fadeUp} className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.04] p-6">
          <Eyebrow className="mb-3">The world today — reactive</Eyebrow>
          <p className="font-display text-xl font-semibold nxf-hi">Wait for the disease. Then pay anything.</p>
          <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed nxf-dim">
            <li>· Diabetes is found at 8 mmol/L — a decade after the rotis started it</li>
            <li>· BP is diagnosed in an emergency ward, at 180/110</li>
            <li>· Fatty liver is "discovered" on an ultrasound booked for something else</li>
            <li>· India: ~101 million people with diabetes, 315 million with hypertension — most found late</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-teal-400/25 bg-teal-400/[0.05] p-6">
          <Eyebrow className="mb-3">The Nexura way — predictive</Eyebrow>
          <p className="font-display text-xl font-semibold nxf-hi">Read the pattern years before the diagnosis.</p>
          <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed nxf-dim">
            <li>· Twelve risk domains, scored from everything you share — visibly, explainably</li>
            <li>· Emergency screening always runs first; missing data is shown honestly</li>
            <li>· A five-year slope you can bend — with a plan in Indian kitchens and katoris</li>
            <li>· One tap: a doctor-ready summary of signals, tests and questions</li>
          </ul>
        </div>
      </motion.section>

      {/* ---------------- SIGNAL SOURCES ---------------- */}
      <motion.section {...fadeUp}>
        <div className="mb-6 text-center">
          <Eyebrow className="mb-2">What the engine reads</Eyebrow>
          <h2 className="font-display text-2xl font-semibold tracking-tight nxf-hi sm:text-3xl">
            Seven layers of you, one trajectory
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SIGNAL_SOURCES.map((s, i) => (
            <GlassCard key={s.label} className="p-4 text-center" transition={{ duration: 0.5, delay: i * 0.06 }}>
              <s.icon className="mx-auto h-5 w-5 nxf-teal" aria-hidden="true" />
              <p className="mt-2 text-[13px] font-semibold nxf-hi">{s.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed nxf-mute">{s.sub}</p>
            </GlassCard>
          ))}
        </div>
      </motion.section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <motion.section {...fadeUp}>
        <div className="mb-6 text-center">
          <Eyebrow className="mb-2">The flow</Eyebrow>
          <h2 className="font-display text-2xl font-semibold tracking-tight nxf-hi sm:text-3xl">Four minutes that read your next five years</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { n: "01", t: "Share", d: "A guided 10-step check-in. Skip anything — the map shows what's missing instead of guessing." },
            { n: "02", t: "Safety gate", d: "Emergency rules fire first. Chest pain never waits behind lifestyle charts — and never gets analysed away." },
            { n: "03", t: "The map", d: "A Health Halo over twelve domains: metabolic, heart, BP, haemoglobin, Vit-D, B12, thyroid, PCOS, sleep, lungs, liver, mind." },
            { n: "04", t: "The bend", d: "Tap any halo axis for its full story, flip what-if levers to bend the curve live, screening to discuss, food to swap — and a doctor summary." },
          ].map((s, i) => (
            <GlassCard key={s.n} className="p-5" transition={{ duration: 0.5, delay: i * 0.07 }}>
              <p className="nxf-mono text-[11px] font-bold tracking-[0.2em] nxf-gold nxf-glyph-glow">{s.n}</p>
              <p className="mt-2 font-display text-lg font-semibold nxf-hi">{s.t}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed nxf-dim">{s.d}</p>
            </GlassCard>
          ))}
        </div>
      </motion.section>

      {/* ---------------- SAFETY ---------------- */}
      <motion.section {...fadeUp}>
        <GlassCard className="p-6 sm:p-8" hover={false}>
          <div className="flex flex-col items-start gap-5 sm:flex-row">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-teal-400/30 bg-teal-400/10">
              <ShieldCheck className="h-6 w-6 nxf-teal" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold nxf-hi">How this stays safe</h2>
              <div className="mt-3 grid gap-2.5 text-[13px] leading-relaxed nxf-dim sm:grid-cols-2">
                <p>· Signal patterns, never diagnoses — and never disease probabilities dressed up as facts</p>
                <p>· Emergency triage precedes every analysis; mental-health language routes to free 24×7 helplines</p>
                <p>· Every score ships with its exact contributing factors — no black boxes</p>
                <p>· South-Asian calibration: BMI risk from 23, IDF waist cutoffs, Indian units and diet patterns</p>
                <p>· Runs are versioned and stamped; the same input yields the same map</p>
                <p>· Anonymous cookie session only — delete everything with one tap in Settings</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.section>

      {/* ---------------- BOTTOM CTA ---------------- */}
      <motion.section {...fadeUp} className="pb-4 text-center">
        <button type="button" className="nxf-cta" onClick={onStart}>
          Map My Health Future <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="mt-3 text-[11.5px] nxf-mute">
          In an emergency call 108 · Mental health: Tele-MANAS 14416 (free, 24×7)
        </p>
        <p className="nxf-mono mt-6 text-[9.5px] uppercase tracking-[0.34em] nxf-gold-soft/80">
          <span aria-hidden="true" className="nxf-glyph-glow">✦ </span>
          Nexura Health Observatory — designed for clarity, engineered for India
          <span aria-hidden="true" className="nxf-glyph-glow"> ✦</span>
        </p>
      </motion.section>
    </div>
  );
}
