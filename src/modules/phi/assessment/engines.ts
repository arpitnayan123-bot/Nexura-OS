/* ============================================================
 * NEXURA PHI — PATTERNS / RECOMMENDATIONS / TRENDS /
 *               EXPLANATION / CLINICIAN SUMMARY / CONTENT REPO /
 *               LLM FORMATTER (deterministic v0.1)
 * Combined engine file — every export is a drop-in
 * implementation of its contract interface. The LLM formatter
 * is a DETERMINISTIC pass-through by default: an actual LLM
 * provider must never decide urgency or invent findings.
 * ============================================================ */

import { db } from "@/lib/db";
import type {
  AssessmentContext,
  ClinicianSummary,
  ClinicianSummaryGenerator,
  ClinicianQuestion,
  ExplanationEngine,
  LLMFormatter,
  PossibleHealthPattern,
  PredictiveHealthAssessment,
  RecommendedNextStep,
  RecommendationEngine,
  RiskSignal,
  TrendAnalysisEngine,
  TrendDirection,
  TrendObservation,
} from "../contracts";
import { PHI_DISCLAIMER, PHI_ENGINE_VERSION, PHI_RULESET_VERSION } from "../contracts";
import { CATALOG } from "./content-catalog";

/* The pipeline assembler (run.ts) imports the deterministic risk
 * signal provider through this module as well — re-exported here so
 * the engines file remains the single import surface for engines. */
export { riskSignalProvider } from "./risk-signals";

/* ---------------- Possible patterns ---------------- */

function pattern(p: Omit<PossibleHealthPattern, "notADiagnosis">): PossibleHealthPattern {
  return { ...p, notADiagnosis: true };
}

export function generatePatterns(ctx: AssessmentContext, signals: RiskSignal[]): PossibleHealthPattern[] {
  const out: PossibleHealthPattern[] = [];
  const ls = ctx.profile.lifestyle;
  const ids = new Set(signals.map((s) => s.id));

  if (ids.has("ls-sleep-short") && (ls?.stressLevel === "high" || ids.has("ls-stress-high"))) {
    out.push(
      pattern({
        id: "pat-sleep-stress",
        label: "Short sleep and high stress appearing together",
        plainExplanation:
          "These two tend to feed each other: stress delays sleep, and short sleep makes the next day's stress harder to shake. Neither is a disease — it is a load pattern worth lightening.",
        whyItAppeared: "You reported both in the same period, which is a common and reversible combination.",
        supportingInputs: ["lifestyle.sleep_hours", "lifestyle.stress_level"],
        contradictingInputs: ls?.sleepQuality === "good" ? ["lifestyle.sleep_quality=good"] : [],
        missingInformation: "Whether sleep trouble is falling asleep, staying asleep, or waking early — each points to a different next step.",
        whatClinicianMayEvaluate: "Sleep schedule, caffeine timing, and stress load; a doctor may screen for common sleep disruptors.",
        confidence: "MODERATE_CONFIDENCE",
      })
    );
  }

  if (ids.has("vs-bp-elevated") && ids.has("ls-activity-low")) {
    out.push(
      pattern({
        id: "pat-bp-activity",
        label: "Raised resting reading with low weekly movement",
        plainExplanation:
          "Movement is one of the most reliable levers for resting blood pressure. This pattern is common and often improves with a realistic activity habit — but only a clinician can interpret your readings properly.",
        whyItAppeared: "A resting reading in the raised range was reported alongside activity below the usual weekly floor.",
        supportingInputs: ["vitals.systolic", "lifestyle.activity_minutes_week"],
        contradictingInputs: [],
        missingInformation: "Whether raised readings repeat on different days, and any family history of blood pressure.",
        whatClinicianMayEvaluate: "A home BP log across a week or two, and a standard clinical BP measurement.",
        confidence: "LOW_CONFIDENCE",
      })
    );
  }

  /* Compounding load: poor sleep + short activity + high stress reported
     together — the three amplify one another, so they are named as a
     single load pattern rather than three isolated signals. */
  if (ids.has("ls-sleep-short") && ids.has("ls-activity-low") && ids.has("ls-stress-high")) {
    out.push(
      pattern({
        id: "pat-compounding-load",
        label: "Compounding load pattern: short sleep, low movement, high stress",
        plainExplanation:
          "Short sleep, little movement, and high stress often arrive together and amplify one another. Seen together they describe a sustained load — not any single problem — and each part is individually improvable.",
        whyItAppeared: "All three signals were reported for the same period, which is a common and reversible combination.",
        supportingInputs: ["lifestyle.sleep_hours", "lifestyle.activity_minutes_week", "lifestyle.stress_level"],
        contradictingInputs: [],
        missingInformation:
          "How long this combination has been going on, and whether one of the three started it (for example a demanding work period).",
        whatClinicianMayEvaluate:
          "Overall routine, energy, and mood; a doctor may also check blood pressure and basic labs to see how the load is landing.",
        confidence: "MODERATE_CONFIDENCE",
      })
    );
  }

  /* Repetition worth tracking: the same symptom category reported more
     than once while sleep is short — a tracking hint, not an explanation. */
  const repeatSignal = signals.find((s) => s.id.startsWith("sym-repeat-"));
  if (repeatSignal && ids.has("ls-sleep-short")) {
    out.push(
      pattern({
        id: "pat-repeat-tracking",
        label: "Repetition worth tracking: repeated symptom reports alongside short sleep",
        plainExplanation:
          "The same category of complaint has come up more than once while sleep has been short. Short sleep can lower the threshold for everyday symptoms, so the two are worth tracking together — this is a tracking hint, not an explanation.",
        whyItAppeared:
          "At least two reports in one symptom category were recorded in the same period as short sleep.",
        supportingInputs: ["symptoms.category", "lifestyle.sleep_hours"],
        contradictingInputs: [],
        missingInformation:
          "Timing of each occurrence relative to sleep, and whether the reports share triggers or context.",
        whatClinicianMayEvaluate:
          "A simple two-week log of the symptom with timing, sleep duration, and any obvious triggers.",
        confidence: "LOW_CONFIDENCE",
      })
    );
  }

  if (ids.has("lab-hba1c-raised") && ls?.activityMinutesWeek != null && ls.activityMinutesWeek < 75) {
    out.push(
      pattern({
        id: "pat-hba1c-activity",
        label: "Raised HbA1c alongside low movement",
        plainExplanation:
          "Lab value and lifestyle context point in the same direction. This is exactly the combination where a doctor's plan — food, movement, and follow-up testing — has the most room to help.",
        whyItAppeared: "The lab report you entered crosses the common screening threshold while activity is below the usual floor.",
        supportingInputs: ["labs.hba1c", "lifestyle.activity_minutes_week"],
        contradictingInputs: ls.tobacco === "never" ? ["lifestyle.tobacco=never"] : [],
        missingInformation: "Whether a doctor has already reviewed this report and what they advised.",
        whatClinicianMayEvaluate: "Repeat HbA1c, fasting glucose, and an individualized plan.",
        confidence: "HIGHER_CONFIDENCE_WITHIN_SCREENING_SCOPE",
      })
    );
  }

  return out;
}

/* ---------------- Recommendations ---------------- */

export const recommendationEngine: RecommendationEngine = {
  version: "0.1.0",

  recommend(ctx: AssessmentContext): RecommendedNextStep[] {
    const out: RecommendedNextStep[] = [];
    const ls = ctx.profile.lifestyle;
    const veg = ctx.profile.dietaryPref === "vegetarian" || ctx.profile.dietaryPref === "vegan" || ctx.profile.dietaryPref === "jain";

    if (ctx.quality.completeness < 70) {
      out.push({
        id: "rec-complete-data",
        title: "Complete the optional sections when convenient",
        detail:
          "Some useful context is missing. Every optional section you complete (even partially) makes the next assessment more specific — and you can skip anything you prefer not to share.",
        contentKey: "rec.data_completeness",
        effort: "low",
        category: "data_completeness",
      });
    }

    if (ls?.activityMinutesWeek != null && ls.activityMinutesWeek < 75) {
      out.push({
        id: "rec-move-more",
        title: "Build one repeatable 20-minute movement slot",
        detail:
          "Start with a daily 20-minute brisk walk (early morning or evening suits Indian heat), five days a week. Add a second slot only when the first feels automatic. Any activity counts — commuting on foot, household work, stairs.",
        contentKey: "rec.activity_start",
        effort: "moderate",
        category: "lifestyle",
      });
    }

    if (ls?.sleepHours != null && ls.sleepHours < 6) {
      out.push({
        id: "rec-sleep-window",
        title: "Set a fixed 30-minute wind-down window",
        detail:
          "Keep a consistent sleep and wake time — including weekends if your schedule allows. Dim screens after the window begins; if shift work makes this hard, anchor sleep right after your shift and ask family to keep that hour quiet.",
        contentKey: "rec.sleep_hygiene",
        effort: "moderate",
        category: "lifestyle",
      });
    }

    if (ls?.fruitsVegFrequency != null && ["rarely", "sometimes"].includes(ls.fruitsVegFrequency)) {
      out.push({
        id: "rec-veg-portion",
        title: "Add one extra katori of vegetables to lunch",
        detail:
          "One extra katori of sabzi or a bowl of salad before the main meal is the simplest upgrade. Seasonal and regional options count — bhindi, lauki, palak, cabbage, beans — fresh or frozen both work. If budget is tight, seasonal vegetables and sprouts are the most economical picks.",
        contentKey: "rec.veg_indian",
        effort: "low",
        category: "lifestyle",
      });
    }

    if (veg && ls?.proteinSources && !/dal|pulse|legume|paneer|curd|soy|sprout/i.test(ls.proteinSources)) {
      out.push({
        id: "rec-veg-protein",
        title: "Anchor one protein source at each main meal",
        detail:
          "For vegetarian plates: dal, rajma, chana, sprouts, paneer, curd, or soy chunks — a standard katori at lunch and dinner is a practical target. Sprouting or pairing dal with rice/roti improves protein quality at no extra cost.",
        contentKey: "rec.protein_veg",
        effort: "low",
        category: "lifestyle",
      });
    }

    if (ls?.tobacco === "current") {
      out.push({
        id: "rec-tobacco-support",
        title: "Plan a quit attempt with real support",
        detail:
          "Quitting tobacco is the highest-value change available to you. Set a quit date within two weeks, tell one person, and call the national tobacco quit line 1800-11-2356 for free coaching. Doctors can prescribe support — this tool never adjusts any medicine.",
        contentKey: "rec.tobacco_quit",
        effort: "planned_with_clinician",
        category: "lifestyle",
      });
    }

    // Screening follow-up for elevated-class signals
    if (ctx.records.vitals.some((v) => v.systolic != null && v.systolic >= 140)) {
      out.push({
        id: "rec-bp-log",
        title: "Keep a 7-day home BP log and show a doctor",
        detail:
          "Measure seated, back supported, after 5 minutes of rest — morning and evening for a week. Write down every reading with the time. A written log is far more useful to a doctor than any single reading.",
        contentKey: "rec.bp_log",
        effort: "low",
        category: "monitor",
      });
    }

    if (ctx.quality.missingInformation.length > 0) {
      out.push({
        id: "rec-clinician-questions",
        title: "Use the clinician questions section at your next visit",
        detail:
          "This assessment lists specific questions worth asking a qualified doctor. Bringing them makes a short consultation far more productive.",
        contentKey: "rec.clinician_questions",
        effort: "low",
        category: "clinical_review",
      });
    }

    return out;
  },
};

/* ---------------- Trend analysis ---------------- */

function directionOf(series: { x: number; worseWhenHigher: boolean; higherIsBetter?: boolean }[]): TrendDirection {
  const vals = series.map((s) => s.x);
  if (vals.length < 2) return "insufficient_data";
  const first = vals[0];
  const last = vals[vals.length - 1];
  const delta = last - first;
  const significant = Math.abs(delta) > Math.max(0.5, Math.abs(first) * 0.05);
  if (!significant) return "stable";
  const improved = series[0].worseWhenHigher ? delta < 0 : delta > 0;
  return improved ? "improving" : "deteriorating";
}

function chronologize<T extends { recordedAt: Date }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
}

export const trendEngine: TrendAnalysisEngine = {
  version: "0.1.0",

  analyze(records): TrendObservation[] {
    const out: TrendObservation[] = [];

    /* vitals-based */
    const vitalsAsc = chronologize(records.vitals.map((v) => ({ ...v, recordedAt: new Date(v.measuredAt) })));
    const mk = (
      metric: TrendObservation["metric"],
      label: string,
      unit: string,
      vals: number[],
      worseWhenHigher: boolean
    ): TrendObservation => {
      const dir = directionOf(vals.map((x) => ({ x, worseWhenHigher })));
      const summaries: Record<TrendDirection, string> = {
        improving: `Your recent ${label.toLowerCase()} entries have improved compared with your earlier entries.`,
        deteriorating: `Your recent ${label.toLowerCase()} entries have moved in a direction a clinician may want to review. This is a pattern, not a diagnosis.`,
        stable: `Your ${label.toLowerCase()} entries have stayed broadly steady across your records.`,
        insufficient_data: `More entries are needed before ${label.toLowerCase()} can be read as a trend.`,
      };
      return {
        metric,
        label,
        direction: dir,
        summary: summaries[dir],
        dataPoints: vals.length,
        lastValue: vals.length ? vals[vals.length - 1] : undefined,
        unit,
      };
    };

    const sys = vitalsAsc.map((v) => v.systolic).filter((x): x is number => x != null);
    if (sys.length) out.push(mk("systolic", "Systolic BP", "mmHg", sys, true));
    const dia = vitalsAsc.map((v) => v.diastolic).filter((x): x is number => x != null);
    if (dia.length) out.push(mk("diastolic", "Diastolic BP", "mmHg", dia, true));
    const hr = vitalsAsc.map((v) => v.heartRate).filter((x): x is number => x != null);
    if (hr.length) out.push(mk("resting_hr", "Resting pulse", "bpm", hr, true));
    const gl = vitalsAsc.map((v) => v.glucoseMgDl).filter((x): x is number => x != null);
    if (gl.length) out.push(mk("glucose", "Glucose", "mg/dL", gl, true));
    const wt = vitalsAsc.map((v) => v.weightKg).filter((x): x is number => x != null);
    if (wt.length) out.push(mk("weight_kg", "Weight", "kg", wt, true));
    const spo2 = vitalsAsc.map((v) => v.spo2).filter((x): x is number => x != null);
    if (spo2.length) out.push(mk("spo2", "Oxygen saturation", "%", spo2, false));

    /* lifestyle-based */
    const lsAsc = chronologize(records.lifestyleEntries.map((e) => ({ ...e, recordedAt: new Date(Date.now()) })));
    void lsAsc;
    const sleep = records.lifestyleEntries.map((e) => e.sleepHours).filter((x): x is number => x != null);
    if (sleep.length >= 2) {
      const vals = sleep;
      const dir: TrendDirection =
        Math.abs(vals[vals.length - 1] - vals[0]) < 0.5 ? "stable" : vals[vals.length - 1] > vals[0] ? "improving" : "deteriorating";
      out.push({
        metric: "sleep_hours",
        label: "Sleep hours",
        direction: dir,
        summary:
          dir === "improving"
            ? "Your recent sleep entries have improved compared with your previous entries."
            : dir === "deteriorating"
              ? "Your recent sleep entries have shortened compared with your previous entries — worth watching gently."
              : "Your sleep entries have stayed broadly steady.",
        dataPoints: vals.length,
        lastValue: vals[vals.length - 1],
        unit: "h",
      });
    }
    const stressMap: Record<string, number> = { low: 1, moderate: 2, high: 3 };
    const stress = records.lifestyleEntries
      .map((e) => (e.stressLevel ? (stressMap[e.stressLevel] ?? null) : null))
      .filter((x): x is number => x != null);
    if (stress.length >= 2) {
      const dir: TrendDirection =
        stress[stress.length - 1] === stress[0] ? "stable" : stress[stress.length - 1] < stress[0] ? "improving" : "deteriorating";
      out.push({
        metric: "stress",
        label: "Stress level",
        direction: dir,
        summary:
          dir === "improving"
            ? "Your reported stress has eased compared with your previous entries."
            : dir === "deteriorating"
              ? "Your reported stress has risen compared with your previous entries — support exists, and it works."
              : "Your reported stress has stayed broadly steady.",
        dataPoints: stress.length,
      });
    }

    /* repeated symptoms */
    const repeated = new Map<string, number>();
    for (const s of records.symptoms) repeated.set(s.category, (repeated.get(s.category) ?? 0) + 1);
    const repeats = [...repeated.values()].filter((n) => n >= 2).length;
    if (repeats > 0) {
      out.push({
        metric: "symptom_repeats",
        label: "Repeated symptom categories",
        direction: "stable",
        summary: `${repeats} symptom category(ies) have appeared more than once in your recent reports — timing details on the next report would help interpretation.`,
        dataPoints: records.symptoms.length,
      });
    }

    return out;
  },
};

/* ---------------- Explanation engine ---------------- */

export const explanationEngine: ExplanationEngine = {
  version: "0.1.0",

  explain(signal: RiskSignal, ctx: AssessmentContext): RiskSignal {
    // v0.1: signals ship fully rendered by the provider. This hook exists so a
    // validated model can add model-specific explanations without changing UI.
    void ctx;
    return signal;
  },
};

/* ---------------- Clinician summary ---------------- */

/**
 * Optional structured context the caller (API layer) may attach from
 * the subject's records. MUST be structured, engine- or record-derived
 * strings — the summary generator never accepts or includes the user's
 * free-text wording. Every list is normalised defensively.
 */
export type ClinicianExtraContext = {
  medications: string[];
  allergies: string[];
  vitals: string[];
  labs: string[];
  lifestyle: string[];
  conditions: string[];
};

/** Normalise caller-provided strings: collapse whitespace, drop empties, cap length. */
function cleanSummaryList(items: string[] | undefined, max = 12): string[] {
  if (!items) return [];
  return items
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0)
    .map((s) => (s.length > 200 ? `${s.slice(0, 197)}...` : s))
    .slice(0, max);
}

export const clinicianSummaryGenerator = {
  version: "0.1.0",

  /**
   * Backward compatible: the 2-arg call still works and leaves the
   * record-derived sections empty. The optional `extra` context fills
   * medications / allergies / recentVitals / relevantLabs /
   * lifestyleContext from structured record data only.
   */
  generate(
    subjectId: string,
    assessment: PredictiveHealthAssessment,
    extra?: ClinicianExtraContext
  ): ClinicianSummary {
    void subjectId; // identity is carried by assessment.subjectId + assessmentId
    const questions: ClinicianQuestion[] = assessment.clinicianQuestions ?? [];
    return {
      generatedAt: new Date().toISOString(),
      mainSymptoms: assessment.riskSignals.map((s) => s.label),
      onsetAndDuration: "See symptom records for onset and duration details entered by the user.",
      progression: assessment.riskSignals.some((s) => s.severity === "elevated")
        ? "At least one reported signal is currently in the elevated band."
        : "No elevated-band signals at generation time.",
      relevantHistory: [...(assessment.contributingFactors ?? []), ...cleanSummaryList(extra?.conditions)],
      medications: cleanSummaryList(extra?.medications),
      allergies: cleanSummaryList(extra?.allergies),
      recentVitals: cleanSummaryList(extra?.vitals),
      relevantLabs: cleanSummaryList(extra?.labs),
      lifestyleContext: cleanSummaryList(extra?.lifestyle),
      detectedSignals: assessment.riskSignals.map((s) => `${s.label} (${s.severity}, ${s.confidence})`),
      missingInformation: assessment.missingInformation,
      questionsToAsk: questions.map((q) => q.question),
      assessmentId: assessment.id,
      rulesetVersion: assessment.rulesetVersion,
      engineVersion: assessment.engineVersion,
      statement: `${PHI_DISCLAIMER} Generated by Nexura PHI engine v${PHI_ENGINE_VERSION}, ruleset v${PHI_RULESET_VERSION}.`,
    };
  },
} satisfies ClinicianSummaryGenerator;

/* ---------------- Evidence content repository ---------------- */

export type ResolvedContent = { text: string; source: string; status: "approved" | "placeholder" };

const SAFE_PLACEHOLDER: ResolvedContent = {
  text: "Detailed guidance for this step is being clinically reviewed and is not shown yet. A doctor or qualified professional can help you plan this safely.",
  source: "Nexura safe placeholder",
  status: "placeholder",
};

/** Static approved-catalog fallback (see ./content-catalog). Never invents content. */
function fromCatalog(contentKey: string, language: string): ResolvedContent | null {
  const item = CATALOG.find(
    (c) => c.contentKey === contentKey && c.language === language && c.status === "approved"
  );
  if (!item) return null;
  return { text: item.text, source: `${item.sourceAuthority} — ${item.sourceTitle}`, status: "approved" };
}

export const contentRepo = {
  version: "demo-1",

  /**
   * Resolves an approved content item by key: DB first, then the static
   * approved catalog, then a SAFE PLACEHOLDER — never invents content.
   */
  async resolve(contentKey: string, language = "en"): Promise<ResolvedContent> {
    const item = await db.phiContentItem.findFirst({
      where: {
        contentKey,
        language,
        status: "approved",
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date().toISOString().slice(0, 10) } }],
      },
      orderBy: { version: "desc" },
    });
    if (item) {
      return { text: item.text, source: `${item.sourceAuthority} — ${item.sourceTitle}`, status: "approved" };
    }
    return fromCatalog(contentKey, language) ?? SAFE_PLACEHOLDER;
  },

  /**
   * Resolves many keys in one DB round-trip. Missing/unapproved keys fall
   * back to the static catalog, then to the safe placeholder. An empty key
   * list short-circuits and performs no DB access at all.
   */
  async resolveMany(keys: string[], language = "en"): Promise<Map<string, ResolvedContent>> {
    const out = new Map<string, ResolvedContent>();
    const unique = [...new Set(keys.filter((k) => typeof k === "string" && k.trim() !== ""))];
    if (unique.length === 0) return out;

    const rows = await db.phiContentItem.findMany({
      where: {
        contentKey: { in: unique },
        language,
        status: "approved",
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date().toISOString().slice(0, 10) } }],
      },
      orderBy: { version: "desc" },
    });

    for (const key of unique) {
      const row = rows.find((r) => r.contentKey === key);
      if (row) {
        out.set(key, { text: row.text, source: `${row.sourceAuthority} — ${row.sourceTitle}`, status: "approved" });
        continue;
      }
      out.set(key, fromCatalog(key, language) ?? SAFE_PLACEHOLDER);
    }
    return out;
  },
};

/* ---------------- LLM formatter (deterministic default) ---------------- */

/**
 * v0.1 default: a deterministic reading-level simplifier that NEVER
 * changes meaning, urgency, or findings — it only shortens/simplifies
 * approved engine text. Any real LLM provider must:
 *   1. receive only fully-formed engine text (no raw PHI),
 *   2. return text that is validated to contain no new clinical claims
 *      (enforced by the caller before rendering), and
 *   3. NEVER run before triage or alter urgency/safety alerts.
 */
export const llmFormatter: LLMFormatter = {
  id: "nexura-deterministic-formatter",

  rephrase(text: string, readingLevel: "plain" | "detailed"): string {
    if (readingLevel === "detailed") return text;
    // Deterministic plain-language pass: strip parentheticals, split long sentences.
    const stripped = text.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
    const sentences = stripped.split(/(?<=[.!?])\s+/);
    return sentences.slice(0, 3).join(" ");
  },
};

/**
 * LLM SAFETY BOUNDARY — validated by the caller before rendering.
 *
 * A rephrased string may only ever be a simplification of the original.
 * It is UNSAFE when it:
 *   1. introduces urgency-changing phrases ("emergency", "urgent",
 *      "call 108", "immediately") that were NOT in the original — an
 *      LLM must never raise or lower urgency on its own, or
 *   2. is longer than 2x the original — which indicates the model is
 *      adding content instead of simplifying it.
 * Matching is case-insensitive so "Emergency" cannot sneak past.
 */
const URGENCY_PHRASES = ["emergency", "urgent", "call 108", "immediately"] as const;

export function isSafeRephrase(original: string, rephrased: string): boolean {
  const orig = original.toLowerCase();
  const rep = rephrased.toLowerCase();
  for (const phrase of URGENCY_PHRASES) {
    if (rep.includes(phrase) && !orig.includes(phrase)) return false;
  }
  return rep.length <= original.length * 2;
}
