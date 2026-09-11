/* ============================================================
 * PHI-E2 — UNIT TESTS: patterns + recommendations engines
 * Pure functions only — NO DB access. Fixtures are inline.
 * ============================================================ */

import { describe, it, expect } from "vitest";
import type { AssessmentContext, ProfileSnapshot, RecordSnapshot } from "@/modules/phi/contracts";
import {
  generatePatterns,
  recommendationEngine,
  riskSignalProvider,
} from "@/modules/phi/assessment/engines";
import { CONFIDENCE_CATEGORIES } from "@/modules/phi/contracts";

/* ---------------- inline fixtures ---------------- */

type Lifestyle = NonNullable<ProfileSnapshot["lifestyle"]>;

function makeLifestyle(overrides: Partial<Lifestyle> = {}): Lifestyle {
  return {
    sleepHours: 8,
    sleepQuality: "good",
    activityMinutesWeek: 150,
    sedentaryHours: 4,
    fruitsVegFrequency: "daily",
    proteinSources: "dal,curd",
    waterGlasses: 8,
    tobacco: "never",
    alcohol: "never",
    stressLevel: "low",
    shiftWork: false,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<ProfileSnapshot> = {}): ProfileSnapshot {
  return {
    ageYears: 40,
    sexAtBirth: "male",
    pregnancyPossibility: false,
    heightCm: 170,
    weightKg: 65,
    waistCm: 80,
    conditions: [],
    medications: [],
    allergies: [],
    lifestyle: makeLifestyle(),
    dietaryPref: "vegetarian",
    languagePref: "en",
    ...overrides,
  };
}

function makeCtx(opts: {
  lifestyle?: Partial<Lifestyle>;
  profile?: Partial<ProfileSnapshot>;
  records?: Partial<RecordSnapshot>;
  bmi?: number | null;
  completeness?: number;
  missingInformation?: string[];
} = {}): AssessmentContext {
  return {
    subjectId: "test-subject",
    profile: makeProfile({ lifestyle: makeLifestyle(opts.lifestyle), ...(opts.profile ?? {}) }),
    records: {
      symptoms: [],
      vitals: [],
      labs: [],
      lifestyleEntries: [],
      assessmentHistory: [],
      // Deep-copy: callers may pass `as const` (readonly) fixtures.
      ...(opts.records ? (JSON.parse(JSON.stringify(opts.records)) as Partial<RecordSnapshot>) : {}),
    },
    quality: {
      completeness: opts.completeness ?? 85,
      warnings: [],
      missingInformation: opts.missingInformation ?? [],
    },
    bmi: opts.bmi === undefined ? 22.5 : opts.bmi,
    languagePref: "en",
  };
}

function vital(systolic: number) {
  return {
    systolic,
    diastolic: 88,
    heartRate: null,
    temperatureC: null,
    spo2: null,
    glucoseMgDl: null,
    atRest: true,
    measuredAt: "2026-08-20",
  };
}

const EFFORTS = ["low", "moderate", "planned_with_clinician"] as const;
const CATEGORIES = ["monitor", "lifestyle", "clinical_review", "safety", "data_completeness"] as const;
const FORBIDDEN_MED_RE = /\bmg\b|\bmcg\b|dose|dosage/i;

/* ---------------- patterns ---------------- */

describe("PHI patterns", () => {
  it("sleep + stress signals produce pat-sleep-stress", () => {
    const ctx = makeCtx({ lifestyle: { sleepHours: 5, stressLevel: "high" } });
    const signals = riskSignalProvider.generateSignals(ctx);
    const patterns = generatePatterns(ctx, signals);
    expect(patterns.some((p) => p.id === "pat-sleep-stress")).toBe(true);
  });

  it("BP + activity signals produce pat-bp-activity", () => {
    const ctx = makeCtx({
      lifestyle: { activityMinutesWeek: 45 },
      records: { vitals: [vital(148)] },
    });
    const signals = riskSignalProvider.generateSignals(ctx);
    expect(signals.some((s) => s.id === "vs-bp-elevated")).toBe(true);
    const patterns = generatePatterns(ctx, signals);
    expect(patterns.some((p) => p.id === "pat-bp-activity")).toBe(true);
  });

  it("poor sleep + short activity + high stress produce the compounding load pattern", () => {
    const ctx = makeCtx({
      lifestyle: { sleepHours: 5, activityMinutesWeek: 40, stressLevel: "high" },
    });
    const signals = riskSignalProvider.generateSignals(ctx);
    const patterns = generatePatterns(ctx, signals);
    const compounding = patterns.find((p) => p.id === "pat-compounding-load");
    expect(compounding).toBeDefined();
    expect(compounding?.label.toLowerCase()).toContain("compounding load");
    expect(compounding?.supportingInputs).toHaveLength(3);
    expect(Array.isArray(compounding?.contradictingInputs)).toBe(true);
    expect(compounding?.missingInformation.length ?? 0).toBeGreaterThan(0);
    expect(compounding?.whatClinicianMayEvaluate.length ?? 0).toBeGreaterThan(0);
    expect(compounding?.confidence).toBe("MODERATE_CONFIDENCE");
    expect(compounding?.notADiagnosis).toBe(true);
  });

  it("repeated same-category symptoms + poor sleep produce the repetition tracking pattern", () => {
    const ctx = makeCtx({
      lifestyle: { sleepHours: 5 },
      records: {
        symptoms: [
          { category: "headache", severity1to10: 3, suddenOnset: false, worsening: false, durationDays: 2, associated: [] },
          { category: "headache", severity1to10: 4, suddenOnset: false, worsening: false, durationDays: 3, associated: [] },
        ],
      },
    });
    const signals = riskSignalProvider.generateSignals(ctx);
    expect(signals.some((s) => s.id === "sym-repeat-headache")).toBe(true);
    const patterns = generatePatterns(ctx, signals);
    const repetition = patterns.find((p) => p.id === "pat-repeat-tracking");
    expect(repetition).toBeDefined();
    expect(repetition?.notADiagnosis).toBe(true);
    expect(repetition?.supportingInputs).toEqual(["symptoms.category", "lifestyle.sleep_hours"]);
    expect(repetition?.confidence).toBe("LOW_CONFIDENCE");
  });

  it("clean context produces no patterns", () => {
    const ctx = makeCtx();
    expect(generatePatterns(ctx, riskSignalProvider.generateSignals(ctx))).toHaveLength(0);
  });

  it("every pattern carries valid safety fields and a confidence category", () => {
    const ctx = makeCtx({
      lifestyle: { sleepHours: 5, activityMinutesWeek: 40, stressLevel: "high" },
      records: {
        vitals: [vital(148)],
        labs: [{ testName: "HbA1c", value: 6.4, unit: "%", collectedAt: "2026-08-01" }],
        symptoms: [
          { category: "headache", severity1to10: 3, suddenOnset: false, worsening: false, durationDays: 2, associated: [] },
          { category: "headache", severity1to10: 4, suddenOnset: false, worsening: false, durationDays: 3, associated: [] },
        ],
      },
    });
    const patterns = generatePatterns(ctx, riskSignalProvider.generateSignals(ctx));
    expect(patterns.length).toBeGreaterThanOrEqual(4); // sleep-stress, compounding, bp-activity, repeat-tracking, hba1c-activity
    for (const p of patterns) {
      expect(p.notADiagnosis).toBe(true);
      expect(CONFIDENCE_CATEGORIES).toContain(p.confidence);
      expect(p.supportingInputs.length).toBeGreaterThan(0);
      expect(Array.isArray(p.contradictingInputs)).toBe(true);
      expect(p.missingInformation.length).toBeGreaterThan(0);
      expect(p.whatClinicianMayEvaluate.length).toBeGreaterThan(0);
    }
  });

  it("patterns are deterministic for identical input (JSON.stringify equality)", () => {
    const opts: Parameters<typeof makeCtx>[0] = {
      lifestyle: { sleepHours: 5, activityMinutesWeek: 40, stressLevel: "high" },
      records: { vitals: [vital(148)] },
    };
    const ctxA = makeCtx(opts);
    const ctxB = makeCtx(opts);
    const a = generatePatterns(ctxA, riskSignalProvider.generateSignals(ctxA));
    const b = generatePatterns(ctxB, riskSignalProvider.generateSignals(ctxB));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

/* ---------------- recommendations ---------------- */

describe("PHI recommendations", () => {
  it("tobacco current -> rec-tobacco-support mentions the national quit line and no dose language", () => {
    const recs = recommendationEngine.recommend(makeCtx({ lifestyle: { tobacco: "current" } }));
    const rec = recs.find((r) => r.id === "rec-tobacco-support");
    expect(rec).toBeDefined();
    expect(rec?.detail).toContain("1800-11-2356");
    expect(rec?.detail).not.toMatch(FORBIDDEN_MED_RE);
  });

  it("vegetarian + weak protein sources -> rec-veg-protein mentions katori", () => {
    const recs = recommendationEngine.recommend(
      makeCtx({ profile: { dietaryPref: "vegetarian" }, lifestyle: { proteinSources: "rice and roti" } })
    );
    const rec = recs.find((r) => r.id === "rec-veg-protein");
    expect(rec).toBeDefined();
    expect(rec?.detail).toContain("katori");
    expect(rec?.detail).not.toMatch(FORBIDDEN_MED_RE);
  });

  it("low completeness -> rec-complete-data with data_completeness category", () => {
    const recs = recommendationEngine.recommend(makeCtx({ completeness: 45 }));
    const rec = recs.find((r) => r.id === "rec-complete-data");
    expect(rec).toBeDefined();
    expect(rec?.category).toBe("data_completeness");
    expect(rec?.effort).toBe("low");
  });

  it("high completeness omits rec-complete-data", () => {
    const recs = recommendationEngine.recommend(makeCtx({ completeness: 85 }));
    expect(recs.some((r) => r.id === "rec-complete-data")).toBe(false);
  });

  it("every recommendation uses valid category and effort enum values", () => {
    const contexts: AssessmentContext[] = [
      makeCtx(),
      makeCtx({ lifestyle: { sleepHours: 5, activityMinutesWeek: 30, tobacco: "current", fruitsVegFrequency: "rarely" } }),
      makeCtx({ completeness: 45, missingInformation: ["waist circumference"] }),
      makeCtx({
        records: { vitals: [vital(148)], labs: [{ testName: "HbA1c", value: 6.2, unit: "%", collectedAt: "2026-08-01" }] },
        profile: { dietaryPref: "vegan" },
        lifestyle: { proteinSources: "rice" },
      }),
    ];
    for (const ctx of contexts) {
      for (const rec of recommendationEngine.recommend(ctx)) {
        expect(CATEGORIES).toContain(rec.category);
        expect(EFFORTS).toContain(rec.effort);
        expect(typeof rec.title).toBe("string");
        expect(rec.title.length).toBeGreaterThan(0);
        expect(rec.detail.length).toBeGreaterThan(0);
      }
    }
  });

  it("no recommendation text ever contains dose/mg/mcg language", () => {
    const contexts: AssessmentContext[] = [
      makeCtx({ lifestyle: { sleepHours: 5, activityMinutesWeek: 30, tobacco: "current", fruitsVegFrequency: "rarely", stressLevel: "high" } }),
      makeCtx({
        records: {
          vitals: [vital(165)],
          labs: [
            { testName: "HbA1c", value: 7.0, unit: "%", collectedAt: "2026-08-01" },
            { testName: "LDL", value: 160, unit: "mg/dL", collectedAt: "2026-08-01" },
          ],
        },
        completeness: 40,
        missingInformation: ["waist circumference"],
      }),
    ];
    for (const ctx of contexts) {
      const recs = recommendationEngine.recommend(ctx);
      expect(recs.length).toBeGreaterThan(0);
      for (const rec of recs) {
        expect(`${rec.title} ${rec.detail}`).not.toMatch(FORBIDDEN_MED_RE);
      }
    }
  });
});
