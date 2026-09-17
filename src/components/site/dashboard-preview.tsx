"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Footprints,
  Moon,
  Droplets,
  Flame,
  Smile,
  ArrowUpRight,
  ArrowDownRight,
  Radio,
} from "lucide-react";
import { Reveal, AuroraBackground, EcgLine, BreathingOrb } from "./ambient";
import { AnimatedNumber } from "./animated-number";
import { cn } from "@/lib/utils";

type Stats = {
  heart: number | null;
  steps: number | null;
  sleep: number | null;
  water: number | null;
  calories: number | null;
  mood: number | null;
  spo2: number | null;
  stress: number | null;
  series: { t: string; v: number }[];
  source?: "db" | "demo";
};

const FALLBACK: Stats = {
  heart: 72,
  steps: 8420,
  sleep: 7.6,
  water: 1.8,
  calories: 1840,
  mood: 86,
  spo2: 98,
  stress: 22,
  // deterministic curve — avoids SSR/client hydration mismatch
  series: Array.from({ length: 14 }).map((_, i) => ({
    t: `${i * 2}:00`,
    v: 64 + Math.round(Math.sin(i / 1.7) * 9 + Math.cos(i / 2.3) * 5),
  })),
};

export function DashboardPreview() {
  const [stats, setStats] = useState<Stats>(FALLBACK);
  const [live, setLive] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/health-stats", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as Stats;
        if (active) setStats(data);
      } catch {
        /* keep fallback */
      }
    };
    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // gentle live jitter on heart rate
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      setStats((s) => ({
        ...s,
        heart:
          s.heart != null
            ? Math.max(58, Math.min(86, s.heart + (Math.random() > 0.5 ? 1 : -1)))
            : null,
      }));
    }, 1400);
    return () => clearInterval(id);
  }, [live]);

  return (
    <section id="dashboard" className="relative overflow-hidden py-24 lg:py-32">
      <AuroraBackground variant="default" className="opacity-70" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Radio className="h-3.5 w-3.5 text-coral anim-breathe" />
              Live operating room
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Your body,{" "}
              <span className="text-gradient-warm">in one calm view.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-4 text-muted-foreground sm:text-lg">
              A live preview of the Nexura OS patient console — every number is
              streaming, every insight is yours.
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.16} y={36}>
          <Dashboard stats={stats} live={live} onToggle={() => setLive((v) => !v)} />
        </Reveal>
      </div>
    </section>
  );
}

function Dashboard({
  stats,
  live,
  onToggle,
}: {
  stats: Stats;
  live: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-3 shadow-[0_40px_120px_-50px_oklch(0.4_0.05_45/0.45)] sm:p-5">
      {/* top bar */}
      <div className="flex items-center justify-between gap-3 px-2 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.80_0.13_15)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-honey" />
            <span className="h-2.5 w-2.5 rounded-full bg-sage" />
          </span>
          <span className="ml-2 font-display text-sm font-semibold">
            nexura · patient console
          </span>
        </div>
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            live ? "bg-sage/30 text-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-sage anim-breathe" : "bg-muted-foreground")} />
          {live ? "Live" : "Paused"}
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        {/* Hero vitals card */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[oklch(0.70_0.145_45)] to-[oklch(0.62_0.10_30)] p-5 text-primary-foreground lg:col-span-5">
          <div className="absolute -right-8 -top-8 opacity-30">
            <BreathingOrb size={180} color="white" ring={false} />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground/80">
                Heart rate
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[0.65rem]">
                <span className="h-1.5 w-1.5 rounded-full bg-white anim-breathe" />
                streaming
              </span>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <AnimatedNumber
                value={stats.heart ?? 0}
                format="plain"
                className="font-display text-6xl font-semibold leading-none"
              />
              <span className="mb-1 text-sm text-primary-foreground/80">bpm</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-primary-foreground/80">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="h-3.5 w-3.5" /> normal range
              </span>
              <span className="opacity-40">·</span>
              <span>resting baseline 68</span>
            </div>
            <div className="mt-4 rounded-xl bg-white/10 p-3 backdrop-blur">
              <EcgLine width={420} height={50} color="white" className="w-full" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat label="SpO₂" value={stats.spo2 ?? "—"} suffix={stats.spo2 != null ? "%" : undefined} tone="light" />
              <MiniStat
                label="Stress"
                value={stats.stress ?? "—"}
                suffix={stats.stress != null ? "/100" : undefined}
                tone="light"
                low
              />
            </div>
          </div>
        </div>

        {/* Activity chart */}
        <div className="rounded-2xl border border-border bg-background/60 p-5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Heart rate · 24h
              </p>
              <p className="mt-1 font-display text-lg font-semibold">
                Daily rhythm
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-coral" /> bpm
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sage/60" /> baseline
              </span>
            </div>
          </div>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.series} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-bpm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--coral)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--coral)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[40, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="var(--coral)"
                  strokeWidth={2.5}
                  fill="url(#g-bpm)"
                  isAnimationActive
                  animationDuration={1400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metric tiles */}
        <MetricTile
          icon={Footprints}
          label="Steps"
          value={stats.steps}
          delta="+12%"
          tone="sage"
          className="lg:col-span-3"
        />
        <MetricTile
          icon={Moon}
          label="Sleep"
          value={stats.sleep}
          suffix="h"
          delta="+0.4h"
          tone="honey"
          className="lg:col-span-3"
        />
        <MetricTile
          icon={Droplets}
          label="Hydration"
          value={stats.water ?? "—"}
          suffix={stats.water != null ? "L" : undefined}
          delta={stats.water != null ? "+0.3L" : "log to track"}
          tone="default"
          className="lg:col-span-3"
        />
        <MetricTile
          icon={Flame}
          label="Calories"
          value={stats.calories}
          delta="-5%"
          tone="clay"
          negative
          className="lg:col-span-3"
        />

        {/* Mood ring + adherence */}
        <div className="rounded-2xl border border-border bg-background/60 p-5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Mood &amp; recovery
              </p>
              <p className="mt-1 font-display text-lg font-semibold">
                Wellbeing index
              </p>
            </div>
            <Smile className="h-5 w-5 text-honey" />
          </div>
          <div className="mt-3 flex items-center gap-5">
            <MoodRing value={stats.mood ?? 0} />
            <div className="flex-1 space-y-2.5">
              {[
                { label: "Sleep quality", v: 78, c: "var(--sage)" },
                { label: "Recovery", v: 64, c: "var(--honey)" },
                { label: "Stability", v: 88, c: "var(--coral)" },
              ].map((m, i) => (
                <Bar key={m.label} label={m.label} v={m.v} c={m.c} delay={i * 0.12} />
              ))}
            </div>
          </div>
        </div>

        {/* Medication adherence */}
        <div className="rounded-2xl border border-border bg-background/60 p-5 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Today
              </p>
              <p className="mt-1 font-display text-lg font-semibold">
                Medication adherence
              </p>
            </div>
            <span className="rounded-full bg-sage/25 px-2.5 py-1 text-xs font-medium text-foreground">
              3 of 4
            </span>
          </div>
          <div className="mt-4 space-y-2.5">
            {[
              { t: "08:00", name: "Vitamin D", done: true },
              { t: "13:00", name: "Magnesium", done: true },
              { t: "18:00", name: "Omega-3", done: true },
              { t: "22:00", name: "Melatonin", done: false },
            ].map((m) => (
              <div
                key={m.t}
                className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-full text-[0.65rem] font-semibold",
                      m.done
                        ? "bg-sage/30 text-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {m.done ? "✓" : "•"}
                  </span>
                  <span className="font-medium">{m.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{m.t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sleep stages — second visualization */}
        <div className="rounded-2xl border border-border bg-background/60 p-5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Last night · sleep
              </p>
              <p className="mt-1 font-display text-lg font-semibold">
                {stats.sleep != null ? `${stats.sleep}h across ${SleepStages.stages.length} cycles` : "Sleep data streams from your paired devices"}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[0.65rem] text-muted-foreground">
              {SleepStages.legend.map((l) => (
                <span key={l.label} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: l.color }}
                  />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <SleepStagesChart />
        </div>

        {/* Care insights — AI summary */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-background p-5 lg:col-span-5">
          <div className="pointer-events-none absolute -right-6 -top-6 opacity-30">
            <BreathingOrb size={120} color="var(--sage)" ring={false} />
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Nexa · daily insight
              </p>
              <p className="mt-1 font-display text-lg font-semibold">
                Calmer than yesterday
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-sage/25 px-2.5 py-1 text-[0.65rem] font-medium text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-sage anim-breathe" />
              generated 2m ago
            </span>
          </div>
          <p className="relative mt-3 text-sm leading-relaxed text-foreground/85">
            Your resting heart rate dropped 4 bpm overnight and your recovery
            index climbed. A short walk after lunch would lock in today&apos;s
            momentum.
          </p>
          <div className="relative mt-4 flex items-center gap-2">
            <span className="rounded-full bg-accent/50 px-2.5 py-1 text-[0.65rem] font-medium text-foreground">
              + recovery
            </span>
            <span className="rounded-full bg-accent/50 px-2.5 py-1 text-[0.65rem] font-medium text-foreground">
              + sleep
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-[0.65rem] font-medium text-muted-foreground">
              ~ stress
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Sleep stages hypnogram-style bar chart */
const SleepStages = {
  legend: [
    { label: "Deep", color: "var(--clay)" },
    { label: "Light", color: "var(--honey)" },
    { label: "REM", color: "var(--sage)" },
    { label: "Awake", color: "var(--muted-foreground)" },
  ],
  stages: [
    { h: 0, deep: 20, light: 35, rem: 0, awake: 5 },
    { h: 1, deep: 28, light: 30, rem: 0, awake: 2 },
    { h: 2, deep: 18, light: 40, rem: 5, awake: 0 },
    { h: 3, deep: 10, light: 38, rem: 15, awake: 0 },
    { h: 4, deep: 5, light: 35, rem: 22, awake: 3 },
    { h: 5, deep: 0, light: 30, rem: 28, awake: 2 },
    { h: 6, deep: 0, light: 20, rem: 15, awake: 5 },
    { h: 7, deep: 0, light: 10, rem: 5, awake: 10 },
  ],
};

function SleepStagesChart() {
  const data = SleepStages.stages;
  return (
    <div className="mt-4">
      {/* stacked bars: each hour is a column; segments stack bottom→top
          deep (bottom) → light → rem → awake (top) */}
      <div className="flex h-32 items-end gap-2">
        {data.map((d, i) => {
          const total = d.deep + d.light + d.rem + d.awake;
          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center gap-1.5"
            >
              <div className="relative flex h-full w-full flex-col-reverse justify-start overflow-hidden rounded-lg bg-muted/30">
                <motion.div
                  className="w-full"
                  style={{ background: "var(--clay)" }}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(d.deep / total) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.06 }}
                />
                <motion.div
                  className="w-full"
                  style={{ background: "var(--honey)" }}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(d.light / total) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.06 + 0.1 }}
                />
                <motion.div
                  className="w-full"
                  style={{ background: "var(--sage)" }}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(d.rem / total) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.06 + 0.2 }}
                />
                <motion.div
                  className="w-full"
                  style={{ background: "var(--muted-foreground)" }}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(d.awake / total) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.06 + 0.3 }}
                />
                {/* tooltip on hover */}
                <div className="pointer-events-none absolute inset-x-0 -top-7 hidden justify-center group-hover:flex">
                  <span className="rounded bg-foreground px-1.5 py-0.5 text-[0.6rem] text-background">
                    {d.h}:00
                  </span>
                </div>
              </div>
              <span className="text-[0.6rem] text-muted-foreground">{d.h}h</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  suffix,
  low,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  tone?: "light" | "dark";
  low?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/12 p-3 backdrop-blur">
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-primary-foreground/70">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold">
        {value}
        <span className="ml-0.5 text-xs font-normal text-primary-foreground/70">
          {suffix}
        </span>
      </p>
      {low && (
        <p className="mt-0.5 text-[0.65rem] text-primary-foreground/70">low · calm</p>
      )}
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  suffix,
  delta,
  tone,
  negative,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string; // string = em-dash placeholder for unmeasured metrics
  suffix?: string;
  delta: string;
  tone: "sage" | "honey" | "clay" | "default";
  negative?: boolean;
  className?: string;
}) {
  const colors = {
    sage: "var(--sage)",
    honey: "var(--honey)",
    clay: "var(--clay)",
    default: "var(--coral)",
  } as const;
  return (
    <div className={cn("group relative overflow-hidden rounded-2xl border border-border bg-background/60 p-4", className)}>
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-60"
        style={{ background: colors[tone] }}
      />
      <div className="relative flex items-center justify-between">
        <span
          className="grid h-9 w-9 place-items-center rounded-lg"
          style={{ background: `color-mix(in oklch, ${colors[tone]} 16%, transparent)`, color: colors[tone] }}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span
          className={cn(
            "flex items-center gap-0.5 text-[0.7rem] font-medium",
            negative ? "text-destructive" : "text-foreground/70"
          )}
        >
          {negative ? (
            <ArrowDownRight className="h-3 w-3" />
          ) : (
            <ArrowUpRight className="h-3 w-3" />
          )}
          {delta}
        </span>
      </div>
      <p className="relative mt-3 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="relative mt-0.5 font-display text-2xl font-semibold">
        {typeof value === "number" ? <AnimatedNumber value={value} format="comma" /> : value}
        {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}

function MoodRing({ value }: { value: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--honey)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c - (value / 100) * c }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="text-center">
        <p className="font-display text-2xl font-semibold text-gradient-warm">
          {value}
        </p>
        <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
          index
        </p>
      </div>
    </div>
  );
}

function Bar({
  label,
  v,
  c,
  delay,
}: {
  label: string;
  v: number;
  c: string;
  delay: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{v}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ background: c }}
          initial={{ width: 0 }}
          whileInView={{ width: `${v}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
