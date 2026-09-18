/* ============================================================
 * PIE — India Calibration
 * Population-level priors and a deterministic onset-risk model
 * calibrated to Indian epidemiology patterns (aggregate public
 * health statistics consistent with ICMR-INDIAB diabetes
 * surveys, NFHS-5 hypertension/obesity data and Indian cardiac
 * risk reviews). Pure TypeScript — safe to import in client
 * components; no database, no network, no personal data.
 *
 * Why India-specific? Disease onset in Indian cohorts starts a
 * decade earlier, BMI risk thresholds sit lower (23 / 27.5 vs
 * the Western 25 / 30), diet archetypes differ sharply from
 * Western datasets, and ambient air quality (AQI) is a first-
 * order cardiac/hypertension factor in Indian metros.
 * ============================================================ */

/** Indian metro annual-average AQI table (typical recent ranges). */
export const INDIAN_CITIES: { name: string; aqi: number }[] = [
  { name: "Bengaluru", aqi: 95 },
  { name: "Chennai", aqi: 100 },
  { name: "Mumbai", aqi: 120 },
  { name: "Hyderabad", aqi: 110 },
  { name: "Pune", aqi: 110 },
  { name: "Kolkata", aqi: 160 },
  { name: "Delhi NCR", aqi: 190 },
  { name: "Lucknow", aqi: 220 },
];

/** Diet / lifestyle flags capturing common Indian routines. */
export type DietFlags = {
  /** eats out / orders in most days (refined oil, maida-heavy) */
  outsideFoodOften: boolean;
  /** daily sugar-sweetened beverages (chai-with-sugar counts only if 4+ cups) */
  sugaryDrinks: boolean;
  /** dinner after 10 pm most days */
  lateNightMeals: boolean;
};

export type RiskProfile = {
  age: number; // 22–70
  exerciseMinPerDay: number; // 0–60
  sleepHours: number; // 4–9 (0.5 steps)
  diet: DietFlags;
  familyHistory: boolean; // first-degree T2D / cardiac
  smoker: boolean;
  cityAqi: number; // 40–350
};

export type DiseaseKey = "type2" | "hypertension" | "cardiac";

export type OnsetResult = {
  /** 5-year onset risk, 0–1, for each disease */
  risks: Record<DiseaseKey, number>;
  /** 0–100 composite early-warning score (green <30, yellow 30–60, red >60) */
  earlyWarning: number;
  /** the three biggest contributors, strongest first (feature, share 0–1) */
  drivers: { feature: string; share: number; modifiable: boolean }[];
  /** human-readable summary of the single strongest driver */
  topDriverText: string;
};

export const DEFAULT_PROFILE: RiskProfile = {
  age: 35,
  exerciseMinPerDay: 15,
  sleepHours: 6.5,
  diet: { outsideFoodOften: true, sugaryDrinks: false, lateNightMeals: true },
  familyHistory: true,
  smoker: false,
  cityAqi: 120,
};

/* ---------- baselines: typical urban Indian adult, per 5 years ----------
   Population anchors (aggregate patterns): adult diabetes prevalence
   ~11% with a further ~15% prediabetic pool; hypertension ~1 in 3
   adults; premature cardiac disease rising in urban cohorts. The
   baseline below is the *onset over 5 years* for the reference
   profile (age 35, light activity, urban air), not the prevalence. */
const BASELINE: Record<DiseaseKey, number> = {
  type2: 0.085,
  hypertension: 0.075,
  cardiac: 0.045,
};

/** Age-acceleration: Indian cohorts show onset ~a decade earlier than
   Western ones, so growth starts early and compounds steadily. */
const AGE_GROWTH: Record<DiseaseKey, number> = {
  type2: 1.032,
  hypertension: 1.04,
  cardiac: 1.046,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;

/** Relative-risk multipliers per disease. 1 = no effect. */
function multipliers(p: RiskProfile): Record<DiseaseKey, number> {
  const mm: Record<DiseaseKey, number> = { type2: 1, hypertension: 1, cardiac: 1 };

  // Movement: protective dose–response saturating at ~45–60 min/day.
  const ex = clamp(p.exerciseMinPerDay, 0, 60);
  const exFactor = 1.42 - 0.42 * Math.min(1, ex / 45); // 1.42 sedentary → 1.00 active
  mm.type2 *= exFactor;
  mm.hypertension *= exFactor * 0.97;
  mm.cardiac *= exFactor * 0.95;

  // Sleep: U-curve, trough at 7–8 h.
  const sl = p.sleepHours;
  const sleepFactor =
    sl >= 7 && sl <= 8 ? 1.0 : sl < 7 ? 1 + 0.055 * (7 - sl) : 1 + 0.03 * (sl - 8);
  mm.type2 *= sleepFactor;
  mm.hypertension *= sleepFactor * 1.02;
  mm.cardiac *= sleepFactor * 1.04;

  // Diet archetypes common in Indian urban routines.
  if (p.diet.outsideFoodOften) {
    mm.type2 *= 1.16;
    mm.hypertension *= 1.14; // restaurant salt + refined carbs
    mm.cardiac *= 1.13;
  }
  if (p.diet.sugaryDrinks) mm.type2 *= 1.22; // one of the strongest modifiable T2D signals
  if (p.diet.lateNightMeals) {
    mm.type2 *= 1.09; // circadian misalignment → insulin resistance
    mm.cardiac *= 1.05;
  }

  // Family history: first-degree relative — strong, non-modifiable.
  if (p.familyHistory) {
    mm.type2 *= 2.3; // Indian first-degree RR sits high
    mm.hypertension *= 1.7;
    mm.cardiac *= 1.9;
  }

  if (p.smoker) {
    mm.cardiac *= 1.38;
    mm.hypertension *= 1.12;
    mm.type2 *= 1.15;
  }

  // Air quality: India-specific cardiac/hypertension load.
  const aqi = clamp(p.cityAqi, 40, 350);
  const aqiFactor =
    aqi <= 50
      ? 1.0
      : aqi <= 100
        ? 1.02
        : aqi <= 150
          ? 1.06
          : aqi <= 200
            ? 1.1
            : aqi <= 250
              ? 1.15
              : 1.2;
  mm.cardiac *= aqiFactor;
  mm.hypertension *= 1 + (aqiFactor - 1) * 0.8;
  mm.type2 *= 1 + (aqiFactor - 1) * 0.3; // emerging evidence, kept conservative

  return mm;
}

const FEATURE_LABELS: Record<string, string> = {
  exercise: "Low daily movement",
  sleep: "Short or irregular sleep",
  outsideFoodOften: "Frequent outside food",
  sugaryDrinks: "Daily sugary drinks",
  lateNightMeals: "Late-night meals",
  familyHistory: "Family history",
  smoker: "Smoking",
  aqi: "City air quality (AQI)",
  age: "Age trajectory",
};

/** Deterministic 5-year onset model — same inputs always yield the
    same risks, so the UI, tests and docs stay in lock-step. */
export function computeOnsetRisk(p: RiskProfile): OnsetResult {
  const mm = multipliers(p);
  const risks: Record<DiseaseKey, number> = {
    type2: clamp(
      BASELINE.type2 * mm.type2 * Math.pow(AGE_GROWTH.type2, Math.max(0, p.age - 32)),
      0.02,
      0.85,
    ),
    hypertension: clamp(
      BASELINE.hypertension *
        mm.hypertension *
        Math.pow(AGE_GROWTH.hypertension, Math.max(0, p.age - 30)),
      0.02,
      0.85,
    ),
    cardiac: clamp(
      BASELINE.cardiac * mm.cardiac * Math.pow(AGE_GROWTH.cardiac, Math.max(0, p.age - 30)),
      0.02,
      0.85,
    ),
  };

  // Composite early-warning score: weighted, then scaled so that the
  // reference profile lands in the watchlist band (~55) and strong
  // profiles go red.
  const composite = risks.type2 * 0.4 + risks.hypertension * 0.3 + risks.cardiac * 0.3;
  const earlyWarning = clamp(Math.round(composite * 225), 5, 100);

  // Attribute shares across factors (log-space contributions, normalized).
  const raw: Record<string, number> = {
    exercise: Math.log(multipliers(p).type2 / multipliers({ ...p, exerciseMinPerDay: 45 }).type2),
    sleep: Math.log(multipliers(p).type2 / multipliers({ ...p, sleepHours: 7.5 }).type2),
    outsideFoodOften: p.diet.outsideFoodOften
      ? Math.log(
          multipliers(p).type2 /
            multipliers({ ...p, diet: { ...p.diet, outsideFoodOften: false } }).type2,
        )
      : 0,
    sugaryDrinks: p.diet.sugaryDrinks
      ? Math.log(
          multipliers(p).type2 /
            multipliers({ ...p, diet: { ...p.diet, sugaryDrinks: false } }).type2,
        )
      : 0,
    lateNightMeals: p.diet.lateNightMeals
      ? Math.log(
          multipliers(p).type2 /
            multipliers({ ...p, diet: { ...p.diet, lateNightMeals: false } }).type2,
        )
      : 0,
    familyHistory: p.familyHistory
      ? Math.log(multipliers(p).type2 / multipliers({ ...p, familyHistory: false }).type2)
      : 0,
    smoker: p.smoker
      ? Math.log(multipliers(p).cardiac / multipliers({ ...p, smoker: false }).cardiac)
      : 0,
    aqi: Math.log(multipliers(p).cardiac / multipliers({ ...p, cityAqi: 60 }).cardiac),
    age: Math.log(multipliers(p).cardiac / multipliers({ ...p, age: 30 }).cardiac),
  };
  const total = Object.values(raw).reduce((a, b) => a + Math.max(0, b), 0) || 1;
  const drivers = Object.entries(raw)
    .filter(([, v]) => v > 0.005)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([feature, v]) => ({
      feature: FEATURE_LABELS[feature] ?? feature,
      share: round3(v / total),
      modifiable: !["familyHistory", "age"].includes(feature),
    }));

  const top = drivers[0];
  const topDriverText = top
    ? `Strongest signal: ${top.feature.toLowerCase()}${top.modifiable ? " — and it is modifiable" : " — watch it with earlier screening"}`
    : "Balanced profile — keep the annual twin check";

  return {
    risks: {
      type2: round3(risks.type2),
      hypertension: round3(risks.hypertension),
      cardiac: round3(risks.cardiac),
    },
    earlyWarning,
    drivers,
    topDriverText,
  };
}

export type OnsetBand = "low" | "moderate" | "high";

/** Band for a 5-year onset probability. */
export function bandOfOnset(risk: number): OnsetBand {
  if (risk < 0.12) return "low";
  if (risk < 0.28) return "moderate";
  return "high";
}

/** The engine's signature move: quantify what changing ONE thing buys. */
export function nudgeFor(
  p: RiskProfile,
  result: OnsetResult,
): { label: string; from: number; to: number } | null {
  const candidate: RiskProfile = { ...p, diet: { ...p.diet } };
  let label = "";

  const top = result.drivers.find((d) => d.modifiable);
  if (!top) return null;

  if (top.feature === FEATURE_LABELS.exercise) {
    candidate.exerciseMinPerDay = 45;
    label = "Add a 45-minute daily walk";
  } else if (top.feature === FEATURE_LABELS.sleep) {
    candidate.sleepHours = 7.5;
    label = "Sleep 7.5 hours";
  } else if (top.feature === FEATURE_LABELS.sugaryDrinks) {
    candidate.diet.sugaryDrinks = false;
    label = "Drop the daily sugary drinks";
  } else if (top.feature === FEATURE_LABELS.outsideFoodOften) {
    candidate.diet.outsideFoodOften = false;
    label = "Cook at home most days";
  } else if (top.feature === FEATURE_LABELS.lateNightMeals) {
    candidate.diet.lateNightMeals = false;
    label = "Finish dinner by 9 pm";
  } else if (top.feature === FEATURE_LABELS.smoker) {
    candidate.smoker = false;
    label = "Quit smoking";
  } else if (top.feature === FEATURE_LABELS.aqi) {
    candidate.cityAqi = Math.min(candidate.cityAqi, 100);
    label = "Cut peak AQI exposure (masks, air purifier, timing outdoors)";
  } else {
    return null;
  }

  const improved = computeOnsetRisk(candidate);
  return { label, from: result.earlyWarning, to: improved.earlyWarning };
}
