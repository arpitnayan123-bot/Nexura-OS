"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  ArrowRight,
  ArrowDown,
  Users,
  Heart,
  Stethoscope,
  Building2,
  Pill,
  MessageCircle,
  Sparkles,
  Globe,
  HeartPulse,
} from "lucide-react";

/* ============================================================
   NEXURA OS — FOUNDER EXPERIENCE
   A cinematic, editorial, immersive founder narrative.

   Design philosophy:
   - Near-black background, warm ivory text, subtle gold accents
   - Fraunces serif for emotional headlines
   - Plus Jakarta Sans for metadata/UI
   - Scroll-linked parallax, progressive disclosure
   - No excessive cards. Editorial. Cinematic. Human.
   ============================================================ */

const GOLD = "#C8A55B";
const IVORY = "#EDE8DE";
const FADE = "rgba(237,232,222,0.55)";

export function FounderStory() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Chapter progress indicator
  const progressHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section ref={containerRef} className="relative bg-[#08080A]">
      {/* === Ambient background === */}
      <AmbientBackground scrollYProgress={scrollYProgress} />

      {/* === Chapter progress indicator (desktop only) === */}
      <ChapterIndicator progressHeight={progressHeight} />

      {/* === SECTIONS === */}
      <Hero />
      <TheBeginning />
      <KeyQuote />
      <ListeningBeforeBuilding />
      <TheRealization />
      <FragmentedToConnected />
      <TheIdea />
      <WhatIBelieve />
      <WhoIAm />
      <TheJourney />
      <BuiltSoFar />
      <TheFourteenBillion />
      <FounderManifesto />
      <FinalPortrait />
      <TheStoryContinues />
    </section>
  );
}

/* ============================================================
   AMBIENT BACKGROUND — barely visible grid + radial light
   ============================================================ */
function AmbientBackground({ scrollYProgress }: { scrollYProgress: any }) {
  const glowY = useTransform(scrollYProgress, [0, 0.5, 1], ["0%", "30%", "-20%"]);
  const glowOpacity = useTransform(scrollYProgress, [0, 0.3, 0.6, 1], [0.3, 0.5, 0.4, 0.2]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(${IVORY} 1px, transparent 1px), linear-gradient(90deg, ${IVORY} 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />
      {/* Radial glow */}
      <motion.div
        style={{ y: glowY, opacity: glowOpacity }}
        className="absolute top-0 left-1/2 -translate-x-1/2 h-[800px] w-[800px] rounded-full"
      >
        <div
          className="h-full w-full rounded-full"
          style={{ background: `radial-gradient(circle, ${GOLD}08 0%, transparent 70%)` }}
        />
      </motion.div>
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at center, transparent 40%, #08080A 100%)` }}
      />
    </div>
  );
}

/* ============================================================
   CHAPTER INDICATOR — vertical progress dots (desktop)
   ============================================================ */
function ChapterIndicator({ progressHeight }: { progressHeight: any }) {
  const chapters = ["01", "02", "03", "04", "05", "06"];
  return (
    <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-3">
      <div className="relative flex flex-col items-center gap-3 py-2">
        {/* Background line */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white/8" />
        {/* Progress line */}
        <motion.div
          style={{ height: progressHeight }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-px"
        >
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(to bottom, ${GOLD}, ${GOLD}40)` }}
          />
        </motion.div>
        {/* Chapter dots */}
        {chapters.map((ch, i) => (
          <div
            key={i}
            className="relative z-10 grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-[#08080A]"
          >
            <span className="text-[0.5rem] font-mono text-white/30">{ch}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   REUSABLE — Scroll reveal
   ============================================================ */
function Reveal({
  children,
  delay = 0,
  y = 30,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, delay, ease: [0.25, 1, 0.5, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   REUSABLE — Eyebrow label
   ============================================================ */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] mb-6"
      style={{ color: `${GOLD}cc` }}
    >
      {children}
    </p>
  );
}

/* ============================================================
   01 — HERO
   ============================================================ */
function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]);
  const photoScale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.02, 1.04]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0.4]);

  return (
    <div
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-24"
    >
      <motion.div
        style={{ opacity: textOpacity }}
        className="relative z-10 max-w-4xl mx-auto text-center"
      >
        {/* Eyebrow */}
        <Reveal>
          <Eyebrow>The Founder</Eyebrow>
        </Reveal>

        {/* Headline */}
        <Reveal delay={0.1}>
          <h1
            className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold leading-[1.15] tracking-tight"
            style={{ color: IVORY }}
          >
            Meet the person building
            <br />
            the healthcare <span style={{ color: GOLD }}>operating system.</span>
          </h1>
        </Reveal>

        {/* Founder portrait — cinematic, oversized */}
        <Reveal delay={0.2}>
          <motion.div style={{ y: photoY, scale: photoScale }} className="relative mt-12 mx-auto">
            {/* Soft glow */}
            <div
              className="absolute -inset-12 rounded-full"
              style={{ background: `radial-gradient(circle, ${GOLD}15 0%, transparent 70%)` }}
            />
            {/* Portrait — circular */}
            <div
              className="relative overflow-hidden rounded-full mx-auto"
              style={{ width: "clamp(200px, 40vw, 320px)", height: "clamp(200px, 40vw, 320px)" }}
            >
              <div
                className="absolute inset-0 z-10 pointer-events-none rounded-full"
                style={{ background: `radial-gradient(circle, transparent 60%, #08080A 100%)` }}
              />
              <img
                src="/founder-arpit-circle-white.jpg"
                alt="Arpit Nayan — Founder & CEO, Nexura OS"
                className="h-full w-full object-cover rounded-full"
                style={{ filter: "brightness(0.85) contrast(1.05)" }}
              />
            </div>
          </motion.div>
        </Reveal>

        {/* Name + title */}
        <Reveal delay={0.3}>
          <div className="mt-8">
            <h2
              className="font-display text-2xl sm:text-3xl font-semibold tracking-tight"
              style={{ color: IVORY }}
            >
              Arpit Nayan
            </h2>
            <p className="mt-1 text-sm sm:text-base" style={{ color: `${GOLD}cc` }}>
              Founder &amp; CEO · Nexura OS
            </p>
            <p className="mt-1 text-xs sm:text-sm" style={{ color: FADE }}>
              Bihar, India · Student · Self-taught Builder
            </p>
          </div>
        </Reveal>
      </motion.div>
    </div>
  );
}

/* ============================================================
   02 — THE BEGINNING
   ============================================================ */
function TheBeginning() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);

  return (
    <div ref={ref} className="relative px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
      <motion.div style={{ y: textY }} className="max-w-2xl mx-auto">
        <Reveal>
          <Eyebrow>The Beginning</Eyebrow>
        </Reveal>

        <Reveal delay={0.1}>
          <h2
            className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-semibold leading-[1.25] tracking-tight mb-8"
            style={{ color: IVORY }}
          >
            I walked into a hospital in my hometown in Bihar.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="space-y-5 text-base sm:text-lg leading-relaxed" style={{ color: FADE }}>
            <p>I'm a student and self-taught builder from Bihar.</p>
            <p>
              For three months, I visited hospitals across Patna — sitting in waiting rooms,
              speaking with patients and nurses during breaks, and observing doctors at work.
            </p>
            <p>
              I wasn't looking for a startup idea. I was trying to understand what was actually
              happening.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mt-10 pt-8 border-t" style={{ borderColor: `${IVORY}10` }}>
            <p className="text-lg sm:text-xl leading-relaxed" style={{ color: `${IVORY}cc` }}>
              What I found wasn't simply a healthcare system lacking people who cared.
            </p>
            <p className="mt-4 text-lg sm:text-xl leading-relaxed" style={{ color: `${IVORY}cc` }}>
              It was a system where the people, information and tools were often disconnected.
            </p>
          </div>
        </Reveal>
      </motion.div>
    </div>
  );
}

/* ============================================================
   03 — KEY QUOTE — visual centerpiece
   ============================================================ */
function KeyQuote() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0.5]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.97, 1, 1.02]);

  return (
    <div
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-32"
    >
      <motion.div style={{ opacity, scale }} className="max-w-4xl mx-auto text-center">
        {/* Giant quotation mark */}
        <Reveal>
          <span
            className="font-display block leading-none mb-4"
            style={{ fontSize: "clamp(80px, 15vw, 160px)", color: `${GOLD}25` }}
          >
            &ldquo;
          </span>
        </Reveal>

        {/* Quote — line by line reveal */}
        <div className="space-y-2">
          <Reveal delay={0.15}>
            <p
              className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl leading-[1.3] tracking-tight"
              style={{ color: IVORY }}
            >
              I walked into a hospital in Bihar
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <p
              className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl leading-[1.3] tracking-tight"
              style={{ color: IVORY }}
            >
              and saw a system failing —
            </p>
          </Reveal>
          <Reveal delay={0.45}>
            <p
              className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl leading-[1.3] tracking-tight"
              style={{ color: `${IVORY}aa` }}
            >
              not because people didn't care,
            </p>
          </Reveal>
          <Reveal delay={0.6}>
            <p
              className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl leading-[1.3] tracking-tight"
              style={{ color: `${IVORY}aa` }}
            >
              but because the tools were from another century.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.75}>
          <p className="mt-12 text-sm sm:text-base font-medium" style={{ color: GOLD }}>
            — Arpit Nayan
          </p>
        </Reveal>
      </motion.div>
    </div>
  );
}

/* ============================================================
   04 — LISTENING BEFORE BUILDING
   ============================================================ */
function ListeningBeforeBuilding() {
  const ref = useRef(null);

  const observations = [
    {
      label: "Patients",
      icon: Users,
      text: "Patients described waiting, uncertainty and disconnected information — repeating their story at every visit, carrying physical files that no one had digitized.",
    },
    {
      label: "Nurses",
      icon: Heart,
      text: "Nurses were working within systems that often felt like obstacles — handwriting notes, managing registers, tracking medications on paper while caring for patients who needed their full attention.",
    },
    {
      label: "Doctors",
      icon: Stethoscope,
      text: "Doctors had the knowledge and the intent, but the tools around them didn't keep up — prescriptions written by hand, patient histories scattered, follow-ups dependent on memory.",
    },
  ];

  return (
    <div ref={ref} className="relative px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
      <div className="max-w-2xl mx-auto">
        <Reveal>
          <Eyebrow>Listening Before Building</Eyebrow>
        </Reveal>

        <Reveal delay={0.1}>
          <h2
            className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-semibold leading-[1.25] tracking-tight mb-12"
            style={{ color: IVORY }}
          >
            So I talked to them.
          </h2>
        </Reveal>

        {/* Three stacked observations */}
        <div className="space-y-12">
          {observations.map((obs, i) => (
            <Reveal key={i} delay={0.15 + i * 0.1}>
              <div className="flex gap-4 sm:gap-6">
                {/* Number */}
                <div className="shrink-0">
                  <span
                    className="font-display text-3xl sm:text-4xl font-bold"
                    style={{ color: `${GOLD}40` }}
                  >
                    0{i + 1}
                  </span>
                </div>
                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-2">
                    <obs.icon className="h-4 w-4" style={{ color: `${GOLD}aa` }} />
                    <p
                      className="text-sm font-semibold uppercase tracking-wider"
                      style={{ color: IVORY }}
                    >
                      {obs.label}
                    </p>
                  </div>
                  <p className="text-base sm:text-lg leading-relaxed" style={{ color: FADE }}>
                    {obs.text}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   05 — THE REALIZATION
   ============================================================ */
function TheRealization() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.8, 1], [0, 1, 1, 0.4]);

  const fragments = [
    "Hospitals",
    "Clinics",
    "Doctors",
    "Pharmacies",
    "Patients",
    "Information",
    "Technology",
  ];

  return (
    <div
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-32"
    >
      <motion.div style={{ opacity }} className="max-w-2xl mx-auto">
        <Reveal>
          <Eyebrow>The Realization</Eyebrow>
        </Reveal>

        <Reveal delay={0.1}>
          <h2
            className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold leading-[1.15] tracking-tight mb-8"
            style={{ color: IVORY }}
          >
            I couldn't unsee it.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="text-lg sm:text-xl leading-relaxed mb-8" style={{ color: FADE }}>
            Once you see how fragmented healthcare can become, it's difficult to treat each problem
            as an isolated problem.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <p className="text-base sm:text-lg leading-relaxed mb-12" style={{ color: `${FADE}cc` }}>
            The issue wasn't simply one bad application. It wasn't simply one hospital. It wasn't
            simply one clinic.
          </p>
        </Reveal>

        {/* Fragmented elements */}
        <Reveal delay={0.4}>
          <div className="space-y-2 mb-8">
            {fragments.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.08, duration: 0.6 }}
                className="text-lg sm:text-xl font-display"
                style={{ color: `${IVORY}80` }}
              >
                {f}
              </motion.div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.5}>
          <p className="text-lg sm:text-xl leading-relaxed" style={{ color: IVORY }}>
            They all needed to work together.
          </p>
        </Reveal>
      </motion.div>
    </div>
  );
}

/* ============================================================
   06 — FRAGMENTED → CONNECTED → NEXURA OS
   ============================================================ */
function FragmentedToConnected() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lineWidth = useTransform(scrollYProgress, [0.2, 0.6], ["0%", "100%"]);

  const nodes = [
    { label: "Patient", icon: Users },
    { label: "Doctor", icon: Stethoscope },
    { label: "Clinic", icon: Building2 },
    { label: "Hospital", icon: HeartPulse },
    { label: "Pharmacy", icon: Pill },
  ];

  return (
    <div ref={ref} className="relative px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
      <div className="max-w-3xl mx-auto text-center">
        {/* Fragmented state */}
        <Reveal>
          <p
            className="text-sm font-semibold uppercase tracking-[0.3em] mb-8"
            style={{ color: `${FADE}80` }}
          >
            Fragmented
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            {nodes.map((n, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-full border px-4 py-2"
                style={{ borderColor: `${IVORY}15`, background: `${IVORY}03` }}
              >
                <n.icon className="h-3.5 w-3.5" style={{ color: `${FADE}aa` }} />
                <span className="text-xs sm:text-sm" style={{ color: `${FADE}cc` }}>
                  {n.label}
                </span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Connection line */}
        <Reveal delay={0.2}>
          <div className="relative h-px w-full mb-2" style={{ background: `${IVORY}08` }}>
            <motion.div style={{ width: lineWidth }} className="absolute top-0 left-0 h-full">
              <div
                className="h-full w-full"
                style={{ background: `linear-gradient(to right, ${GOLD}40, ${GOLD})` }}
              />
            </motion.div>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <p
            className="text-sm font-semibold uppercase tracking-[0.3em] mb-8 mt-8"
            style={{ color: `${GOLD}cc` }}
          >
            Connected
          </p>
        </Reveal>

        {/* Nexura OS reveal */}
        <Reveal delay={0.4}>
          <h3
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight"
            style={{ color: IVORY }}
          >
            Nexura OS
          </h3>
        </Reveal>

        <Reveal delay={0.5}>
          <p
            className="mt-6 text-lg sm:text-xl leading-relaxed max-w-xl mx-auto"
            style={{ color: FADE }}
          >
            Nexura OS wasn't meant to be another healthcare app.
          </p>
        </Reveal>

        <Reveal delay={0.6}>
          <p
            className="mt-4 text-lg sm:text-xl leading-relaxed max-w-xl mx-auto"
            style={{ color: IVORY }}
          >
            It had to become the connective tissue.
          </p>
        </Reveal>
      </div>
    </div>
  );
}

/* ============================================================
   07 — THE IDEA — "Not software. A promise."
   ============================================================ */
function TheIdea() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.8, 1], [0, 1, 1, 0.3]);

  return (
    <div
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-32"
    >
      <motion.div style={{ opacity }} className="max-w-3xl mx-auto text-center">
        <Reveal>
          <Eyebrow>The Idea</Eyebrow>
        </Reveal>

        <Reveal delay={0.1}>
          <h2
            className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.1] tracking-tight mb-4"
            style={{ color: `${IVORY}80` }}
          >
            Nexura OS is not software.
          </h2>
        </Reveal>

        <Reveal delay={0.3}>
          <h2
            className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.1] tracking-tight mb-12"
            style={{ color: GOLD }}
          >
            It's a promise.
          </h2>
        </Reveal>

        <Reveal delay={0.5}>
          <div
            className="space-y-4 text-base sm:text-lg leading-relaxed max-w-xl mx-auto"
            style={{ color: FADE }}
          >
            <p>A promise that healthcare can feel connected instead of fragmented.</p>
            <p>
              A promise that technology can work quietly behind the scenes while people remain at
              the center.
            </p>
            <p>
              A promise that India's healthcare infrastructure can be designed around the realities
              of India.
            </p>
          </div>
        </Reveal>
      </motion.div>
    </div>
  );
}

/* ============================================================
   08 — WHAT I BELIEVE
   ============================================================ */
function WhatIBelieve() {
  const beliefs = [
    {
      num: "01",
      title: "Technology Should Disappear",
      text: "People shouldn't have to understand complicated systems to receive better care.",
    },
    {
      num: "02",
      title: "Healthcare Should Connect",
      text: "Hospitals, clinics, pharmacies, doctors and patients shouldn't exist inside isolated silos.",
    },
    {
      num: "03",
      title: "India Deserves Infrastructure Built for India",
      text: "Healthcare technology should reflect the realities, scale and diversity of the people it serves.",
    },
  ];

  return (
    <div className="relative px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
      <div className="max-w-2xl mx-auto">
        <Reveal>
          <Eyebrow>What I Believe</Eyebrow>
        </Reveal>

        <div className="space-y-16 mt-12">
          {beliefs.map((b, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="flex gap-6 sm:gap-8">
                {/* Number */}
                <div className="shrink-0">
                  <span
                    className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold"
                    style={{ color: `${GOLD}30` }}
                  >
                    {b.num}
                  </span>
                </div>
                {/* Content */}
                <div className="flex-1 pt-2">
                  <h3
                    className="font-display text-xl sm:text-2xl lg:text-3xl font-semibold leading-tight tracking-tight mb-3"
                    style={{ color: IVORY }}
                  >
                    {b.title}
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed" style={{ color: FADE }}>
                    {b.text}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   09 — WHO I AM
   ============================================================ */
function WhoIAm() {
  const attributes = [
    { label: "Student", text: "Building while learning." },
    { label: "Self-taught", text: "Learning through building real systems." },
    { label: "Builder", text: "7 products built." },
    { label: "India-first", text: "Building around India's healthcare reality." },
  ];

  return (
    <div className="relative px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
      <div className="max-w-2xl mx-auto">
        <Reveal>
          <Eyebrow>Who is building this?</Eyebrow>
        </Reveal>

        <Reveal delay={0.1}>
          <h2
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-2"
            style={{ color: IVORY }}
          >
            Arpit Nayan
          </h2>
          <p className="text-base sm:text-lg mb-1" style={{ color: `${GOLD}cc` }}>
            Founder &amp; CEO
          </p>
          <p className="text-sm sm:text-base mb-1" style={{ color: FADE }}>
            Nexura OS
          </p>
          <p className="text-sm sm:text-base mb-12" style={{ color: FADE }}>
            Bihar, India
          </p>
        </Reveal>

        {/* Attributes — editorial, not cards */}
        <div className="space-y-6">
          {attributes.map((a, i) => (
            <Reveal key={i} delay={0.15 + i * 0.08}>
              <div
                className="flex items-baseline gap-4 border-b pb-4"
                style={{ borderColor: `${IVORY}08` }}
              >
                <span
                  className="text-sm font-semibold uppercase tracking-wider w-28 shrink-0"
                  style={{ color: GOLD }}
                >
                  {a.label}
                </span>
                <span className="text-base sm:text-lg" style={{ color: FADE }}>
                  {a.text}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   10 — THE JOURNEY (timeline)
   ============================================================ */
function TheJourney() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.9], ["0%", "100%"]);

  const stages = [
    { title: "Before Nexura", text: "Exploring technology and learning by building." },
    {
      title: "The Observation",
      text: "Three months of observing healthcare environments in Patna.",
    },
    { title: "The Realization", text: "Recognizing the deeper problem of fragmentation." },
    { title: "The Build", text: "Turning the observation into Nexura OS." },
    { title: "Today", text: "Building the connected healthcare ecosystem." },
  ];

  return (
    <div ref={ref} className="relative px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
      <div className="max-w-2xl mx-auto">
        <Reveal>
          <Eyebrow>The Journey</Eyebrow>
        </Reveal>

        <div className="relative mt-12">
          {/* Vertical line background */}
          <div
            className="absolute left-3 sm:left-4 top-0 bottom-0 w-px"
            style={{ background: `${IVORY}08` }}
          />
          {/* Progress line */}
          <motion.div
            style={{ height: lineHeight }}
            className="absolute left-3 sm:left-4 top-0 w-px"
          >
            <div
              className="h-full w-full"
              style={{ background: `linear-gradient(to bottom, ${GOLD}, ${GOLD}40)` }}
            />
          </motion.div>

          {/* Stages */}
          <div className="space-y-12">
            {stages.map((s, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="relative flex gap-6 sm:gap-8 pl-0">
                  {/* Dot */}
                  <div className="relative z-10 shrink-0 -ml-1">
                    <div
                      className="grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-full border-2 bg-[#08080A]"
                      style={{ borderColor: `${GOLD}40` }}
                    >
                      <span className="text-[0.6rem] font-mono" style={{ color: `${GOLD}aa` }}>
                        {i + 1}
                      </span>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <h3
                      className="font-display text-lg sm:text-xl lg:text-2xl font-semibold mb-1"
                      style={{ color: IVORY }}
                    >
                      {s.title}
                    </h3>
                    <p className="text-sm sm:text-base leading-relaxed" style={{ color: FADE }}>
                      {s.text}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   11 — BUILT SO FAR (ecosystem diagram)
   ============================================================ */
function BuiltSoFar() {
  const products = [
    { name: "Hospital OS", icon: Building2, href: "/hospital" },
    { name: "Clinic OS", icon: Stethoscope, href: "/clinic" },
    { name: "Pharmacia", icon: Pill, href: "/pharmacy" },
    { name: "Patient Portal", icon: HeartPulse, href: "/portal" },
    { name: "Connect", icon: MessageCircle, href: "/connect" },
    { name: "Know Your Health", icon: Sparkles, href: "/know-your-health" },
    { name: "Global", icon: Globe, href: "/global" },
  ];

  return (
    <div className="relative px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
      <div className="max-w-2xl mx-auto">
        <Reveal>
          <Eyebrow>Built So Far</Eyebrow>
        </Reveal>

        <Reveal delay={0.1}>
          <h2
            className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold leading-[1.25] tracking-tight mb-4"
            style={{ color: IVORY }}
          >
            I didn't start by building an ecosystem.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p
            className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold leading-[1.25] tracking-tight mb-12"
            style={{ color: GOLD }}
          >
            I started by building.
          </p>
        </Reveal>

        {/* Ecosystem diagram */}
        <Reveal delay={0.3}>
          <div className="relative">
            {/* Center node */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div
                  className="absolute -inset-4 rounded-full"
                  style={{ background: `radial-gradient(circle, ${GOLD}15 0%, transparent 70%)` }}
                />
                <div
                  className="relative grid h-20 w-20 place-items-center rounded-full border"
                  style={{ borderColor: `${GOLD}30`, background: `${GOLD}08` }}
                >
                  <span
                    className="font-display text-xs font-bold text-center leading-tight"
                    style={{ color: GOLD }}
                  >
                    Nexura OS
                  </span>
                </div>
              </div>
            </div>

            {/* Connection lines (CSS) */}
            <div className="relative">
              {/* Products */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((p, i) => (
                  <motion.a
                    key={i}
                    href={p.href}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.06, duration: 0.5 }}
                    className="group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all hover:-translate-y-0.5"
                    style={{ borderColor: `${IVORY}08`, background: `${IVORY}02` }}
                  >
                    <span
                      className="grid h-7 w-7 place-items-center rounded-lg"
                      style={{ background: `${GOLD}10` }}
                    >
                      <p.icon className="h-3.5 w-3.5" style={{ color: `${GOLD}cc` }} />
                    </span>
                    <span
                      className="text-xs sm:text-sm font-medium"
                      style={{ color: `${IVORY}cc` }}
                    >
                      {p.name}
                    </span>
                  </motion.a>
                ))}
              </div>
            </div>

            <Reveal delay={0.4}>
              <p
                className="mt-12 text-sm sm:text-base leading-relaxed text-center"
                style={{ color: FADE }}
              >
                Seven products. One ecosystem. Each built to solve a real problem observed in those
                hospital corridors.
              </p>
            </Reveal>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* ============================================================
   12 — THE 1.4 BILLION STATEMENT
   ============================================================ */
function TheFourteenBillion() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const numberOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0.3]);
  const numberScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 1.03]);

  return (
    <div
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-32"
    >
      <motion.div style={{ opacity: numberOpacity }} className="max-w-3xl mx-auto text-center">
        {/* Number — monumental */}
        <motion.div style={{ scale: numberScale }}>
          <Reveal>
            <p
              className="font-display font-bold leading-none tracking-tighter"
              style={{ fontSize: "clamp(80px, 20vw, 240px)", color: IVORY }}
            >
              1.4B
            </p>
          </Reveal>
        </motion.div>

        <Reveal delay={0.2}>
          <p
            className="text-sm sm:text-base font-semibold uppercase tracking-[0.3em] mt-4 mb-12"
            style={{ color: `${GOLD}cc` }}
          >
            People we are building for
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <p
            className="text-lg sm:text-xl leading-relaxed max-w-xl mx-auto"
            style={{ color: FADE }}
          >
            The ambition isn't to build for a small corner of healthcare.
          </p>
        </Reveal>

        <Reveal delay={0.4}>
          <p
            className="mt-4 text-lg sm:text-xl leading-relaxed max-w-xl mx-auto"
            style={{ color: IVORY }}
          >
            It's to build infrastructure capable of serving a country of extraordinary scale.
          </p>
        </Reveal>
      </motion.div>
    </div>
  );
}

/* ============================================================
   13 — FOUNDER MANIFESTO
   ============================================================ */
function FounderManifesto() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.8, 1], [0, 1, 1, 0.5]);

  return (
    <div
      ref={ref}
      className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-32"
    >
      <motion.div style={{ opacity }} className="max-w-3xl mx-auto text-center">
        <Reveal>
          <Eyebrow>The Promise</Eyebrow>
        </Reveal>

        <Reveal delay={0.1}>
          <h2
            className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-semibold leading-[1.3] tracking-tight mb-8"
            style={{ color: IVORY }}
          >
            I'm not trying to build another healthcare app.
          </h2>
        </Reveal>

        <Reveal delay={0.3}>
          <h2
            className="font-display text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-semibold leading-[1.3] tracking-tight mb-12"
            style={{ color: GOLD }}
          >
            I'm trying to build the infrastructure that makes healthcare feel like one connected
            experience.
          </h2>
        </Reveal>

        <Reveal delay={0.5}>
          <div className="mt-16">
            <p className="text-base sm:text-lg font-medium" style={{ color: IVORY }}>
              Arpit Nayan
            </p>
            <p className="text-sm" style={{ color: FADE }}>
              Founder &amp; CEO, Nexura OS
            </p>
          </div>
        </Reveal>
      </motion.div>
    </div>
  );
}

/* ============================================================
   14 — FINAL PORTRAIT
   ============================================================ */
function FinalPortrait() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["5%", "-5%"]);

  return (
    <div ref={ref} className="relative px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
      <div className="max-w-4xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Portrait — intimate */}
          <Reveal>
            <motion.div style={{ y: photoY }} className="relative">
              <div
                className="absolute -inset-6 rounded-full"
                style={{ background: `radial-gradient(circle, ${GOLD}10 0%, transparent 70%)` }}
              />
              <div
                className="relative overflow-hidden rounded-full mx-auto"
                style={{ width: "clamp(180px, 30vw, 280px)", height: "clamp(180px, 30vw, 280px)" }}
              >
                <img
                  src="/founder-arpit-circle-white.jpg"
                  alt="Arpit Nayan — Founder & CEO, Nexura OS"
                  loading="lazy"
                  className="h-full w-full object-cover rounded-full"
                  style={{ filter: "brightness(0.9)" }}
                />
              </div>
            </motion.div>
          </Reveal>

          {/* Text */}
          <Reveal delay={0.15}>
            <div>
              <h2
                className="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-2"
                style={{ color: IVORY }}
              >
                Arpit Nayan
              </h2>
              <p className="text-sm mb-1" style={{ color: `${GOLD}cc` }}>
                Founder &amp; CEO
              </p>
              <p className="text-sm mb-1" style={{ color: FADE }}>
                Nexura OS
              </p>
              <p className="text-sm mb-8" style={{ color: FADE }}>
                Bihar, India
              </p>

              <p
                className="font-display text-xl sm:text-2xl italic leading-relaxed mb-8"
                style={{ color: `${IVORY}cc` }}
              >
                Building healthcare differently.
              </p>

              {/* Buttons */}
              <div className="flex flex-wrap gap-3">
                <a
                  href="mailto:arpit.nexuraos@gmail.com"
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: IVORY, color: "#08080A" }}
                >
                  Contact Arpit <ArrowRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href="/investors"
                  className="inline-flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-xs font-semibold transition-colors"
                  style={{ borderColor: `${IVORY}20`, color: IVORY }}
                >
                  Investor Deck
                </a>
                <a
                  href="#story"
                  className="inline-flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-xs font-semibold transition-colors"
                  style={{ borderColor: `${IVORY}20`, color: IVORY }}
                >
                  Read the full story
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   15 — THE STORY CONTINUES
   ============================================================ */
function TheStoryContinues() {
  return (
    <div
      className="relative px-4 sm:px-6 lg:px-8 py-32 lg:py-40 border-t"
      style={{ borderColor: `${IVORY}05` }}
    >
      <div className="max-w-2xl mx-auto text-center">
        <Reveal>
          <p
            className="text-sm font-semibold uppercase tracking-[0.3em] mb-6"
            style={{ color: `${GOLD}cc` }}
          >
            The Story Continues
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <h2
            className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold leading-[1.3] tracking-tight mb-12"
            style={{ color: IVORY }}
          >
            Healthcare is too important to remain fragmented.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-2"
            style={{ color: IVORY }}
          >
            Nexura OS
          </p>
          <p className="text-sm sm:text-base mb-12" style={{ color: FADE }}>
            Healthcare Operating System
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="mailto:arpit.nexuraos@gmail.com"
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-semibold transition-all hover:scale-105"
              style={{ background: IVORY, color: "#08080A" }}
            >
              Contact Arpit <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <a
              href="/investors"
              className="inline-flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-xs font-semibold transition-colors"
              style={{ borderColor: `${IVORY}20`, color: IVORY }}
            >
              Investor Deck
            </a>
            <a
              href="#top"
              className="inline-flex items-center gap-1.5 rounded-full border px-5 py-2.5 text-xs font-semibold transition-colors"
              style={{ borderColor: `${IVORY}20`, color: IVORY }}
            >
              Explore Nexura OS
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <p className="mt-16 text-xs" style={{ color: `${FADE}80` }}>
            Founder &amp; CEO · Arpit Nayan · arpit.nexuraos@gmail.com
          </p>
        </Reveal>
      </div>
    </div>
  );
}
