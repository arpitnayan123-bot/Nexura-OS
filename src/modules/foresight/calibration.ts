/* ============================================================
 * NEXURA PREDICTIVE — INDIA CALIBRATION v2.0
 *
 * Thresholds and weights tuned for Indian/South-Asian bodies,
 * aligned with the published consensus for South Asians:
 *  - BMI risk bands start LOWER for South Asians (WHO/IDF
 *    expert consultation: overweight >= 23, high-risk >= 25,
 *    obese >= 27.5 — vs 25/30 for general populations).
 *  - Waist cutoffs follow IDF consensus for South Asians:
 *    >= 90 cm men, >= 80 cm women carry elevated metabolic risk.
 *  - Diet context uses Indian dietary patterns (rice/roti
 *    balance, mithai frequency, deep-fried snacks, sweet chai,
 *    high-salt pickles/papad) and katori-style portions.
 *  - Respiratory context assumes urban Indian AQI reality.
 *  - Anemia thresholds follow ICMR/WHO for Indian adults.
 * Weights are ordinal (0-10 scale per factor), NOT probabilities.
 * ============================================================ */

import type { AqiBand, Band, SexAtBirth } from "./types";

/* ---------- Anthropometrics (South-Asian specific) ---------- */

export const BMI_BANDS_SOUTH_ASIAN = {
  underweight: { max: 18.5, label: "below healthy range" },
  healthy: { min: 18.5, max: 22.9, label: "healthy range for South Asians" },
  overweight: { min: 23, max: 24.9, label: "overweight (South-Asian band)" },
  risk: { min: 25, max: 27.4, label: "high-risk (South-Asian band)" },
  obese: { min: 27.5, label: "obese (South-Asian band)" },
} as const;

export const WAIST_CUTOFF = { male: 90, female: 80 } as const;

export function computeBmi(heightCm?: number, weightKg?: number): number | null {
  if (
    !heightCm ||
    !weightKg ||
    heightCm < 90 ||
    heightCm > 230 ||
    weightKg < 25 ||
    weightKg > 350
  ) {
    return null;
  }
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiBand(bmi: number | null): "unknown" | keyof typeof BMI_BANDS_SOUTH_ASIAN {
  if (bmi == null) return "unknown";
  if (bmi < 18.5) return "underweight";
  if (bmi < 23) return "healthy";
  if (bmi < 25) return "overweight";
  if (bmi < 27.5) return "risk";
  return "obese";
}

export function waistRisk(
  waistCm: number | undefined,
  sex: SexAtBirth,
): "unknown" | "normal" | "elevated" | "high" {
  if (!waistCm || waistCm < 50 || waistCm > 200) return "unknown";
  if (sex === "male") {
    if (waistCm >= 100) return "high";
    if (waistCm >= WAIST_CUTOFF.male) return "elevated";
  }
  if (sex === "female") {
    if (waistCm >= 90) return "high";
    if (waistCm >= WAIST_CUTOFF.female) return "elevated";
  }
  if (sex === "intersex" || sex === "undisclosed") {
    if (waistCm >= 95) return "high";
    if (waistCm >= 85) return "elevated";
  }
  return "normal";
}

/* ---------------- Labs (reference bands, adult) ---------------- */

export const LAB_BANDS = {
  hba1c: { normal: 5.6, prediabetes: 6.4, diabetesRange: 6.5 }, // %
  fastingGlucose: { normal: 99, prediabetes: 125, diabetesRange: 126 }, // mg/dL
  randomGlucoseHigh: 200, // mg/dL
  postMealGlucose: { normal: 139, high: 199, diabetesRange: 200 }, // mg/dL
  hemoglobin: { male: { low: 13 }, female: { low: 12 } }, // g/dL
  tsh: { low: 0.4, high: 5.5 }, // mIU/L (broad screening band)
  vitaminD: { deficient: 12, insufficient: 20, sufficient: 30 }, // ng/mL
  b12: { low: 200, veryLow: 150 }, // pg/mL
  ldl: { optimal: 100, high: 130, veryHigh: 160 }, // mg/dL
  hdl: { maleLow: 40, femaleLow: 50 }, // mg/dL
  triglycerides: { normal: 150, high: 200, veryHigh: 300 }, // mg/dL (South Asians show risk at lower TG)
} as const;

export const BP_BANDS = {
  normal: { sys: 120, dia: 80 },
  elevated: { sys: 130, dia: 85 }, // watch zone (Indian consensus uses 130/85 as "prehypertension")
  high: { sys: 140, dia: 90 }, // hypertension-range signal
  crisis: { sys: 180, dia: 110 }, // severe — same-day/emergency territory
} as const;

/* ---------------- Frequency band helpers ---------------- */

export const BAND_POINTS: Record<Band, number> = {
  none: 0,
  rare: 1,
  weekly: 2.5,
  daily: 4.5,
};

export const AQI_POINTS: Record<AqiBand, number> = {
  unknown: 0,
  good: 0,
  moderate: 0.5,
  poor: 2,
  very_poor: 3.5,
  severe: 5,
};

export const AQI_LABEL: Record<AqiBand, string> = {
  unknown: "AQI not shared",
  good: "good air quality",
  moderate: "moderate air quality",
  poor: "poor air quality (AQI 101-200)",
  very_poor: "very poor air quality (AQI 201-300)",
  severe: "severe air quality (AQI 300+)",
};

/* ---------------- Scoring mechanics ---------------- */

/** Per-domain risk budget: factor weights sum to roughly this at saturation. */
export const clamp0to100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Ordinal burden -> signal level. Deliberately conservative at the top end. */
export function levelFor(burden: number): "LOW" | "WATCH" | "ELEVATED" | "HIGH" {
  if (burden >= 66) return "HIGH";
  if (burden >= 40) return "ELEVATED";
  if (burden >= 18) return "WATCH";
  return "LOW";
}

export const CONFIDENCE = {
  INSUFFICIENT: "INSUFFICIENT_INFORMATION",
  LOW: "LOW_CONFIDENCE",
  MODERATE: "MODERATE_CONFIDENCE",
  HIGHER: "HIGHER_WITHIN_SCREENING_SCOPE",
} as const;

/** Global weights for the composite Foresight Score (resilience, 0-100). */
export const DOMAIN_SCORE_WEIGHTS: Record<string, number> = {
  metabolic: 1.15,
  bp: 1.1,
  heart: 1.1,
  hemoglobin: 0.8,
  vitamin_d: 0.6,
  b12: 0.6,
  thyroid: 0.7,
  pcos: 0.6,
  sleep: 0.9,
  lungs: 0.9,
  liver: 0.9,
  mind: 1.0,
};

export const SCORE_BANDS = {
  THRIVING: 80,
  RESILIENT: 65,
  BUILDING: 45,
} as const;

export function bandFor(score: number): "THRIVING" | "RESILIENT" | "BUILDING" | "ATTENTION" {
  if (score >= SCORE_BANDS.THRIVING) return "THRIVING";
  if (score >= SCORE_BANDS.RESILIENT) return "RESILIENT";
  if (score >= SCORE_BANDS.BUILDING) return "BUILDING";
  return "ATTENTION";
}

/* ---------------- Protective credit ---------------- */

export const PROTECTIVE = {
  activityMinWeek: 150, // WHO adults
  sleepMinHours: 7,
  sleepMaxHours: 9,
} as const;

/* ---------------- Cuisine labels ---------------- */

export const CUISINE_LABEL: Record<string, string> = {
  north: "North Indian",
  south: "South Indian",
  east: "East Indian",
  west: "West Indian",
  northeast: "Northeast Indian",
  mixed: "Mixed / pan-Indian",
};
