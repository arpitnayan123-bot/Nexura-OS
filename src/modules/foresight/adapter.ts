/* ============================================================
 * FORESIGHT ADAPTER — shared form→input normalization.
 *
 * ONE pure converter used by BOTH the API route (authoritative
 * run + persistence) and the client What-if Studio (instant
 * simulation). Same validation semantics everywhere: clamps,
 * whitelists and fallbacks are defined exactly once.
 *
 * Pure functions only — safe in server and browser contexts.
 * ============================================================ */

import type { ForesightInput } from "./types";

export type NormalizeResult =
  | { ok: true; input: ForesightInput }
  | { ok: false; reason: "underage" };

const SEXES = new Set(["male", "female", "intersex", "undisclosed"]);
const DIET_TYPES = new Set(["vegetarian", "eggetarian", "non_veg", "vegan", "jain"]);
const CUISINES = new Set(["north", "south", "east", "west", "northeast", "mixed"]);
const BANDS = new Set(["none", "rare", "weekly", "daily"]);
const SALTS = new Set(["low", "moderate", "high"]);
const BALANCES = new Set(["rice_heavy", "balanced", "roti_heavy"]);
const OCCUPATIONS = new Set(["desk", "field", "household", "student", "other"]);
const QUALITIES = new Set(["poor", "fair", "good"]);
const SNORINGS = new Set(["none", "occasional", "loud_regular"]);
const SLEEPIES = new Set(["none", "mild", "severe"]);
const SCHEDULES = new Set(["regular", "irregular"]);
const GLUCOSE_CTX = new Set(["fasting", "random", "post_meal"]);
const TOBACCOS = new Set(["never", "former", "current_smoke", "smokeless"]);
const ALCOHOLS = new Set(["never", "occasional", "weekly", "daily"]);
const STRESSES = new Set(["low", "moderate", "high"]);
const AQIS = new Set(["unknown", "good", "moderate", "poor", "very_poor", "severe"]);
const FAM_KEYS = new Set(["diabetes", "heart_disease", "hypertension", "thyroid", "cancer", "pcos", "obesity"]);

const num = (v: unknown, min: number, max: number): number | undefined => {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
};
const pick = <T extends string>(v: unknown, allowed: Set<string>, fallback: T): T =>
  (typeof v === "string" && allowed.has(v) ? v : fallback) as T;

export function normalizeForesightInput(raw: unknown): NormalizeResult {
  const src = (raw ?? {}) as Record<string, unknown>;
  const p = (src.profile ?? {}) as Record<string, unknown>;
  const diet = (src.diet ?? {}) as Record<string, unknown>;
  const act = (src.activity ?? {}) as Record<string, unknown>;
  const slp = (src.sleep ?? {}) as Record<string, unknown>;
  const vit = (src.vitals ?? {}) as Record<string, unknown>;
  const labs = (src.labs ?? {}) as Record<string, unknown>;
  const hist = (src.history ?? {}) as Record<string, unknown>;
  const env = (src.environment ?? {}) as Record<string, unknown>;

  const ageYears = num(p.ageYears, 0, 120);
  if (!ageYears || ageYears < 18) return { ok: false, reason: "underage" };

  const symptomsRaw = Array.isArray(src.symptoms) ? src.symptoms : [];
  const symptoms = symptomsRaw.slice(0, 40).map((s) => {
    const o = (s ?? {}) as Record<string, unknown>;
    return {
      id: String(o.id ?? "").slice(0, 64),
      severity: num(o.severity, 1, 10) ?? 5,
      onsetDays: num(o.onsetDays, 0, 3650) ?? 1,
      worsening: o.worsening === true,
    };
  }).filter((s) => s.id.startsWith("sym."));

  return {
    ok: true,
    input: {
      profile: {
        ageYears,
        sexAtBirth: pick(p.sexAtBirth, SEXES, "undisclosed"),
        heightCm: num(p.heightCm, 90, 230),
        weightKg: num(p.weightKg, 25, 350),
        waistCm: num(p.waistCm, 50, 200),
        pregnancyPossibility: p.pregnancyPossibility === true,
      },
      symptoms,
      diet: {
        type: pick(diet.type, DIET_TYPES, "vegetarian"),
        cuisine: pick(diet.cuisine, CUISINES, "mixed"),
        sweetsPerWeek: pick(diet.sweetsPerWeek, BANDS, "rare"),
        friedPerWeek: pick(diet.friedPerWeek, BANDS, "rare"),
        sugaryDrinksPerWeek: pick(diet.sugaryDrinksPerWeek, BANDS, "rare"),
        riceRotiBalance: pick(diet.riceRotiBalance, BALANCES, "balanced"),
        salt: pick(diet.salt, SALTS, "moderate"),
        breakfastSkipped: diet.breakfastSkipped === true,
        outsideFoodPerWeek: num(diet.outsideFoodPerWeek, 0, 21) ?? 0,
      },
      activity: {
        minutesPerWeek: num(act.minutesPerWeek, 0, 3000) ?? 0,
        kinds: Array.isArray(act.kinds) ? act.kinds.map(String).slice(0, 8) : [],
        occupation: pick(act.occupation, OCCUPATIONS, "other"),
        shiftWork: act.shiftWork === true,
      },
      sleep: {
        hoursPerNight: num(slp.hoursPerNight, 0, 14) ?? 0,
        quality: pick(slp.quality, QUALITIES, "fair"),
        snoring: pick(slp.snoring, SNORINGS, "none"),
        daytimeSleepiness: pick(slp.daytimeSleepiness, SLEEPIES, "none"),
        schedule: pick(slp.schedule, SCHEDULES, "regular"),
        screensBeforeBed: slp.screensBeforeBed === true,
      },
      vitals: {
        systolic: num(vit.systolic, 60, 260),
        diastolic: num(vit.diastolic, 40, 160),
        pulse: num(vit.pulse, 30, 220),
        glucoseMgDl: num(vit.glucoseMgDl, 20, 700),
        glucoseContext: pick(vit.glucoseContext, GLUCOSE_CTX, "random"),
        spo2: num(vit.spo2, 50, 100),
      },
      labs: {
        hba1cPct: num(labs.hba1cPct, 3, 18),
        hemoglobinGdl: num(labs.hemoglobinGdl, 3, 22),
        tshMiuL: num(labs.tshMiuL, 0.01, 100),
        vitaminDNgMl: num(labs.vitaminDNgMl, 1, 150),
        b12PgMl: num(labs.b12PgMl, 30, 3000),
        ldlMgDl: num(labs.ldlMgDl, 30, 400),
        hdlMgDl: num(labs.hdlMgDl, 10, 150),
        triglyceridesMgDl: num(labs.triglyceridesMgDl, 30, 2000),
      },
      history: {
        conditions: Array.isArray(hist.conditions) ? hist.conditions.map(String).slice(0, 15) : [],
        familyHistory: Array.isArray(hist.familyHistory)
          ? (hist.familyHistory.map(String).filter((k) => FAM_KEYS.has(k)) as ForesightInput["history"]["familyHistory"])
          : [],
        tobacco: pick(hist.tobacco, TOBACCOS, "never"),
        alcohol: pick(hist.alcohol, ALCOHOLS, "never"),
        stress: pick(hist.stress, STRESSES, "moderate"),
        moodLowDays: num(hist.moodLowDays, 0, 14) ?? 0,
        menstruationRegular: p.sexAtBirth === "female" ? (hist.menstruationRegular === true ? true : hist.menstruationRegular === false ? false : undefined) : undefined,
      },
      environment: {
        aqiBand: pick(env.aqiBand, AQIS, "unknown"),
        sunlightMinutesPerDay: num(env.sunlightMinutesPerDay, 0, 600),
        city: typeof env.city === "string" ? env.city.slice(0, 60) : undefined,
      },
      freeText: typeof src.freeText === "string" ? src.freeText.slice(0, 2000) : undefined,
    },
  };
}
