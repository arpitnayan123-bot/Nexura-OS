/* ============================================================
 * NEXURA PREDICTIVE — FORESIGHT ORCHESTRATOR v2.0
 *
 * Pipeline (order is safety-critical):
 *   1. RED-FLAG TRIAGE      — emergency rules first; if they
 *      fire, pattern analysis is withheld entirely.
 *   2. TWELVE DOMAIN SCORERS — deterministic, explainable.
 *   3. FORESIGHT SCORE       — weighted resilience composite.
 *   4. TRAJECTORY            — illustrative 5-year direction.
 *   5. DIET PRESCRIPTION     — Indian, cuisine-aware, katori.
 *   6. PLAN + COMPLETENESS   — screening, actions, questions.
 *
 * Pure functions only. Same input + same versions => same
 * report (property-tested).
 * ============================================================ */

import {
  DOMAIN_SCORE_WEIGHTS,
  CUISINE_LABEL,
  bandFor,
  clamp0to100,
  computeBmi,
  bmiBand,
} from "./calibration";
import { scoreAllDomains } from "./domains";
import { EMERGENCY_LINE, MENTAL_HEALTH_LINES, runTriage } from "./redflags";
import {
  ALL_DOMAIN_IDS,
  CALIBRATION_VERSION,
  ENGINE_VERSION,
  RULESET_VERSION,
  type DomainId,
  type ForesightInput,
  type ForesightReport,
} from "./types";

/* ---------------- diet prescription ---------------- */

const SWAPS_BY_CUISINE: Record<string, { from: string; to: string; note?: string }[]> = {
  north: [
    {
      from: "Tandoori/naan (maida) rotis",
      to: "Tandoori roti or missi roti (whole wheat + besan)",
      note: "Maida is the silent load in restaurant North-Indian meals",
    },
    {
      from: "Creamy gravies (butter chicken, malai kofta)",
      to: "Tomato/onion-based gravies (tawa, kadhai style)",
      note: "Same spice, a fraction of the cream",
    },
    { from: "Halwa/kheer daily", to: "Kheer with less sugar, in a katori, 2-3×/week" },
  ],
  south: [
    {
      from: "Plain white rice pile (2-3 cups)",
      to: "Half rice + millets (ragi mudde / foxtail / little millet)",
      note: "Millets carry a far lower glucose spike",
    },
    {
      from: "Deep-fried snacks (medu vada, bajji)",
      to: "Steamed/idli-style options (idli, sandige-lite)",
    },
    {
      from: "Rice-heavy breakfast",
      to: "Protein-forward: dosa+sambar with extra dal, or eggs/moong chilla",
    },
  ],
  east: [
    { from: "Fried snacks (singhara, beguni) with tea", to: "Roasted chana/muri mixture" },
    { from: "White rice at every meal", to: "Rice at lunch, lighter (roti/vegetables) at dinner" },
    {
      from: "Sweets after daily meals (rosogolla/sandesh)",
      to: "2-3×/week, one piece, after the largest meal",
    },
  ],
  west: [
    { from: "Farsan/namkeen with chai", to: "Roasted khakhra or bhel (no sev)" },
    {
      from: "White bhakri/rice dominance",
      to: "Jowar/bajra bhakri 3-4×/week",
      note: "Millet bhakris are the traditional upgrade",
    },
    { from: "Fried farsan in tiffin", to: "Dhokla/idada (steamed)" },
  ],
  northeast: [
    { from: "Smoked/dried salt-heavy items daily", to: "Fresh steamed fish/greens 3×/week" },
    { from: "Rice at all meals", to: "Rice + local greens (haak/lai) + dal at lunch" },
    { from: "Fried momos", to: "Steamed momos with clear soup" },
  ],
  mixed: [
    {
      from: "Whatever is fried and available",
      to: "Steamed/grilled/roasted version of the same dish",
    },
    { from: "Sugary drinks with meals", to: "Chaas/nimbu-pani (no sugar) or plain water" },
    { from: "Dessert daily", to: "Fruit first, dessert 2-3×/week in a katori" },
  ],
};

const PLATE_RULE = [
  "Half the plate: vegetables (sabzi/salad — any seasonal)",
  "One quarter: protein (dal, curd, paneer, eggs, fish, chicken)",
  "One quarter: grains (roti/rice — prefer whole/millet 3+ days a week)",
  "Add: 1 katori curd daily (gut + protein), lemon/amla for vitamin C",
];

function dietPrescription(input: ForesightInput): ForesightReport["diet"] {
  const swaps: ForesightReport["diet"]["swaps"] = [
    ...(SWAPS_BY_CUISINE[input.diet.cuisine] ?? SWAPS_BY_CUISINE.mixed),
  ];
  if (input.diet.sweetsPerWeek === "daily") {
    swaps.unshift({
      from: "Sweets daily",
      to: "Sweet 3×/week, eaten after a meal (never on empty stomach)",
      note: "Katori rule: one katori = one serving",
    });
  }
  if (input.diet.salt === "high") {
    swaps.unshift({
      from: "Pickle + papad at every meal",
      to: "Pickle 2-3×/week; salad with lemon for crunch",
    });
  }
  return {
    cuisineLabel: CUISINE_LABEL[input.diet.cuisine] ?? "Indian",
    swaps: swaps.slice(0, 5),
    plateRule: PLATE_RULE,
  };
}

/* ---------------- completeness ---------------- */

const CRITICAL_FIELDS = [
  "age",
  "sex",
  "height",
  "weight",
  "waist",
  "symptoms",
  "diet.sweets",
  "diet.fried",
  "activity.minutes",
  "sleep.hours",
  "bp",
  "familyHistory",
  "stress",
];

function completeness(input: ForesightInput) {
  const missing: string[] = [];
  if (!input.profile.ageYears) missing.push("age");
  if (input.profile.sexAtBirth === "undisclosed") missing.push("sex");
  if (!input.profile.heightCm) missing.push("height");
  if (!input.profile.weightKg) missing.push("weight");
  if (!input.profile.waistCm) missing.push("waist");
  if (input.symptoms.length === 0 && !input.freeText) missing.push("symptoms");
  if (input.diet.sweetsPerWeek === "none" && input.diet.friedPerWeek === "none")
    missing.push("diet.sweets");
  if (input.activity.minutesPerWeek === 0) missing.push("activity.minutes");
  if (!input.sleep.hoursPerNight) missing.push("sleep.hours");
  if (!input.vitals.systolic) missing.push("bp");
  if (input.history.familyHistory.length === 0) missing.push("familyHistory");
  const answered = CRITICAL_FIELDS.length - missing.length;
  const pct = Math.round((answered / CRITICAL_FIELDS.length) * 100);
  return { answered, total: CRITICAL_FIELDS.length, pct, missing };
}

/* ---------------- main ---------------- */

export function runForesight(input: ForesightInput): ForesightReport {
  /* 1 — TRIAGE FIRST (safety order is absolute) */
  const triage = runTriage(input);

  /* 2 — DOMAIN SCORERS (withheld entirely on emergency) */
  const domains = triage.analysisBlocked
    ? ALL_DOMAIN_IDS.map((id) => ({
        id,
        level: "LOW" as const,
        burden: 0,
        confidence: "INSUFFICIENT_INFORMATION" as const,
        headline: "",
        factors: [],
        screening: [],
        actions: [],
        clinicianQuestions: [],
      }))
    : scoreAllDomains(input);

  /* 3 — FORESIGHT SCORE (resilience 0-100).
     Composite emphasises the worst domains: a 12-domain plain
     average would let one badly-loaded domain hide in the mean. */
  let weighted = 0;
  let weightSum = 0;
  for (const d of domains) {
    const w = DOMAIN_SCORE_WEIGHTS[d.id] ?? 1;
    weighted += d.burden * w;
    weightSum += w;
  }
  const avgBurden = weightSum > 0 ? weighted / weightSum : 0;
  const sortedBurden = [...domains].map((d) => d.burden).sort((a, b) => b - a);
  const top3Avg =
    sortedBurden.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, sortedBurden.length || 1);
  const maxBurden = sortedBurden[0] ?? 0;
  const effectiveBurden = 0.35 * avgBurden + 0.35 * top3Avg + 0.3 * maxBurden;

  // Protective bonus: healthy behaviors add resilience — but they can
  // NOT paper over a HIGH lab anchor. Dampen the bonus when real signal
  // burden exists (an HbA1c of 8.4 is not cancelled by morning walks).
  const rawBonus =
    (input.activity.minutesPerWeek >= 150 ? 4 : 0) +
    (input.sleep.hoursPerNight >= 7 && input.sleep.hoursPerNight <= 9 ? 3 : 0) +
    (input.history.tobacco === "never" ? 3 : 0) +
    (input.diet.friedPerWeek === "none" || input.diet.friedPerWeek === "rare" ? 1.5 : 0) +
    (input.history.stress === "low" ? 1.5 : 0);
  const bonus = maxBurden >= 66 ? rawBonus * 0.3 : maxBurden >= 40 ? rawBonus * 0.6 : rawBonus;
  let score = clamp0to100(100 - effectiveBurden * 1.05 + bonus);
  if (triage.analysisBlocked) score = Math.min(score, 35);

  const scoreBand = bandFor(score);

  /* 4 — TRAJECTORY (illustrative, honest) */
  const riskLoad = domains.reduce(
    (a, d) =>
      a + (d.level === "HIGH" ? 3.2 : d.level === "ELEVATED" ? 2.1 : d.level === "WATCH" ? 0.9 : 0),
    0,
  );
  const actionLoad = Math.min(
    14,
    domains.reduce((a, d) => a + (d.level === "HIGH" ? 2.6 : d.level === "ELEVATED" ? 1.8 : 0), 0) +
      bonus * 0.8,
  );
  const trajectory = {
    unchangedScore: clamp0to100(Math.max(5, score - Math.min(24, riskLoad * 1.35))),
    withActionsScore: clamp0to100(score + actionLoad),
    note: "Illustrative direction — not a prediction of outcomes. Show this curve to your doctor; the slope responds to the actions in your plan.",
  };

  /* 5 — TOP DOMAINS + plan */
  const actionable = [...domains].sort((a, b) => b.burden - a.burden).filter((d) => d.burden > 0);
  const topDomainIds: DomainId[] = actionable.slice(0, 3).map((d) => d.id);

  const clinicianQuestions = actionable.flatMap((d) => d.clinicianQuestions).slice(0, 6);

  const protectiveFactors = domains
    .flatMap((d) => d.factors)
    .filter((x) => x.direction === "protective" && x.weight >= 1.5)
    .sort((a, b) => b.weight - a.weight)
    .map((x) => x.label)
    .slice(0, 6);

  /* 6 — assemble */
  return {
    engineVersion: ENGINE_VERSION,
    rulesetVersion: RULESET_VERSION,
    calibrationVersion: CALIBRATION_VERSION,
    generatedAt: new Date().toISOString(),

    triage,
    analysisWithheld: triage.analysisBlocked,

    foresightScore: score,
    scoreBand,
    domains,
    topDomainIds,
    protectiveFactors,
    trajectory,
    diet: dietPrescription(input),
    clinicianQuestions,

    completeness: completeness(input),

    disclaimer:
      "Nexura Predictive reads risk SIGNAL patterns, not diagnoses. It does not confirm or rule out any condition — only a doctor with your full history can do that. Engine runs are versioned and explainable.",
    emergencyLine: EMERGENCY_LINE,
    mentalHealthLine: MENTAL_HEALTH_LINES[0].number,
  };
}

/* ---------------- shared summary for clinician handoff ---------------- */

export function summarizeForDoctor(report: ForesightReport, input: ForesightInput): string {
  const bmi = computeBmi(input.profile.heightCm, input.profile.weightKg);
  const lines: string[] = [];
  lines.push(`NEXURA PREDICTIVE — HEALTH FORESIGHT SUMMARY (engine ${report.engineVersion})`);
  lines.push(`Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}`);
  lines.push(`Triage: ${report.triage.level}`);
  if (report.triage.level !== "STANDARD") {
    lines.push(report.triage.hits.map((h) => `! ${h.title} — ${h.action}`).join("\n"));
  }
  lines.push("");
  lines.push(`Foresight Score: ${report.foresightScore}/100 (${report.scoreBand})`);
  lines.push(
    `Profile: ${input.profile.ageYears}y ${input.profile.sexAtBirth}${bmi ? `, BMI ${bmi} (${bmiBand(bmi)})` : ""}${input.profile.waistCm ? `, waist ${input.profile.waistCm}cm` : ""}`,
  );
  lines.push("");
  lines.push("TOP DOMAINS:");
  report.topDomainIds.forEach((id, i) => {
    const d = report.domains.find((x) => x.id === id);
    if (!d) return;
    lines.push(`${i + 1}. ${id.toUpperCase()} — ${d.level} (burden ${d.burden})`);
    d.factors
      .filter((x) => x.direction === "risk")
      .slice(0, 3)
      .forEach((x) => lines.push(`   - ${x.label}`));
  });
  if (report.clinicianQuestions.length) {
    lines.push("");
    lines.push("PATIENT QUESTIONS FOR THIS VISIT:");
    report.clinicianQuestions.forEach((q) => lines.push(`- ${q}`));
  }
  lines.push("");
  lines.push("Screening suggested by domains (doctor to confirm):");
  actionableScreening(report).forEach((s) => lines.push(`- ${s.test}: ${s.why}`));
  lines.push("");
  lines.push(report.disclaimer);
  return lines.join("\n");
}

function actionableScreening(report: ForesightReport) {
  const seen = new Set<string>();
  const out: { test: string; why: string }[] = [];
  for (const d of report.domains) {
    if (d.level === "LOW" || d.level === undefined) continue;
    for (const s of d.screening) {
      if (s.test === "None needed now" || s.test === "None needed") continue;
      const key = s.test;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ test: s.test, why: s.why });
    }
  }
  return out.slice(0, 8);
}
