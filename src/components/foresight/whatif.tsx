"use client";

/* ============================================================
 * SCENARIO PLANNING — the formal what-if lab.
 *
 * Three named scenarios over the SAME deterministic engine:
 *   · Baseline        — your pattern exactly as shared
 *   · Committed plan  — every available lifestyle lever, on
 *   · Custom mix      — your own lever selection
 *
 * The selection drives EVERYTHING above it (halo, forecast
 * chart, metrics) through the parent's simIds state, so no two
 * sections can ever disagree. Labs/vitals/symptoms are never
 * togglable — you cannot simulate away an HbA1c.
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

export type ScenarioMode = "baseline" | "plan" | "custom";

export function ScenarioLab({
  baseInput,
  baseReport,
  mode,
  onMode,
  customIds,
  onCustomIds,
  simReport,
}: {
  baseInput: ForesightInput;
  baseReport: ForesightReport;
  mode: ScenarioMode;
  onMode: (m: ScenarioMode) => void;
  customIds: string[];
  onCustomIds: (ids: string[]) => void;
  simReport: ForesightReport | null;
}) {
  const availableIds = useMemo(() => SCENARIOS.filter((s) => s.available(baseInput)).map((s) => s.id), [baseInput]);

  const delta = simReport ? simReport.foresightScore - baseReport.foresightScore : 0;
  const bandMove = simReport ? bandOrd(simReport.scoreBand) - bandOrd(baseReport.scoreBand) : 0;

  /* scenario endpoint comparison (engine's own trajectory endpoints) */
  const scenarios: { key: ScenarioMode; name: string; today: number; at: number; note: string }[] = useMemo(() => {
    const planReport = runForesight(applyScenarios(baseInput, availableIds));
    return [
      { key: "baseline", name: "Baseline — as shared", today: baseReport.foresightScore, at: baseReport.trajectory.unchangedScore, note: "your current pattern, five years out" },
      { key: "plan", name: "Committed plan", today: planReport.foresightScore, at: planReport.trajectory.withActionsScore, note: `all ${availableIds.length} available levers held for five years` },
      {
        key: "custom",
        name: "Custom mix",
        today: simReport && customIds.length ? simReport.foresightScore : baseReport.foresightScore,
        at: simReport && customIds.length ? simReport.trajectory.unchangedScore : baseReport.trajectory.unchangedScore,
        note: customIds.length ? `${customIds.length} lever${customIds.length === 1 ? "" : "s"} of your choosing` : "toggle levers below to build yours",
      },
    ];
  }, [baseInput, baseReport, availableIds, simReport, customIds]);

  const domainDeltas: { d: DomainResult; diff: number }[] = useMemo(() => {
    if (!simReport || customIds.length === 0) return [];
    return simReport.domains
      .map((d) => {
        const base = baseReport.domains.find((b) => b.id === d.id);
        return { d, diff: (base ? base.burden : 0) - d.burden };
      })
      .filter((x) => Math.abs(x.diff) >= 1)
      .sort((a, b) => b.diff - a.diff)
      .slice(0, 4);
  }, [simReport, baseReport, customIds]);

  const appliedLevers = useMemo(() => {
    const ids = mode === "plan" ? availableIds : customIds;
    return SCENARIOS.filter((s) => ids.includes(s.id));
  }, [mode, availableIds, customIds]);

  const toggleCustom = (id: string) =>
    onCustomIds(customIds.includes(id) ? customIds.filter((x) => x !== id) : [...customIds, id]);

  return (
    <GlassCard className="relative overflow-hidden p-5 sm:p-7" {...fadeUp}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow className="mb-2">Scenario planning · live engine replay</Eyebrow>
          <h2 className="font-display text-xl font-semibold tracking-tight nxf-hi sm:text-2xl">
            Three futures, one honest engine
          </h2>
          <p className="mt-1 max-w-xl text-[13px] leading-relaxed nxf-dim">
            Pick a scenario and the same versioned engine re-runs instantly on your signals — the halo, the
            forecast chart and every metric above move together. Direction, not destiny.
          </p>
        </div>
        <FlaskConical className="hidden h-6 w-6 nxf-gold sm:block" aria-hidden="true" />
      </div>

      {/* scenario selector */}
      <div className="nxf-seg mt-5 w-fit" role="radiogroup" aria-label="Scenario">
        {([
          { key: "baseline", label: "Baseline" },
          { key: "plan", label: "Committed plan" },
          { key: "custom", label: "Custom mix" },
        ] as const).map((s) => (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={mode === s.key}
            onClick={() => onMode(s.key)}
            className={cn("nxf-seg-btn", mode === s.key && "nxf-seg-on")}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* outcome cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-live="polite">
        {scenarios.map((s) => {
          const dToday = s.today - baseReport.foresightScore;
          const dAt = s.at - baseReport.trajectory.unchangedScore;
          const active = mode === s.key;
          return (
            <div
              key={s.key}
              className={cn(
                "rounded-2xl border p-4 transition",
                active ? "border-amber-300/55 bg-amber-300/[0.08]" : "border-white/[0.09] bg-white/[0.03]"
              )}
            >
              <p className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.12em] nxf-mute">
                {s.name}
                {active && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-300 nxf-pulse-dot" />}
              </p>
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="font-display text-[1.65rem] font-semibold leading-none nxf-hi">{s.today}</span>
                <span className="text-[11.5px] nxf-mute">today</span>
                {dToday !== 0 && (
                  <span className={cn("text-[11.5px] font-bold", dToday > 0 ? "nxf-teal" : "text-rose-300")}>
                    {dToday > 0 ? `+${dToday}` : dToday}
                  </span>
                )}
              </p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display text-[1.65rem] font-semibold leading-none nxf-hi">{s.at}</span>
                <span className="text-[11.5px] nxf-mute">at +5y</span>
                {dAt !== 0 && (
                  <span className={cn("text-[11.5px] font-bold", dAt > 0 ? "nxf-teal" : "text-rose-300")}>
                    {dAt > 0 ? `+${dAt}` : dAt}
                  </span>
                )}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed nxf-mute">{s.note}</p>
            </div>
          );
        })}
      </div>

      {/* custom levers */}
      {mode === "custom" && (
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Custom levers">
          {SCENARIOS.map((s) => {
            const usable = s.available(baseInput);
            const on = customIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                disabled={!usable}
                onClick={() => toggleCustom(s.id)}
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
      )}

      {/* assumptions + readout */}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1 rounded-2xl border border-white/[0.09] bg-white/[0.03] p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] nxf-mute">Assumptions in this scenario</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed nxf-dim">
            {appliedLevers.length === 0
              ? "None — your pattern exactly as you shared it. Labs, vitals and symptoms stay fixed in every scenario; the engine will not pretend a test result away."
              : appliedLevers.map((l) => l.label).join(" · ") + ". Labs, vitals and symptoms stay fixed — no simulated test results."}
          </p>
        </div>

        {simReport && delta !== 0 && (
          <motion.div
            key={delta}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-baseline gap-2 rounded-2xl border border-amber-300/40 bg-amber-300/[0.10] px-4 py-3"
          >
            <TrendingUp className="h-5 w-5 self-center nxf-gold" aria-hidden="true" />
            <span className="nxf-mono text-3xl font-bold nxf-gold">{delta > 0 ? `+${delta}` : delta}</span>
            <span className="text-[12px] nxf-dim">
              vs your saved run
              <br />
              {bandMove > 0 ? (
                <span className="font-semibold nxf-gold">band improved → {simReport.scoreBand}</span>
              ) : bandMove < 0 ? (
                <span className="font-semibold text-rose-300">band slipped — review levers</span>
              ) : (
                <span>same band ({simReport.scoreBand})</span>
              )}
            </span>
          </motion.div>
        )}

        {mode !== "baseline" && (
          <button
            type="button"
            onClick={() => { onMode("baseline"); onCustomIds([]); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-[12.5px] font-semibold nxf-body transition hover:border-amber-300/50 hover:text-amber-100"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Reset to baseline
          </button>
        )}
      </div>

      {/* per-domain deltas for the active custom mix */}
      {domainDeltas.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-live="polite">
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

      <p className="mt-4 text-[11.5px] leading-relaxed nxf-mute">
        Simulations replay the exact versioned engine on the signals you shared today — they are not
        predictions of outcomes and not medical advice. Labs anchor your map: when a lab signal dominates,
        lifestyle levers move the composite less, because pretending otherwise would be a lie. Re-run a real
        check-in after 8–12 weeks of change and compare the two maps.
      </p>
    </GlassCard>
  );
}
