/* ============================================================
 * PHI-E2 — UNIT TESTS: deterministic risk signal provider
 * Pure functions only — NO DB access. Fixtures are inline.
 * ============================================================ */

import { describe, it, expect } from "vitest";
import {
  CONFIDENCE_CATEGORIES,
  type AssessmentContext,
  type ProfileSnapshot,
  type RecordSnapshot,
  type TriagedSymptom,
  type TriagedVitals,
} from "@/modules/phi/contracts";
import { riskSignalProvider } from "@/modules/phi/assessment/engines";

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

function makeRecords(overrides: Partial<RecordSnapshot> = {}): RecordSnapshot {
  return {
    symptoms: [],
    vitals: [],
    labs: [],
    lifestyleEntries: [],
    assessmentHistory: [],
    ...overrides,
  };
}

type CtxOpts = {
  lifestyle?: Partial<Lifestyle>;
  profile?: Partial<ProfileSnapshot>;
  records?: Partial<RecordSnapshot>;
  bmi?: number | null;
  completeness?: number;
  missingInformation?: string[];
};

function makeCtx(opts: CtxOpts = {}): AssessmentContext {
  return {
    subjectId: "test-subject",
    profile: makeProfile({ lifestyle: makeLifestyle(opts.lifestyle), ...(opts.profile ?? {}) }),
    records: makeRecords(opts.records),
    quality: {
      completeness: opts.completeness ?? 85,
      warnings: [],
      missingInformation: opts.missingInformation ?? [],
    },
    bmi: opts.bmi === undefined ? 22.5 : opts.bmi,
    languagePref: "en",
  };
}

function vital(
  over: Partial<TriagedVitals> & { measuredAt: string }
): TriagedVitals & { measuredAt: string } {
  return {
    systolic: null,
    diastolic: null,
    heartRate: null,
    temperatureC: null,
    spo2: null,
    glucoseMgDl: null,
    atRest: true,
    ...over,
  };
}

function symptom(category: string): TriagedSymptom {
  return { category, severity1to10: 3, suddenOnset: false, worsening: false, durationDays: 2, associated: [] };
}

const SEV_RANK: Record<string, number> = { elevated: 0, watch: 1, informational: 2 };

/* ---------------- tests ---------------- */

describe("PHI risk signals — vitals", () => {
  it("BP >= 140 at rest produces vs-bp-elevated with severity watch (145)", () => {
    const ctx = makeCtx({
      records: { vitals: [vital({ systolic: 145, diastolic: 92, measuredAt: "2026-08-20" })] },
    });
    const signals = riskSignalProvider.generateSignals(ctx);
    const bp = signals.find((s) => s.id === "vs-bp-elevated");
    expect(bp).toBeDefined();
    expect(bp?.severity).toBe("watch");
    expect(bp?.category).toBe("vitals");
  });

  it("BP >= 160 at rest escalates vs-bp-elevated to severity elevated (165)", () => {
    const ctx = makeCtx({
      records: { vitals: [vital({ systolic: 165, diastolic: 98, measuredAt: "2026-08-20" })] },
    });
    const bp = riskSignalProvider.generateSignals(ctx).find((s) => s.id === "vs-bp-elevated");
    expect(bp?.severity).toBe("elevated");
  });

  it("BP below 140 does not produce a signal", () => {
    const ctx = makeCtx({
      records: { vitals: [vital({ systolic: 128, diastolic: 82, measuredAt: "2026-08-20" })] },
    });
    expect(riskSignalProvider.generateSignals(ctx).find((s) => s.id === "vs-bp-elevated")).toBeUndefined();
  });

  it("glucose >= 140 produces vs-glucose-raised", () => {
    const ctx = makeCtx({
      records: { vitals: [vital({ glucoseMgDl: 155, measuredAt: "2026-08-20" })] },
    });
    const g = riskSignalProvider.generateSignals(ctx).find((s) => s.id === "vs-glucose-raised");
    expect(g).toBeDefined();
    expect(g?.category).toBe("vitals");
  });
});

describe("PHI risk signals — BMI / lifestyle / labs / symptoms", () => {
  it("BMI >= 27.5 produces informational gen-weight-context", () => {
    const ctx = makeCtx({ bmi: 28.5 });
    const w = riskSignalProvider.generateSignals(ctx).find((s) => s.id === "gen-weight-context");
    expect(w).toBeDefined();
    expect(w?.severity).toBe("informational");
  });

  it("BMI below 27.5 produces no weight signal", () => {
    const ctx = makeCtx({ bmi: 22.5 });
    expect(riskSignalProvider.generateSignals(ctx).find((s) => s.id === "gen-weight-context")).toBeUndefined();
  });

  it("sleep < 6h produces ls-sleep-short", () => {
    const ctx = makeCtx({ lifestyle: { sleepHours: 5.5 } });
    expect(riskSignalProvider.generateSignals(ctx).some((s) => s.id === "ls-sleep-short")).toBe(true);
  });

  it("activity < 75 min/week produces ls-activity-low", () => {
    const ctx = makeCtx({ lifestyle: { activityMinutesWeek: 60 } });
    expect(riskSignalProvider.generateSignals(ctx).some((s) => s.id === "ls-activity-low")).toBe(true);
  });

  it("tobacco current produces ls-tobacco-current with elevated severity", () => {
    const ctx = makeCtx({ lifestyle: { tobacco: "current" } });
    const t = riskSignalProvider.generateSignals(ctx).find((s) => s.id === "ls-tobacco-current");
    expect(t).toBeDefined();
    expect(t?.severity).toBe("elevated");
  });

  it("stress high produces ls-stress-high", () => {
    const ctx = makeCtx({ lifestyle: { stressLevel: "high" } });
    expect(riskSignalProvider.generateSignals(ctx).some((s) => s.id === "ls-stress-high")).toBe(true);
  });

  it("HbA1c >= 5.7 lab produces lab-hba1c-raised", () => {
    const ctx = makeCtx({
      records: { labs: [{ testName: "HbA1c", value: 6.1, unit: "%", collectedAt: "2026-08-01" }] },
    });
    const lab = riskSignalProvider.generateSignals(ctx).find((s) => s.id === "lab-hba1c-raised");
    expect(lab).toBeDefined();
    expect(lab?.category).toBe("labs");
  });

  it("two symptoms in the same category produce a repeat signal; distinct categories do not", () => {
    const repeatCtx = makeCtx({ records: { symptoms: [symptom("headache"), symptom("headache")] } });
    expect(riskSignalProvider.generateSignals(repeatCtx).some((s) => s.id === "sym-repeat-headache")).toBe(true);

    const distinctCtx = makeCtx({ records: { symptoms: [symptom("headache"), symptom("fatigue")] } });
    const distinct = riskSignalProvider.generateSignals(distinctCtx);
    expect(distinct.some((s) => s.id.startsWith("sym-repeat-"))).toBe(false);
  });

  it("clean healthy profile produces zero signals", () => {
    const signals = riskSignalProvider.generateSignals(makeCtx());
    expect(signals).toHaveLength(0);
  });
});

describe("PHI risk signals — determinism, ordering, safety invariants", () => {
  it("same input twice produces identical output (JSON.stringify equality)", () => {
    const opts: CtxOpts = {
      lifestyle: { sleepHours: 5, stressLevel: "high", tobacco: "current" },
      records: { vitals: [vital({ systolic: 150, diastolic: 95, measuredAt: "2026-08-20" })] },
      bmi: 29,
    };
    const first = riskSignalProvider.generateSignals(makeCtx(opts));
    const secondSameCtx = riskSignalProvider.generateSignals(makeCtx(opts));
    expect(JSON.stringify(first)).toBe(JSON.stringify(secondSameCtx));

    // Rebuilt context (fresh object graph) must be identical too.
    const third = riskSignalProvider.generateSignals(makeCtx(opts));
    expect(JSON.stringify(first)).toBe(JSON.stringify(third));
  });

  it("signals are sorted elevated -> watch -> informational (id tiebreak)", () => {
    const ctx = makeCtx({
      lifestyle: { tobacco: "current" },
      records: { vitals: [vital({ systolic: 145, diastolic: 92, measuredAt: "2026-08-20" })] },
      bmi: 28.5,
    });
    const signals = riskSignalProvider.generateSignals(ctx);
    expect(signals.map((s) => s.id)).toEqual(["ls-tobacco-current", "vs-bp-elevated", "gen-weight-context"]);

    // General invariant: severity rank is non-decreasing through the array.
    for (let i = 1; i < signals.length; i++) {
      expect(SEV_RANK[signals[i].severity]).toBeGreaterThanOrEqual(SEV_RANK[signals[i - 1].severity]);
    }
  });

  it("every signal: notADiagnosis === true, confidence is a valid category, no numeric probability fields", () => {
    const contexts: AssessmentContext[] = [
      makeCtx(),
      makeCtx({ lifestyle: { sleepHours: 5, stressLevel: "high", tobacco: "current", activityMinutesWeek: 40 } }),
      makeCtx({
        records: {
          vitals: [vital({ systolic: 168, diastolic: 100, glucoseMgDl: 210, measuredAt: "2026-08-20" })],
          labs: [
            { testName: "HbA1c", value: 7.2, unit: "%", collectedAt: "2026-08-01" },
            { testName: "LDL", value: 150, unit: "mg/dL", collectedAt: "2026-08-01" },
          ],
          symptoms: [symptom("headache"), symptom("headache")],
        },
        bmi: 31,
      }),
    ];

    const all = contexts.flatMap((c) => riskSignalProvider.generateSignals(c));
    expect(all.length).toBeGreaterThan(5);

    for (const s of all) {
      expect(s.notADiagnosis).toBe(true);
      expect(typeof s.confidence).toBe("string");
      expect(CONFIDENCE_CATEGORIES).toContain(s.confidence);
      // No numeric probability-style fields anywhere on a signal.
      for (const key of Object.keys(s)) {
        expect(key.toLowerCase()).not.toMatch(/probab|likelihood|percent/);
      }
      expect(typeof (s as unknown as Record<string, unknown>).probability).not.toBe("number");
    }
  });
});
