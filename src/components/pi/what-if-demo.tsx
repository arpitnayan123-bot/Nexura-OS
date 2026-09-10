"use client";

/* ============================================================
 * PIE UI — WhatIfDemo
 * A fully self-contained, public-safe What-If simulator: the
 * intervention catalog and projection math run entirely in the
 * browser on a baked-in demo twin — no API, no auth, no PHI.
 * Visual language matches the clinician TwinSimulator.
 * ============================================================ */

import { useMemo, useState } from "react";
import { FlaskConical, Loader2, TrendingDown, TrendingUp } from "lucide-react";

interface DemoIntervention {
  id: string;
  label: string;
  kind: "medication" | "lifestyle";
  /** points removed from the 90-day decay risk per day adopted */
  dailyDelta: number;
  horizonDays: number;
  outcomes: { label: string; delta: string; direction: "better" | "worse" | "neutral" }[];
  caveat: string;
}

const CATALOG: DemoIntervention[] = [
  {
    id: "walk30",
    label: "Walk 30 min / day",
    kind: "lifestyle",
    dailyDelta: 0.09,
    horizonDays: 90,
    outcomes: [
      { label: "Metabolic strain", delta: "−7 pts", direction: "better" },
      { label: "Resting HR (12 wk)", delta: "−4 bpm", direction: "better" },
      { label: "Adherence needed", delta: "5 days / wk", direction: "neutral" },
    ],
    caveat: "Projection assumes moderate intensity; knee or cardiac conditions should be cleared with your clinician first.",
  },
  {
    id: "metformin",
    label: "Metformin +500 mg",
    kind: "medication",
    dailyDelta: 0.12,
    horizonDays: 90,
    outcomes: [
      { label: "HbA1c (3 mo)", delta: "−0.5%", direction: "better" },
      { label: "Renal filtration load", delta: "+2% risk", direction: "worse" },
      { label: "Hypoglycemia risk", delta: "low", direction: "neutral" },
    ],
    caveat: "eGFR is checked before and during therapy — the twin flags the renal trade-off automatically for your doctor.",
  },
  {
    id: "med-diet",
    label: "Mediterranean diet",
    kind: "lifestyle",
    dailyDelta: 0.07,
    horizonDays: 90,
    outcomes: [
      { label: "LDL cholesterol", delta: "−9 mg/dL", direction: "better" },
      { label: "Inflammation (hsCRP)", delta: "−14%", direction: "better" },
      { label: "Gut comfort", delta: "improves", direction: "better" },
    ],
    caveat: "Diet shifts compound slowly — the twin shows the curve bending from week 3, not day 1.",
  },
  {
    id: "sleep8",
    label: "Sleep 7–8 h",
    kind: "lifestyle",
    dailyDelta: 0.05,
    horizonDays: 90,
    outcomes: [
      { label: "HRV recovery", delta: "+6 ms", direction: "better" },
      { label: "BP variability", delta: "−5%", direction: "better" },
      { label: "Daytime strain", delta: "−3 pts", direction: "better" },
    ],
    caveat: "Sleep works through recovery physiology — benefits appear in your wearable stream within 2 weeks.",
  },
];

const BASELINE_90D = 58; // demo twin's projected 90-day decay risk (watchlist band)

function projectCurve(selected: DemoIntervention[]): number[] {
  const days = 30;
  const pts: number[] = [];
  for (let d = 0; d <= days; d++) {
    const adopted = selected.reduce(
      (acc, s) => acc + (d >= s.horizonDays * 0.15 ? s.dailyDelta : (s.dailyDelta * d) / (s.horizonDays * 0.15)),
      0
    );
    // risk decays from BASELINE toward a floor as interventions compound
    pts.push(Math.max(12, Math.round((BASELINE_90D - adopted * (days / 90) * 100) * 10) / 10));
  }
  return pts;
}

function Curve({ points }: { points: number[] }) {
  const w = 320;
  const h = 72;
  const max = 70;
  const min = 10;
  const step = w / (points.length - 1);
  const y = (v: number) => h - ((v - min) / (max - min)) * h;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const stroke = last > 70 ? "#f43f5e" : last > 30 ? "#f59e0b" : "#10b981";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" role="img" aria-label="Projected 90-day decay risk curve">
      <line x1="0" y1={y(BASELINE_90D)} x2={w} y2={y(BASELINE_90D)} stroke="currentColor" strokeDasharray="4 4" className="text-black/15 dark:text-white/15" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WhatIfDemo() {
  const [selected, setSelected] = useState<string[]>(["walk30"]);
  const [simulating, setSimulating] = useState(false);
  const [committed, setCommitted] = useState<string[] | null>(null);

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur.slice(-3), id]));
  }

  function run() {
    if (!selected.length) return;
    setSimulating(true);
    // small delay so the "running on the twin" moment reads as intentional
    setTimeout(() => {
      setCommitted([...selected]);
      setSimulating(false);
    }, 600);
  }

  const chosen = useMemo(
    () => (committed ?? []).map((id) => CATALOG.find((c) => c.id === id)).filter((x): x is DemoIntervention => Boolean(x)),
    [committed]
  );
  const points = useMemo(() => projectCurve(chosen), [chosen]);
  const projected = points[points.length - 1];
  const delta = Math.round((projected - BASELINE_90D) * 10) / 10;

  return (
    <div className="rounded-2xl border border-violet-200/60 bg-violet-50/40 p-5 dark:border-violet-900/50 dark:bg-violet-950/20">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        <h3 className="text-sm font-semibold">Try the What-If Simulator</h3>
        <span className="text-[10px] text-muted-foreground">· runs on a demo Living Twin</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Pick interventions and watch the 90-day health-decay curve bend — exactly what clinicians see in the deep dive.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CATALOG.map((c) => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              selected.includes(c.id)
                ? "border-violet-500 bg-violet-600 text-white dark:bg-violet-600"
                : "border-black/10 bg-white/70 hover:border-violet-400 dark:border-white/15 dark:bg-white/5"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <button
        onClick={run}
        disabled={simulating || !selected.length}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
      >
        {simulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
        Simulate {selected.length ? `(${selected.length})` : ""}
      </button>

      {committed && (
        <div className="mt-4 rounded-xl border border-black/8 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold">90-day decay risk projection</p>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                delta < -2
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : delta > 0
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                    : "bg-black/5 text-muted-foreground dark:bg-white/10"
              }`}
            >
              {delta < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              {delta > 0 ? "+" : ""}
              {delta} pts · {projected.toFixed(0)}/100
            </span>
          </div>
          <div className="mt-2">
            <Curve points={points} />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Dashed line: today&apos;s baseline ({BASELINE_90D}). Solid curve: your twin&apos;s projection with{" "}
              {chosen.length} intervention{chosen.length === 1 ? "" : "s"} over 90 days.
            </p>
          </div>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {chosen.flatMap((c) =>
              c.outcomes.map((l, i) => (
                <li key={`${c.id}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-black/[0.02] px-2.5 py-1.5 text-[11px] dark:bg-white/5">
                  <span className="text-muted-foreground">{l.label}</span>
                  <span
                    className={`font-semibold ${
                      l.direction === "better" ? "text-emerald-600 dark:text-emerald-400" : l.direction === "worse" ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                    }`}
                  >
                    {l.delta}
                  </span>
                </li>
              ))
            )}
          </ul>
          {chosen[0] && (
            <p className="mt-2 border-t border-dashed border-black/10 pt-2 text-[10px] leading-relaxed text-muted-foreground dark:border-white/10">
              {chosen[0].caveat}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
