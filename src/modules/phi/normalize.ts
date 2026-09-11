/* ============================================================
 * NEXURA PHI — MEASUREMENT NORMALIZATION
 * Pure functions. Indian-user friendly: metric first, common
 * alternate units accepted, glucose in mg/dL (India standard)
 * with mmol/L conversion, Celsius only, household measures.
 * Nothing here decides health meaning — units/sanity only.
 * ============================================================ */

/* ---------------- Anthropometrics ---------------- */

export function calcBmi(weightKg: number, heightCm: number): number | null {
  if (!isFinite(weightKg) || !isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) return null;
  const m = heightCm / 100;
  const bmi = weightKg / (m * m);
  if (!isFinite(bmi) || bmi < 10 || bmi > 80) return null; // outside plausible range — do not compute
  return Math.round(bmi * 10) / 10;
}

export function feetInchesToCm(feet: number, inches: number): number | null {
  if (feet < 1 || feet > 8 || inches < 0 || inches > 11) return null;
  return Math.round((feet * 30.48 + inches * 2.54) * 10) / 10;
}

export function lbToKg(lb: number): number | null {
  if (!isFinite(lb) || lb <= 0 || lb > 700) return null;
  return Math.round(lb * 0.45359237 * 10) / 10;
}

/* ---------------- Temperature ---------------- */

/** Celsius only in storage. Fahrenheit input converted. */
export function fahrenheitToCelsius(f: number): number | null {
  if (!isFinite(f) || f < 80 || f > 115) return null;
  return Math.round(((f - 32) / 1.8) * 10) / 10;
}

/* ---------------- Glucose ---------------- */

/** India reports mg/dL; convert mmol/L input. */
export function glucoseMmolToMgDl(mmol: number): number | null {
  if (!isFinite(mmol) || mmol <= 0 || mmol > 60) return null;
  return Math.round(mmol * 18.018 * 10) / 10;
}

export function glucoseMgDlToMmol(mgdl: number): number | null {
  if (!isFinite(mgdl) || mgdl <= 0 || mgdl > 1500) return null;
  return Math.round((mgdl / 18.018) * 10) / 10;
}

/* ---------------- Blood pressure ---------------- */

export type BpReading = { systolic: number; diastolic: number } | null;

/** Accepts "120/80" strings and numeric pairs. Returns null when implausible. */
export function parseBloodPressure(raw: string): BpReading {
  const m = /^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/.exec(raw);
  if (!m) return null;
  const systolic = Number(m[1]);
  const diastolic = Number(m[2]);
  return isPlausibleBp(systolic, diastolic) ? { systolic, diastolic } : null;
}

export function isPlausibleBp(systolic: number, diastolic: number): boolean {
  if (!isFinite(systolic) || !isFinite(diastolic)) return false;
  if (systolic < 50 || systolic > 300) return false;
  if (diastolic < 30 || diastolic > 200) return false;
  return systolic > diastolic;
}

/* ---------------- Plausibility ranges (sanity, NOT diagnosis) ---------------- */

export const PLAUSIBLE_RANGES = {
  heartRate: { min: 25, max: 250 },
  spo2: { min: 50, max: 100 },
  temperatureC: { min: 30, max: 45 },
  glucoseMgDl: { min: 20, max: 1500 },
  weightKg: { min: 20, max: 400 },
  heightCm: { min: 80, max: 250 },
  waistCm: { min: 40, max: 200 },
} as const;

export function isPlausible(
  field: keyof typeof PLAUSIBLE_RANGES,
  value: number
): boolean {
  const r = PLAUSIBLE_RANGES[field];
  return isFinite(value) && value >= r.min && value <= r.max;
}

/* ---------------- Indian household measures (display only) ---------------- */

/** Approximate household portions for nutrition copy — never clinical doses. */
export const HOUSEHOLD_MEASURES: Record<string, string> = {
  katori: "~150 ml cooked portion (standard katori)",
  roti: "1 medium phulka/roti (~35-40 g atta)",
  bowl: "~200 ml standard bowl",
  glass: "~200-250 ml glass",
  spoon: "~5 g teaspoon / ~15 g tablespoon",
  serving: "1 palm-size serving",
};

/* ---------------- Age / sex normalization ---------------- */

export type NormalizedSex = "male" | "female" | "intersex" | "undisclosed";

export function normalizeSex(raw: string | null | undefined): NormalizedSex | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (["male", "m", "man"].includes(v)) return "male";
  if (["female", "f", "woman"].includes(v)) return "female";
  if (["intersex"].includes(v)) return "intersex";
  if (["undisclosed", "prefer_not_to_say"].includes(v)) return "undisclosed";
  return null;
}

/** Adults only (18+). Returns null for anything that is not a plausible adult age. */
export function normalizeAdultAge(ageYears: number | null | undefined): number | null {
  if (ageYears == null || !isFinite(ageYears)) return null;
  const a = Math.floor(ageYears);
  if (a < 18 || a > 120) return null; // <18 is routed OUT of the adult flow by triage, never analyzed
  return a;
}
