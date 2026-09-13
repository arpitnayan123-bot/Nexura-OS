"use client";

/* ============================================================
 * FORESIGHT LANDING — cinematic hero, the reactive-vs-
 * predictive argument, the 12-domain map preview, safety strip.
 * ============================================================ */

import { motion } from "framer-motion";
import { Magnetic } from "@/components/premium/kit";
import { ArrowRight, ChevronDown, Footprints, HeartPulse, History, MoonStar, ShieldCheck, Sparkles, Wind, UtensilsCrossed, Dna, Activity } from "lucide-react";
import { Eyebrow, CountUp, GlassCard, Ornament, Spotlight, fadeUp, type FsLang } from "./ui";
import { DomainGlossary } from "./glossary";

const SIGNAL_SOURCES = [
  { icon: Activity, label: "Symptoms", sub: "40 patterns, severity-weighted" },
  { icon: UtensilsCrossed, label: "Diet", sub: "mithai · fried · rice/roti · salt" },
  { icon: Dna, label: "Body & BMI", sub: "South-Asian bands start at 23" },
  { icon: HeartPulse, label: "Vitals & labs", sub: "BP · sugar · HbA1c · thyroid…" },
  { icon: MoonStar, label: "Sleep", sub: "hours · snoring · daytime dozes" },
  { icon: Footprints, label: "Movement", sub: "weekly workouts · intensity · sitting" },
  { icon: History, label: "History", sub: "personal & family conditions" },
  { icon: Wind, label: "Environment", sub: "your city's air quality load" },
];

/* Hindi copy (Task 15-a) — only the hero, section headings and CTAs
   switch; card bodies/details stay English. The three glossary* strings
   are staged here for the follow-up glossary.tsx pass: DomainGlossary
   renders its own header and is outside this task's file scope. */
const HI = {
  eyebrow: "नेक्सुरा प्रेडिक्टिव 2.0 · हेल्थ फ़ोरसाइट इंजन",
  h1Line1: "स्वास्थ्य देखभाल प्रतिक्रियाशील है।",
  h1Line2: "नेक्सुरा पूर्वानुमानी है।",
  heroSub:
    "अपने लक्षण, आहार, BMI, नींद और इतिहास साझा करें — नेक्सुरा बारह बीमारी-जोखिम क्षेत्रों का एक ईमानदार नक्शा बनाता है: आपका स्वास्थ्य किधर जा रहा है, और उसे बदलने के लिए ठीक क्या करना होगा। भारतीय शरीर के लिए बना।",
  ctaPrimary: "मेरा हेल्थ फ्यूचर मैप करें",
  ctaHistory: "मेरा इतिहास",
  trust: "मुफ़्त · गुमनाम सेशन · कभी भी सब कुछ मिटाएँ · मेडिकल डिवाइस नहीं",
  statDomains: "जोखिम क्षेत्र", // renders "12 जोखिम क्षेत्र" — digits come from CountUp
  statFactors: "+ भारित कारक", // renders "130+ भारित कारक" — digits come from CountUp
  statStudio: "लाइव what-if स्टूडियो",
  statHorizon: "5 साल का दायरा",
  signalEyebrow: "इंजन क्या पढ़ता है",
  signalHeading: "आपकी आठ परतें, एक दिशा",
  glossaryEyebrow: "चलाने से पहले",
  glossaryHeading: "बारह क्षेत्र, समझाए गए",
  glossarySub:
    "हर क्षेत्र एक पारदर्शी नियम-सेट है, कोई काला बक्सा नहीं। किसी भी कार्ड पर टैप करें और देखें कि सिग्नल क्या बढ़ाता है — वही कारक जो इंजन आपके लिए तौलेगा।",
  flowEyebrow: "प्रक्रिया",
  flowHeading: "कुछ मिनट जो आपके अगले पाँच साल पढ़ लें",
  safetyHeading: "यह कैसे सुरक्षित रहता है",
} as const;

export function Landing({
  onStart, onHistory, hasHistory, lang = "en",
}: {
  onStart: () => void;
  onHistory: () => void;
  hasHistory: boolean;
  lang?: FsLang;
}) {
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);

  return (
    <div className="space-y-16 pb-6">
      {/* ---------------- HERO ---------------- */}
      <section className="relative pt-10 text-center sm:pt-16">
        {/* soft conic aurora band orbiting the headline */}
        <div className="nxf-hero-ring" aria-hidden="true" />
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
        >
          <Eyebrow className="mb-4">{t("Nexura Predictive 2.0 · Health Foresight Engine", HI.eyebrow)}</Eyebrow>
          <h1 className="mx-auto max-w-3xl font-display text-[2.5rem] font-semibold leading-[1.08] tracking-tight nxf-hi sm:text-6xl">
            {t("Healthcare is Reactive.", HI.h1Line1)}
            <span className="nxf-goldgrad mt-1 block">
              {t("But Nexura is Predictive.", HI.h1Line2)}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed nxf-dim sm:text-base">
            {t(
              "Share your symptoms, diet, BMI, fitness, sleep and history — Nexura maps twelve disease-risk domains into one honest picture of where your health is heading, and exactly what would change its course. Built for Indian bodies.",
              HI.heroSub,
            )}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Magnetic strength={0.3}>
              <button type="button" className="nxf-cta" onClick={onStart}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {t("Map My Health Future", HI.ctaPrimary)}
              </button>
            </Magnetic>
            {hasHistory && (
              <button type="button" className="nxf-cta nxf-cta-ghost" onClick={onHistory}>
                {t("My history", HI.ctaHistory)}
              </button>
            )}
          </div>
          <p className="mt-4 text-[12px] nxf-mute">
            {t("Free · anonymous session · delete everything anytime · not a medical device", HI.trust)}
          </p>
          {/* figma-style stat strip — precision-design signature,
              key numbers count up on first view */}
          <p className="nxf-mono mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.22em] nxf-gold-soft">
            <span aria-hidden="true" className="nxf-glyph-glow">✦</span> <CountUp to={12} duration={1.2} /> {t("risk domains", HI.statDomains)}
            <span aria-hidden="true" className="nxf-glyph-glow">✦</span> <CountUp to={130} duration={2.1} />{t("+ weighted factors", HI.statFactors)}
            <span aria-hidden="true" className="nxf-glyph-glow">✦</span> {t("live what-if studio", HI.statStudio)}
            <span aria-hidden="true" className="nxf-glyph-glow">✦</span> {t("5-year horizon", HI.statHorizon)}
            <span aria-hidden="true" className="nxf-glyph-glow">✦</span> EN · हिंदी
          </p>
        </motion.div>

        {/* animated scroll cue */}
        <motion.div
          className="relative z-10 mt-12 flex justify-center"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <ChevronDown className="h-5 w-5 text-amber-300/80" />
        </motion.div>
        <Ornament label="Precision · Clarity · Calm" className="relative z-10 mt-8" />
      </section>

      {/* ---------------- REACTIVE VS PREDICTIVE ---------------- */}
      <motion.section {...fadeUp} className="grid gap-4 sm:grid-cols-2">
        <Spotlight className="overflow-hidden rounded-2xl border border-rose-400/20 bg-rose-400/[0.04] p-6">
          <Eyebrow className="mb-3">The world today — reactive</Eyebrow>
          <p className="font-display text-xl font-semibold nxf-hi">Wait for the disease. Then pay anything.</p>
          <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed nxf-dim">
            <li>· Diabetes is found at 8 mmol/L — a decade after the rotis started it</li>
            <li>· BP is diagnosed in an emergency ward, at 180/110</li>
            <li>· Fatty liver is "discovered" on an ultrasound booked for something else</li>
            <li>· India: ~101 million people with diabetes, 315 million with hypertension — most found late</li>
          </ul>
        </Spotlight>
        <Spotlight className="overflow-hidden rounded-2xl border border-teal-400/25 bg-teal-400/[0.05] p-6">
          <Eyebrow className="mb-3">The Nexura way — predictive</Eyebrow>
          <p className="font-display text-xl font-semibold nxf-hi">Read the pattern years before the diagnosis.</p>
          <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed nxf-dim">
            <li>· Twelve risk domains, scored from everything you share — visibly, explainably</li>
            <li>· Emergency screening always runs first; missing data is shown honestly</li>
            <li>· A five-year slope you can bend — with a plan in Indian kitchens and katoris</li>
            <li>· One tap: a doctor-ready summary of signals, tests and questions</li>
          </ul>
        </Spotlight>
      </motion.section>

      {/* ---------------- SIGNAL SOURCES ---------------- */}
      <motion.section {...fadeUp}>
        <div className="mb-6 text-center">
          <Eyebrow className="mb-2">{t("What the engine reads", HI.signalEyebrow)}</Eyebrow>
          <h2 className="font-display text-2xl font-semibold tracking-tight nxf-hi sm:text-3xl">
            {t("Eight layers of you, one trajectory", HI.signalHeading)}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SIGNAL_SOURCES.map((s, i) => (
            <GlassCard key={s.label} className="p-4 text-center" transition={{ duration: 0.5, delay: i * 0.06 }}>
              <s.icon className="mx-auto h-5 w-5 nxf-teal" aria-hidden="true" />
              <p className="mt-2 text-[13px] font-semibold nxf-hi">{s.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed nxf-mute">{s.sub}</p>
            </GlassCard>
          ))}
        </div>
      </motion.section>

      {/* ---------------- TWELVE DOMAINS GLOSSARY ---------------- */}
      <DomainGlossary lang={lang} />

      {/* ---------------- HOW IT WORKS ---------------- */}
      <motion.section {...fadeUp}>
        <div className="mb-6 text-center">
          <Eyebrow className="mb-2">{t("The flow", HI.flowEyebrow)}</Eyebrow>
          <h2 className="font-display text-2xl font-semibold tracking-tight nxf-hi sm:text-3xl">{t("A few minutes that read your next five years", HI.flowHeading)}</h2>
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
              <h2 className="font-display text-xl font-semibold nxf-hi">{t("How this stays safe", HI.safetyHeading)}</h2>
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
          {t("Map My Health Future", HI.ctaPrimary)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
