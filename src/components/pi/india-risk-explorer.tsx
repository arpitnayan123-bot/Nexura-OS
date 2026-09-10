"use client";

/* ============================================================
 * PIE UI — IndiaRiskExplorer
 * "Predicts the disease before it catches you" — the visitor
 * shapes a life (routine, meals, exercise, sleep, city air,
 * family history) and watches 5-year onset risks move live.
 * Runs entirely in the browser on the India-calibrated model:
 * instant, private, deterministic — no login, no data sent.
 * ============================================================ */

import { useMemo, useState } from "react";
import { Footprints, Moon, Sparkles, TrendingDown, Utensils, Wind } from "lucide-react";
import {
  DEFAULT_PROFILE, INDIAN_CITIES, bandOfOnset, computeOnsetRisk, nudgeFor,
  type DiseaseKey, type RiskProfile,
} from "@/modules/pi-engine/india-calibration";

const DISEASES: { key: DiseaseKey; label: string; hint: string }[] = [
  { key: "type2", label: "Type-2 Diabetes", hint: "the disease Indian bodies meet a decade early" },
  { key: "hypertension", label: "Hypertension", hint: "the silent load on 1 in 3 Indian adults" },
  { key: "cardiac", label: "Cardiac Event", hint: "India's fastest-rising risk" },
];

const BAND_STYLE: Record<string, string> = {
  low: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900",
  moderate: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900",
  high: "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900",
};

const BAND_LABEL: Record<string, string> = { low: "Low", moderate: "Watch", high: "High" };

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
        <span className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" /> {label}</span>
        <span className="font-bold tabular-nums">{value} {suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-violet-600"
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
    <div className="overflow-hidden rounded-2xl border border-violet-200/60 bg-white/70 shadow-sm dark:border-violet-900/50 dark:bg-white/5">
      <div className="border-b border-violet-100 bg-violet-50/60 px-5 py-4 dark:border-violet-900/40 dark:bg-violet-950/20">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <h3 className="text-sm font-bold">Feel the prediction — shape a life, watch the risks</h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Move the sliders the way a week actually looks — meals, walks, sleep, your city&apos;s air. The engine recomputes
          5-year onset risks instantly, in your browser, on the India-calibrated model. Nothing is sent anywhere.
        </p>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.1fr]">
        {/* ---------- inputs ---------- */}
        <div className="space-y-4">
          <Slider icon={Sparkles} label="Your age" value={profile.age} min={22} max={70} step={1} suffix="yrs" onChange={(v) => set({ age: v })} />
          <Slider icon={Footprints} label="Daily exercise / brisk walking" value={profile.exerciseMinPerDay} min={0} max={60} step={5} suffix="min" onChange={(v) => set({ exerciseMinPerDay: v })} />
          <Slider icon={Moon} label="Sleep" value={profile.sleepHours} min={4} max={9} step={0.5} suffix="h" onChange={(v) => set({ sleepHours: v })} />

          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium">
              <Utensils className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" /> Your routine meals
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
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    profile.diet[key]
                      ? "border-violet-500 bg-violet-600 text-white dark:bg-violet-600"
                      : "border-black/10 bg-white/70 hover:border-violet-400 dark:border-white/15 dark:bg-white/5"
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
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                profile.familyHistory ? "border-violet-500 bg-violet-600 text-white dark:bg-violet-600" : "border-black/10 bg-white/70 hover:border-violet-400 dark:border-white/15 dark:bg-white/5"
              }`}
            >
              Diabetes / heart disease in family
            </button>
            <button
              onClick={() => set({ smoker: !profile.smoker })}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                profile.smoker ? "border-violet-500 bg-violet-600 text-white dark:bg-violet-600" : "border-black/10 bg-white/70 hover:border-violet-400 dark:border-white/15 dark:bg-white/5"
              }`}
            >
              Smoker
            </button>
          </div>

          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium">
              <Wind className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" /> Your city&apos;s air
            </p>
            <select
              value={profile.cityAqi}
              onChange={(e) => set({ cityAqi: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-xs font-medium dark:border-white/15 dark:bg-white/5"
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
          <div className="flex items-center justify-between rounded-2xl border border-black/8 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Early-warning score</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{result.topDriverText}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold ${BAND_STYLE[scoreBand]}`}>
              <span className={`h-2 w-2 rounded-full ${scoreBand === "high" ? "animate-pulse bg-rose-500" : scoreBand === "moderate" ? "bg-amber-500" : "bg-emerald-500"}`} />
              {result.earlyWarning}/100
            </span>
          </div>

          {DISEASES.map((d) => {
            const pct = Math.round(result.risks[d.key] * 100);
            const band = bandOfOnset(result.risks[d.key]);
            const width = Math.min(100, (result.risks[d.key] / 0.6) * 100);
            const barColor = band === "high" ? "bg-rose-500" : band === "moderate" ? "bg-amber-500" : "bg-emerald-500";
            return (
              <div key={d.key} className="rounded-xl border border-black/8 p-3.5 dark:border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold">{d.label}</p>
                    <p className="text-[10px] text-muted-foreground">{d.hint}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${BAND_STYLE[band]}`}>{BAND_LABEL[band]} · {pct}%</span>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">5-year onset</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}

          {nudge && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <TrendingDown className="h-3.5 w-3.5" /> {nudge.label}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">one change, recomputed live — early-warning score</p>
              </div>
              <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white tabular-nums">
                {nudge.from} → {nudge.to}
              </span>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">What the engine is reading</p>
            <div className="space-y-1.5">
              {result.drivers.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-44 shrink-0 truncate text-[11px] font-medium">{d.feature}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                    <div className={`h-full rounded-full ${d.modifiable ? "bg-violet-500" : "bg-slate-400"}`} style={{ width: `${Math.round(d.share * 100)}%` }} />
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold ${d.modifiable ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}>
                    {d.modifiable ? "changeable" : "watch"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="border-t border-violet-100 bg-violet-50/40 px-5 py-3 text-[10px] leading-relaxed text-muted-foreground dark:border-violet-900/40 dark:bg-violet-950/20">
        Demo model calibrated on aggregate Indian public-health patterns (ICMR-INDIAB, NFHS-5 style statistics) —
        population-level priors, never personal data. It shows how Nexura reasons; it is not a medical diagnosis.
      </p>
    </div>
  );
}
