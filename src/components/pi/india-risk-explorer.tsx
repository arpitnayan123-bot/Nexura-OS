"use client";

/* ============================================================
 * PIE UI — IndiaRiskExplorer · "Population Efficacy Forecast"
 * The visitor shapes a life (routine, meals, exercise, sleep,
 * city air, family history) and watches 5-year onset risks move
 * live. Runs entirely in the browser on the India-calibrated
 * model: instant, private, deterministic — no login, no data sent.
 * Visual language: PIE "Glassmorphic Futurism" command center.
 * ============================================================ */

import { useMemo, useState } from "react";
import { Footprints, Moon, Sparkles, TrendingDown, Utensils, Wind } from "lucide-react";
import {
  DEFAULT_PROFILE, INDIAN_CITIES, bandOfOnset, computeOnsetRisk, nudgeFor,
  type DiseaseKey, type RiskProfile,
} from "@/modules/pi-engine/india-calibration";

const DISEASES: { key: DiseaseKey; label: string; hint: string }[] = [
  { key: "type2", label: "Type-2 Diabetes", hint: "onset arrives a decade earlier in Indian cohorts" },
  { key: "hypertension", label: "Hypertension", hint: "silent load in 1 of 3 Indian adults" },
  { key: "cardiac", label: "Cardiac Event", hint: "the fastest-rising acute risk nationwide" },
];

const BAND_STYLE: Record<string, string> = {
  low: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
  moderate: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  high: "border-red-400/40 bg-red-500/10 text-red-300",
};

const BAND_LABEL: Record<string, string> = { low: "LOW", moderate: "MODERATE", high: "HIGH" };
const BAR_COLOR: Record<string, string> = {
  low: "bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.6)]",
  moderate: "bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]",
  high: "bg-red-400 shadow-[0_0_10px_rgba(239,68,68,0.6)]",
};

function Slider({
  icon: Icon, label, value, min, max, step, suffix, onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="inline-flex items-center gap-1.5 text-slate-300"><Icon className="h-3.5 w-3.5 text-violet-300" /> {label}</span>
        <span className="font-mono font-semibold tabular-nums text-slate-100">{value} {suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="nxp-range mt-1"
        aria-label={label}
      />
    </div>
  );
}

export function IndiaRiskExplorer() {
  const [profile, setProfile] = useState<RiskProfile>(DEFAULT_PROFILE);
  const result = useMemo(() => computeOnsetRisk(profile), [profile]);
  const nudge = useMemo(() => nudgeFor(profile, result), [profile, result]);

  const set = (patch: Partial<RiskProfile>) => setProfile((p) => ({ ...p, ...patch }));
  const setDiet = (patch: Partial<RiskProfile["diet"]>) => setProfile((p) => ({ ...p, diet: { ...p.diet, ...patch } }));

  const scoreBand = result.earlyWarning > 60 ? "high" : result.earlyWarning > 30 ? "moderate" : "low";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl nxp-glass">
      <div className="border-b border-sky-400/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-300" />
          <h3 className="text-sm font-bold tracking-wide text-slate-100">Population efficacy forecast</h3>
          <span className="ml-auto rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-300">
            India-calibrated
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Shape a routine — meals, movement, sleep, metro air — and the India-calibrated model recomputes five-year onset
          risk in-browser. Nothing leaves the device.
        </p>
      </div>

      <div className="grid flex-1 gap-5 p-5 lg:grid-cols-[1fr_1.1fr]">
        {/* ---------- inputs ---------- */}
        <div className="space-y-4">
          <Slider icon={Sparkles} label="Age" value={profile.age} min={22} max={70} step={1} suffix="yrs" onChange={(v) => set({ age: v })} />
          <Slider icon={Footprints} label="Daily exercise / brisk walking" value={profile.exerciseMinPerDay} min={0} max={60} step={5} suffix="min" onChange={(v) => set({ exerciseMinPerDay: v })} />
          <Slider icon={Moon} label="Sleep" value={profile.sleepHours} min={4} max={9} step={0.5} suffix="h" onChange={(v) => set({ sleepHours: v })} />

          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Utensils className="h-3.5 w-3.5 text-violet-300" /> Routine meals
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {([
                ["outsideFoodOften", "Outside food most days"],
                ["sugaryDrinks", "Daily sugary drinks"],
                ["lateNightMeals", "Dinner after 10 pm"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDiet({ [key]: !profile.diet[key] })}
                  aria-pressed={profile.diet[key]}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                    profile.diet[key]
                      ? "border-violet-400/60 bg-violet-500/20 text-violet-200 shadow-[0_0_14px_-4px_rgba(139,92,246,0.6)]"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-violet-400/40 hover:text-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => set({ familyHistory: !profile.familyHistory })}
              aria-pressed={profile.familyHistory}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                profile.familyHistory ? "border-violet-400/60 bg-violet-500/20 text-violet-200" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-violet-400/40"
              }`}
            >
              First-degree family history
            </button>
            <button
              onClick={() => set({ smoker: !profile.smoker })}
              aria-pressed={profile.smoker}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                profile.smoker ? "border-violet-400/60 bg-violet-500/20 text-violet-200" : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-violet-400/40"
              }`}
            >
              Tobacco use
            </button>
          </div>

          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Wind className="h-3.5 w-3.5 text-violet-300" /> Metro air quality
            </p>
            <select
              value={profile.cityAqi}
              onChange={(e) => set({ cityAqi: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-200 focus:border-cyan-400/50 focus:outline-none"
              aria-label="City air quality"
            >
              {INDIAN_CITIES.map((c) => (
                <option key={c.name} value={c.aqi}>{c.name} — AQI {c.aqi}</option>
              ))}
              <option value={330}>Severe episode — AQI 330</option>
            </select>
          </div>
        </div>

        {/* ---------- outputs ---------- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-sky-400/15 bg-sky-400/[0.04] p-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Early-warning index</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{result.topDriverText}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-sm font-bold tabular-nums ${BAND_STYLE[scoreBand]}`}>
              <span className={`h-2 w-2 rounded-full ${scoreBand === "high" ? "nxp-heartbeat bg-red-400" : scoreBand === "moderate" ? "bg-amber-400" : "bg-cyan-400"}`} aria-hidden="true" />
              {result.earlyWarning}/100
            </span>
          </div>

          {DISEASES.map((d) => {
            const pct = Math.round(result.risks[d.key] * 100);
            const band = bandOfOnset(result.risks[d.key]);
            const width = Math.min(100, (result.risks[d.key] / 0.6) * 100);
            return (
              <div key={d.key} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-100">{d.label}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">{d.hint}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums ${BAND_STYLE[band]}`}>
                      {BAND_LABEL[band]} · {pct}%
                    </span>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-400">5-year onset</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <div className={`h-full rounded-full transition-all duration-500 ${BAR_COLOR[band]}`} style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}

          {nudge && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] p-3.5">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <TrendingDown className="h-3.5 w-3.5" /> Single-change scenario
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">{nudge.label} — early-warning index, recomputed live</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-300 tabular-nums">
                {nudge.from} → {nudge.to}
              </span>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Driver attribution</p>
            <div className="space-y-1.5">
              {result.drivers.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-40 shrink-0 truncate text-xs font-medium text-slate-200">{d.feature}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className={`h-full rounded-full ${d.modifiable ? "bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]" : "bg-slate-500"}`} style={{ width: `${Math.round(d.share * 100)}%` }} />
                  </div>
                  <span className={`w-24 shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.1em] ${d.modifiable ? "text-violet-300" : "text-slate-400"}`}>
                    {d.modifiable ? "Modifiable" : "Fixed factor"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="border-t border-sky-400/10 px-5 py-3 text-[11px] leading-relaxed text-slate-400">
        Calibrated on published Indian epidemiology (ICMR-INDIAB, NFHS-5 pattern studies) — population-level modelling,
        never personal data. Demonstrates Nexura&apos;s reasoning; not a medical diagnosis.
      </p>
    </div>
  );
}
