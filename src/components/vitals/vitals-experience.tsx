"use client";

/* ============================================================
   NEXURA VITALS — "Your body, in real time."
   ------------------------------------------------------------
   Wearable-connected continuous health dashboard. Deterministic
   seeded data drives hand-rolled SVG visualizations (gold
   sparklines, ring gauge, sleep-stage bar, stress area chart)
   — no chart library, full design control, zero extra deps.

   A gentle simulated "live" tick updates the heart-rate trail
   (pausable, respects reduced motion) to make the page feel
   alive without lying about what a demo can do.
   ============================================================ */

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  HeartPulse,
  Moon,
  Footprints,
  Wind,
  Watch,
  Smartphone,
  Bluetooth,
  Share2,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Pause,
  Play,
} from "lucide-react";
import {
  Eyebrow,
  SectionHeading,
  Ornament,
  Counter,
  StaggerGroup,
  StaggerItem,
  Magnetic,
  TextReveal,
  ScrollProgress,
  SpotlightCard,
} from "@/components/premium/kit";

/* ---------- deterministic seeded series ---------- */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function series(seed: number, n: number, base: number, spread: number, drift = 0) {
  const rnd = mulberry32(seed);
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (rnd() - 0.5) * spread + drift;
    v = Math.max(base - spread * 3, Math.min(base + spread * 3, v));
    out.push(v);
  }
  return out;
}

/* ---------- gold sparkline (SVG path) ---------- */

function Sparkline({
  data,
  width = 260,
  height = 56,
  stroke = "#D9B87C",
  fill = "rgba(161,98,7,0.18)",
  live = false,
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  live?: boolean;
}) {
  const { d, area } = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - 6 - ((v - min) / range) * (height - 12);
      return [x, y] as const;
    });
    const path = pts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");
    return { d: path, area: `${path} L${width},${height} L0,${height} Z` };
  }, [data, width, height]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Trend chart"
    >
      <path d={area} fill={fill} stroke="none" />
      <motion.path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      />
      {live && (
        <circle r="3.5" fill={stroke} stroke="#141210" strokeWidth="1.5">
          <animateMotion dur="2.4s" repeatCount="indefinite" path={d} />
        </circle>
      )}
    </svg>
  );
}

/* ---------- ring gauge ---------- */

function RingGauge({
  value,
  max,
  label,
  sub,
}: {
  value: number;
  max: number;
  label: string;
  sub: string;
}) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const pct = Math.min(value / max, 1);
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg
          viewBox="0 0 120 120"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={`${label}: ${value} of ${max}`}
        >
          <circle cx="60" cy="60" r={R} fill="none" stroke="#2E2A20" strokeWidth="8" />
          <motion.circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="url(#goldRing)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            whileInView={{ strokeDashoffset: C * (1 - pct) }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="goldRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D9B87C" />
              <stop offset="100%" stopColor="#A16207" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-2xl font-semibold tabular-nums text-[#F5EDD8]">
            {value.toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#988F81]">{sub}</span>
        </div>
      </div>
      <div className="mt-2 text-xs uppercase tracking-[0.14em] text-[#9C927E]">{label}</div>
    </div>
  );
}

/* ---------- sleep stages ---------- */

const SLEEP = [
  { stage: "Deep", hrs: 1.6, cls: "from-[#A16207] to-[#8F5E06]" },
  { stage: "REM", hrs: 1.9, cls: "from-[#D9B87C] to-[#B8860B]" },
  { stage: "Light", hrs: 4.1, cls: "from-[#8A8070] to-[#6E6654]" },
  { stage: "Awake", hrs: 0.4, cls: "from-[#3A3428] to-[#2E2A20]" },
];

function SleepBar() {
  const total = SLEEP.reduce((s, x) => s + x.hrs, 0);
  return (
    <div>
      <div
        className="flex h-14 w-full overflow-hidden rounded-2xl border border-[#2E2A20]"
        role="img"
        aria-label={`Sleep stages: ${SLEEP.map((s) => `${s.stage} ${s.hrs} hours`).join(", ")}`}
      >
        {SLEEP.map((s, i) => (
          <motion.div
            key={s.stage}
            className={`bg-gradient-to-b ${s.cls} border-r border-[#141210] last:border-r-0`}
            initial={{ width: 0 }}
            whileInView={{ width: `${(s.hrs / total) * 100}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: i * 0.15, ease: "easeOut" }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        {SLEEP.map((s) => (
          <span key={s.stage} className="inline-flex items-center gap-1.5 text-xs text-[#9C927E]">
            <span
              className={`inline-block h-2 w-2 rounded-full bg-gradient-to-b ${s.cls}`}
              aria-hidden="true"
            />
            {s.stage} · <span className="tabular-nums text-[#E8DFCB]">{s.hrs}h</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- live heart-rate card ---------- */

function LiveHeartRate() {
  const BASE = series(42, 40, 68, 6);
  const [tick, setTick] = useState(0);
  const [live, setLive] = useState(true);
  // Reduced-motion via a real external-system subscription (SSR-safe,
  // lint-clean): render reads a reactive value, never a ref.
  const reduce = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  useEffect(() => {
    if (!live || reduce) return;
    const id = setInterval(() => setTick((t) => t + 1), 1600);
    return () => clearInterval(id);
  }, [live, reduce]);

  // Plain derivation — React Compiler memoizes this automatically; a manual
  // useMemo here made the compiler skip the component entirely.
  const drift = ((tick * 7) % 11) - 5;
  const data =
    tick === 0 ? BASE : [...BASE.slice(tick % 8), ...series(100 + tick, 8, 68 + drift, 5)];

  const current = Math.round(data[data.length - 1]);

  return (
    <SpotlightCard className="relative rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#C8A55B]">
            <HeartPulse className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em]">Heart rate</span>
          </div>
          <div className="mt-3 font-serif text-5xl font-semibold tabular-nums text-[#F5EDD8]">
            {current}
            <span className="ml-2 text-sm font-normal text-[#988F81]">bpm</span>
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#9C927E]">
            <TrendingDown className="h-3.5 w-3.5 text-[#8FBF8F]" aria-hidden="true" />
            Resting trend −3 bpm vs last week
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLive((v) => !v)}
          aria-pressed={live}
          aria-label={live ? "Pause live simulation" : "Resume live simulation"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3A3428] text-[#9C927E] transition-colors hover:border-[#A16207]/60 hover:text-[#F5EDD8]"
        >
          {live ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      <div className="mt-5">
        <Sparkline
          data={data}
          height={64}
          live={live}
          stroke="#E58F7A"
          fill="rgba(229,100,84,0.14)"
        />
      </div>
      <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#8B8476]">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${live && !reduce ? "bg-[#E58F7A] nxl-vt-pulse" : "bg-[#6E6654]"}`}
          aria-hidden="true"
        />
        {live ? "Live demo simulation" : "Simulation paused"}
      </p>
    </SpotlightCard>
  );
}

/* ---------- alerts timeline ---------- */

const ALERTS = [
  {
    time: "Yesterday · 03:12",
    icon: Wind,
    title: "SpO₂ dipped to 93%",
    body: "Brief desaturation during sleep — within your pattern, but logged for your physician.",
    tone: "watch",
  },
  {
    time: "Mon · 18:40",
    icon: AlertTriangle,
    title: "Elevated resting HR (89 bpm)",
    body: "Correlated with a 2.1 km evening run. No action needed; hydration suggested.",
    tone: "info",
  },
  {
    time: "Sun · 23:58",
    icon: Moon,
    title: "Short REM night (1.1 h)",
    body: "Late screen time flagged. Sleep onset improved after — worth keeping the routine.",
    tone: "info",
  },
];

function Alerts() {
  return (
    <section className="relative px-6 py-20 sm:py-24" aria-labelledby="alerts-heading">
      <SectionHeading
        eyebrow="Pattern alerts"
        title={
          <span id="alerts-heading">
            Notified with <em className="text-gold-gradient not-italic">context, never panic.</em>
          </span>
        }
        lede="Vitals watches your trends, correlates them with activity, and explains itself — so an alert is information, not anxiety."
      />
      <div className="mx-auto mt-12 max-w-3xl">
        <StaggerGroup className="space-y-4">
          {ALERTS.map((a) => (
            <StaggerItem key={a.title}>
              <div className="flex gap-4 rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-6 transition-colors hover:border-[#A16207]/50">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                    a.tone === "watch"
                      ? "border-[#E3C578]/40 bg-[#E3C578]/10"
                      : "border-[#3A3428] bg-[#241F16]"
                  }`}
                >
                  <a.icon
                    className={`h-5 w-5 ${a.tone === "watch" ? "text-[#E3C578]" : "text-[#C8A55B]"}`}
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-mono uppercase tracking-wider text-[#988F81]">
                    {a.time}
                  </div>
                  <div className="mt-1 text-[15px] font-medium text-[#EFE7D3]">{a.title}</div>
                  <p className="mt-1 text-sm leading-relaxed text-[#B3A892]">{a.body}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

/* ---------- root ---------- */

export function VitalsExperience() {
  const spo2 = series(7, 30, 97, 1.2);
  const hrv = series(19, 30, 52, 9);
  const stress = series(88, 30, 32, 10);

  return (
    <div className="nxt-root relative min-h-dvh bg-[#141210] text-[#EFE7D3]">
      <ScrollProgress />

      {/* hero */}
      <header className="relative overflow-hidden px-6 pt-36 pb-16 sm:pt-44">
        <div className="aurora-gold" aria-hidden="true" />
        <div className="relative mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Eyebrow>Nexura Vitals · Continuous health</Eyebrow>
          </motion.div>
          <h1 className="display-xl mt-6 text-balance">
            <TextReveal text="Your body," />
            <br />
            <span className="text-gold-gradient">
              <TextReveal text="in real time." />
            </span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#C9BFAE]"
          >
            Connect the watch and sensors you already own. Vitals turns their streams into one calm,
            physician-grade picture — with trends explained, not just plotted.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3 text-xs text-[#9C927E]"
            aria-label="Compatible devices"
          >
            {[
              ["Apple Watch", Watch],
              ["Fitbit / Wear OS", Watch],
              ["CGMs", Smartphone],
              ["BLE BP monitors", Bluetooth],
            ].map(([name, Icon]) => {
              const I = Icon as React.ElementType;
              return (
                <span
                  key={name as string}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#3A3428] px-3.5 py-1.5"
                >
                  <I className="h-3.5 w-3.5 text-[#C8A55B]" aria-hidden="true" />
                  {name as string}
                </span>
              );
            })}
          </motion.div>
        </div>
      </header>

      <main>
        {/* dashboard */}
        <section className="relative px-6 pb-8" aria-labelledby="dash-heading">
          <h2 id="dash-heading" className="sr-only">
            Live vitals dashboard
          </h2>
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LiveHeartRate />
            </div>
            <SpotlightCard className="flex items-center justify-center rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7">
              <RingGauge value={8412} max={10000} label="Today's steps" sub="of 10k" />
            </SpotlightCard>

            <SpotlightCard className="rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7">
              <div className="flex items-center gap-2 text-[#C8A55B]">
                <Wind className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                  SpO₂ · oxygen
                </span>
              </div>
              <div className="mt-3 font-serif text-4xl font-semibold tabular-nums text-[#F5EDD8]">
                97<span className="ml-1 text-sm font-normal text-[#988F81]">%</span>
              </div>
              <div className="mt-4">
                <Sparkline data={spo2} height={48} />
              </div>
            </SpotlightCard>

            <SpotlightCard className="rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7">
              <div className="flex items-center gap-2 text-[#C8A55B]">
                <Activity className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                  HRV · recovery
                </span>
              </div>
              <div className="mt-3 font-serif text-4xl font-semibold tabular-nums text-[#F5EDD8]">
                52<span className="ml-1 text-sm font-normal text-[#988F81]">ms</span>
              </div>
              <div className="mt-4">
                <Sparkline data={hrv} height={48} />
              </div>
            </SpotlightCard>

            <SpotlightCard className="rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7">
              <div className="flex items-center gap-2 text-[#C8A55B]">
                <Footprints className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                  Stress index
                </span>
              </div>
              <div className="mt-3 font-serif text-4xl font-semibold tabular-nums text-[#F5EDD8]">
                32<span className="ml-1 text-sm font-normal text-[#988F81]">/100 · low</span>
              </div>
              <div className="mt-4">
                <Sparkline
                  data={stress}
                  height={48}
                  stroke="#8FBF8F"
                  fill="rgba(143,191,143,0.10)"
                />
              </div>
            </SpotlightCard>
          </div>
        </section>

        {/* sleep */}
        <section className="relative px-6 py-16" aria-labelledby="sleep-heading">
          <div className="mx-auto max-w-6xl rounded-3xl border border-[#2E2A20] bg-[#191611]/80 p-7 sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[#C8A55B]">
                <Moon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                  Last night · sleep architecture
                </span>
              </div>
              <span className="font-serif text-2xl font-semibold tabular-nums text-[#F5EDD8]">
                7h 58m <span className="text-sm font-normal text-[#988F81]">total · score 84</span>
              </span>
            </div>
            <div className="mt-6">
              <SleepBar />
            </div>
          </div>
        </section>

        <Alerts />

        {/* weekly summary + share */}
        <section className="relative px-6 pb-24" aria-labelledby="share-heading">
          <div className="mx-auto max-w-4xl rounded-3xl border border-[#A16207]/40 bg-gradient-to-b from-[#1D1810] to-[#15120C] p-8 text-center sm:p-10">
            <Ornament className="mx-auto mb-6" />
            <h2
              id="share-heading"
              className="font-serif text-2xl font-semibold text-[#F5EDD8] sm:text-3xl"
            >
              Your week, doctor-ready.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#B3A892]">
              One tap compiles seven days of vitals, alerts and trends into a summary your doctor
              can read in ninety seconds — straight into Nexura Connect, or as a PDF.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
              <Magnetic>
                <Link
                  href="/connect"
                  className="btn-gold inline-flex h-11 items-center gap-2 rounded-full px-6 text-[0.95rem] font-medium"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span>Share with my doctor</span>
                </Link>
              </Magnetic>
              <Link
                href="/labs"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#C8A55B] underline-offset-4 hover:underline"
              >
                Pair with lab reports
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#241F16] px-6 py-10 text-center text-xs leading-relaxed text-[#8B8476]">
        Nexura Vitals is a demo experience with simulated device data. Wellness insights, not
        medical advice — always consult your physician.
        <br />A product of Nexura OS
      </footer>
    </div>
  );
}
