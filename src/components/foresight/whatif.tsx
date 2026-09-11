"use client";

/* ============================================================
 * FORESIGHT WHAT-IF STUDIO — the interactive lever board.
 *
 * The engine is a pure deterministic function, so the browser
 * can replay it instantly: toggle a lifestyle lever, re-run
 * `runForesight` on a modified copy of YOUR normalized input,
 * and watch the halo/score respond live. No server round-trip,
 * no fabricated numbers — the exact same versioned engine.
 *
 * SAFETY POSTURE:
 *  - lifestyle levers only. Labs, symptoms and vitals are
 *    never "toggled away" — you cannot simulate away an HbA1c.
 *  - levers auto-disable when already optimal (honest baseline).
 *  - copy repeats: simulation ≠ prediction ≠ promise.
 * ============================================================ */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { FlaskConical, RotateCcw, TrendingUp } from "lucide-react";
import { runForesight } from "@/modules/foresight/engine";
import type { DomainResult, ForesightInput, ForesightReport } from "@/modules/foresight/types";
import { DOMAIN_META } from "./viz";
import { Eyebrow, GlassCard, fadeUp } from "./ui";
import { cn } from "@/lib/utils";

export interface Scenario {
  id: string;
  label: string;
  hint: string;
  /** Only offer the lever when it can actually move something. */
  available: (i: ForesightInput) => boolean;
  apply: (i: ForesightInput) => ForesightInput;
}

const bandOrd = (b: string) => ["THRIVING", "RESILIENT", "BUILDING", "ATTENTION"].indexOf(b);

export const SCENARIOS: Scenario[] = [
  {
    id: "walk",
    label: "30-min brisk walk, 5 days a week",
    hint: "150 min/week — the single most evidence-backed lever",
    available: (i) => i.activity.minutesPerWeek < 150,
    apply: (i) => ({ ...i, activity: { ...i.activity, minutesPerWeek: 150 } }),
  },
  {
    id: "sleep",
    label: "7–8 h sleep, regular schedule",
    hint: "screens off before bed, steady rhythm",
    available: (i) => i.sleep.hoursPerNight < 7 || i.sleep.hoursPerNight > 9 || i.sleep.schedule === "irregular",
    apply: (i) => ({ ...i, sleep: { ...i.sleep, hoursPerNight: 7.5, schedule: "regular", screensBeforeBed: false } }),
  },
  {
    id: "sugary",
    label: "Sugary drinks → chaas / nimbu-pani / water",
    hint: "the fastest liquid-sugar cut in any Indian kitchen",
    available: (i) => i.diet.sugaryDrinksPerWeek !== "none",
    apply: (i) => ({ ...i, diet: { ...i.diet, sugaryDrinksPerWeek: "none" } }),
  },
  {
    id: "sweets",
    label: "Mithai → 2–3× a week, after a meal",
    hint: "katori rule — one katori is one serving",
    available: (i) => i.diet.sweetsPerWeek === "weekly" || i.diet.sweetsPerWeek === "daily",
    apply: (i) => ({ ...i, diet: { ...i.diet, sweetsPerWeek: "rare" } }),
  },
  {
    id: "fried",
    label: "Fried snacks → steamed / grilled / roasted",
    hint: "pakora → dhokla, puri → tandoori roti",
    available: (i) => i.diet.friedPerWeek === "weekly" || i.diet.friedPerWeek === "daily",
    apply: (i) => ({ ...i, diet: { ...i.diet, friedPerWeek: "rare" } }),
  },
  {
    id: "protein_breakfast",
    label: "No more skipped breakfasts",
    hint: "protein-first morning blunts evening cravings",
    available: (i) => i.diet.breakfastSkipped,
    apply: (i) => ({ ...i, diet: { ...i.diet, breakfastSkipped: false } }),
  },
  {
    id: "waist",
    label: "Waist −4 cm (≈ 3 kg down)",
    hint: "the strongest single signal for South-Asian bodies",
    available: (i) => (i.profile.waistCm ?? 0) > 80,
    apply: (i) => ({
      ...i,
      profile: {
        ...i.profile,
        waistCm: Math.max(50, (i.profile.waistCm ?? 80) - 4),
        weightKg: i.profile.weightKg != null ? Math.max(25, i.profile.weightKg - 3) : undefined,
      },
    }),
  },
  {
    id: "tobacco",
    label: "Quit tobacco completely",
    hint: "smoked or chewed — the map responds within months",
    available: (i) => i.history.tobacco !== "never",
    apply: (i) => ({ ...i, history: { ...i.history, tobacco: "never" } }),
  },
  {
    id: "stress",
    label: "Daily stress practice → low load",
    hint: "10 min pranayama / walk / prayer — measured, not vibes",
    available: (i) => i.history.stress !== "low",
    apply: (i) => ({ ...i, history: { ...i.history, stress: "low" } }),
  },
];

export function applyScenarios(base: ForesightInput, ids: string[]): ForesightInput {
  let out = base;
  for (const id of ids) {
    const s = SCENARIOS.find((x) => x.id === id);
    if (s) out = s.apply(out);
  }
  return out;
}

/* ---------------- the studio panel ---------------- */

export function WhatIfStudio({
  baseInput, baseReport, active, onChange,
}: {
  baseInput: ForesightInput;
  baseReport: ForesightReport;
  active: string[];
  onChange: (ids: string[]) => void;
}) {
  const simReport = useMemo(
    () => (active.length ? runForesight(applyScenarios(baseInput, active)) : null),
    [baseInput, active]
  );

  const delta = simReport ? simReport.foresightScore - baseReport.foresightScore : 0;
  const bandMove = simReport
    ? bandOrd(simReport.scoreBand) - bandOrd(baseReport.scoreBand)
    : 0;

  const domainDeltas: { d: DomainResult; diff: number }[] = useMemo(() => {
    if (!simReport) return [];
    return simReport.domains
      .map((d) => {
        const base = baseReport.domains.find((b) => b.id === d.id);
        return { d, diff: (base ? base.burden : 0) - d.burden };
      })
      .filter((x) => Math.abs(x.diff) >= 1)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 4);
  }, [simReport, baseReport]);

  const toggle = (id: string) =>
    onChange(active.includes(id) ? active.filter((x) => x !== id) : [...active, id]);

  return (
    <GlassCard className="relative overflow-hidden p-5 sm:p-7" {...fadeUp}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow className="mb-2">What-if studio · live engine replay</Eyebrow>
          <h2 className="font-display text-xl font-semibold tracking-tight nxf-hi sm:text-2xl">
            Bend the curve — see what each change is worth
          </h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed nxf-dim">
            Flip a lever and the same versioned engine re-runs instantly on your signals —
            the halo above responds live. This is the honest math of your own pattern, not a promise.
          </p>
        </div>
        <FlaskConical className="hidden h-6 w-6 nxf-gold sm:block" aria-hidden="true" />
      </div>

      {/* levers */}
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="What-if levers">
        {SCENARIOS.map((s) => {
          const usable = s.available(baseInput);
          const on = active.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              disabled={!usable}
              onClick={() => toggle(s.id)}
              title={usable ? s.hint : "Already in a good place — no simulated change needed"}
              className={cn(
                "nxf-pill",
                on && "!border-amber-300/70 !bg-amber-300/[0.16] !text-amber-100",
                !usable && "cursor-default opacity-45"
              )}
            >
              <span aria-hidden="true" className={cn("text-[11px]", on ? "nxf-gold" : "nxf-mute")}>
                {usable ? (on ? "✦" : "○") : "✓"}
              </span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* readout */}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        {simReport && delta !== 0 ? (
          <motion.div
            key={delta}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-baseline gap-2 rounded-2xl border border-amber-300/40 bg-amber-300/[0.10] px-4 py-3"
          >
            <TrendingUp className="h-5 w-5 self-center nxf-gold" aria-hidden="true" />
            <span className="nxf-mono text-3xl font-bold nxf-gold">
              {delta > 0 ? `+${delta}` : delta}
            </span>
            <span className="text-[12px] nxf-dim">
              foresight score<br />
              {bandMove > 0 ? (
                <span className="font-semibold nxf-gold">band improved → {simReport.scoreBand}</span>
              ) : bandMove < 0 ? (
                <span className="font-semibold nxf-rose">band slipped — unlikely, review levers</span>
              ) : (
                <span>same band ({simReport.scoreBand})</span>
              )}
            </span>
          </motion.div>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] nxf-mute">
            {active.length === 0
              ? "Toggle a lever — the halo above re-draws with the simulated pattern."
              : "±0 on the composite for this mix — the engine won't inflate a lever that doesn't move your pattern."}
          </p>
        )}

        {domainDeltas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {domainDeltas.map(({ d, diff }) => (
              <span
                key={d.id}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[11.5px] font-semibold",
                  diff > 0
                    ? "border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-200"
                    : "border-rose-300/30 bg-rose-300/[0.06] text-rose-200"
                )}
              >
                {DOMAIN_META[d.id]?.label ?? d.id} burden {diff > 0 ? "−" : "+"}
                {Math.abs(diff)}
              </span>
            ))}
          </div>
        )}

        {active.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-[12.5px] font-semibold nxf-body transition hover:border-amber-300/50 hover:text-amber-100"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset simulation
          </button>
        )}
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed nxf-mute">
        Simulation on the signals you shared today — it is not a prediction of outcomes and not medical
        advice. Labs anchor your map: when a lab signal dominates, lifestyle levers move the composite
        less, because pretending otherwise would be a lie. Re-run a real check-in after 8–12 weeks of
        change and compare the two maps.
      </p>
    </GlassCard>
  );
}
