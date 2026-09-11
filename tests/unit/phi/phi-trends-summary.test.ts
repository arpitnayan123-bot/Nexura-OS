/* ============================================================
 * PHI-E2 — UNIT TESTS: trend engine + clinician summary generator
 * Pure functions only — NO DB access. Fixtures are inline.
 * ============================================================ */

import { describe, it, expect } from "vitest";
import type {
  PredictiveHealthAssessment,
  ProfileSnapshot,
  RecordSnapshot,
  RiskSignal,
} from "@/modules/phi/contracts";
import { PHI_DISCLAIMER } from "@/modules/phi/contracts";
import { clinicianSummaryGenerator, trendEngine } from "@/modules/phi/assessment/engines";

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

function vitalOn(day: string, systolic: number) {
  return {
    systolic,
    diastolic: 84,
    heartRate: null,
    temperatureC: null,
    spo2: null,
    glucoseMgDl: null,
    atRest: true,
    measuredAt: day,
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

function fakeSignal(id: string, label: string, severity: RiskSignal["severity"]): RiskSignal {
  return {
    id,
    label,
    category: "general",
    severity,
    confidence: "MODERATE_CONFIDENCE",
    contributingInputs: ["test.input"],
    observation: "test observation",
    whatIsUnknown: "test unknown",
    whatCouldClarify: "test clarify",
    recommendedNextStep: "test step",
    notADiagnosis: true,
  };
}

function makeAssessment(): PredictiveHealthAssessment {
  return {
    id: "ass-test-1",
    subjectId: "subject-1",
    createdAt: "2026-09-11T00:00:00.000Z",
    inputDataRange: { from: null, to: null },
    engineVersion: "0.1.0",
    rulesetId: "nexura-redflag",
    rulesetVersion: "1.0.0",
    contentVersion: "demo-1",
    dataCompleteness: 72,
    qualityWarnings: [],
    urgency: "MONITOR_AND_PREVENT",
    safetyAlerts: [],
    triageOnly: false,
    riskSignals: [
      fakeSignal("ls-sleep-short", "Sleep running short of the usual 7-9 hour range", "watch"),
      fakeSignal("gen-weight-context", "Weight context worth reviewing", "informational"),
    ],
    possiblePatterns: [],
    contributingFactors: ["sleep entries"],
    protectiveFactors: ["No tobacco use"],
    missingInformation: ["waist circumference"],
    recommendedNextSteps: [],
    clinicianQuestions: [
      { id: "q-sleep", question: "Could short sleep be affecting other things we track?", reason: "Sleep entries sit below the usual range." },
    ],
    trends: [],
    followUpIntervalDays: 30,
    disclaimer: PHI_DISCLAIMER,
    routingNotice: null,
    audit: { assessmentsRun: 1 },
  };
}

/* ---------------- trend engine ---------------- */

describe("PHI trend engine — vitals series", () => {
  it("3 rising systolic values [120,130,145] -> deteriorating", () => {
    const trends = trendEngine.analyze(
      makeRecords({
        vitals: [vitalOn("2026-08-01", 120), vitalOn("2026-08-10", 130), vitalOn("2026-08-20", 145)],
      })
    );
    const sys = trends.find((t) => t.metric === "systolic");
    expect(sys).toBeDefined();
    expect(sys?.direction).toBe("deteriorating");
    expect(sys?.dataPoints).toBe(3);
    expect(sys?.lastValue).toBe(145);
    expect(sys?.unit).toBe("mmHg");
  });

  it("3 falling systolic values [140,135,128] -> improving", () => {
    const trends = trendEngine.analyze(
      makeRecords({
        vitals: [vitalOn("2026-08-01", 140), vitalOn("2026-08-10", 135), vitalOn("2026-08-20", 128)],
      })
    );
    expect(trends.find((t) => t.metric === "systolic")?.direction).toBe("improving");
  });

  it("flat systolic values [120,121,119] -> stable", () => {
    const trends = trendEngine.analyze(
      makeRecords({
        vitals: [vitalOn("2026-08-01", 120), vitalOn("2026-08-10", 121), vitalOn("2026-08-20", 119)],
      })
    );
    expect(trends.find((t) => t.metric === "systolic")?.direction).toBe("stable");
  });

  it("single value -> insufficient_data", () => {
    const trends = trendEngine.analyze(makeRecords({ vitals: [vitalOn("2026-08-20", 128)] }));
    const sys = trends.find((t) => t.metric === "systolic");
    expect(sys).toBeDefined();
    expect(sys?.direction).toBe("insufficient_data");
    expect(sys?.dataPoints).toBe(1);
  });

  it("summary strings never claim a diagnosis (only the 'not a diagnosis' safety phrase is allowed)", () => {
    const trends = trendEngine.analyze(
      makeRecords({
        vitals: [vitalOn("2026-08-01", 120), vitalOn("2026-08-10", 130), vitalOn("2026-08-20", 145)],
      })
    );
    for (const t of trends) {
      // Strip the permitted safety negation, then forbid any remaining claim.
      const stripped = t.summary.toLowerCase().replace(/not a diagnosis/g, "");
      expect(stripped).not.toMatch(/\bdiagnos/);
    }
    expect(trends.some((t) => t.summary.toLowerCase().includes("not a diagnosis"))).toBe(true);
  });
});

describe("PHI trend engine — lifestyle series", () => {
  it("sleep hours [5,6,7] -> improving; [7,5.5,5] -> deteriorating", () => {
    const up = trendEngine.analyze(
      makeRecords({
        lifestyleEntries: [makeLifestyle({ sleepHours: 5 }), makeLifestyle({ sleepHours: 6 }), makeLifestyle({ sleepHours: 7 })],
      })
    );
    expect(up.find((t) => t.metric === "sleep_hours")?.direction).toBe("improving");

    const down = trendEngine.analyze(
      makeRecords({
        lifestyleEntries: [makeLifestyle({ sleepHours: 7 }), makeLifestyle({ sleepHours: 5.5 }), makeLifestyle({ sleepHours: 5 })],
      })
    );
    expect(down.find((t) => t.metric === "sleep_hours")?.direction).toBe("deteriorating");
  });

  it("stress high -> moderate -> improving; low -> high -> deteriorating", () => {
    const easing = trendEngine.analyze(
      makeRecords({ lifestyleEntries: [makeLifestyle({ stressLevel: "high" }), makeLifestyle({ stressLevel: "moderate" })] })
    );
    expect(easing.find((t) => t.metric === "stress")?.direction).toBe("improving");

    const rising = trendEngine.analyze(
      makeRecords({ lifestyleEntries: [makeLifestyle({ stressLevel: "low" }), makeLifestyle({ stressLevel: "high" })] })
    );
    expect(rising.find((t) => t.metric === "stress")?.direction).toBe("deteriorating");
  });

  it("repeated symptom categories produce a symptom_repeats observation", () => {
    const trends = trendEngine.analyze(
      makeRecords({
        symptoms: [
          { category: "headache", severity1to10: 3, suddenOnset: false, worsening: false, durationDays: 2, associated: [] },
          { category: "headache", severity1to10: 4, suddenOnset: false, worsening: false, durationDays: 3, associated: [] },
        ],
      })
    );
    const rep = trends.find((t) => t.metric === "symptom_repeats");
    expect(rep).toBeDefined();
    expect(rep?.summary).toContain("more than once");
  });
});

/* ---------------- clinician summary generator ---------------- */

describe("PHI clinician summary generator", () => {
  it("backward-compatible 2-arg call works and leaves record-derived sections empty", () => {
    const summary = clinicianSummaryGenerator.generate("subject-1", makeAssessment());
    expect(summary.assessmentId).toBe("ass-test-1");
    expect(summary.medications).toEqual([]);
    expect(summary.allergies).toEqual([]);
    expect(summary.recentVitals).toEqual([]);
    expect(summary.relevantLabs).toEqual([]);
    expect(summary.lifestyleContext).toEqual([]);
    expect(summary.mainSymptoms).toContain("Sleep running short of the usual 7-9 hour range");
    expect(summary.detectedSignals[0]).toContain("watch");
    expect(summary.questionsToAsk).toContain("Could short sleep be affecting other things we track?");
    expect(summary.rulesetVersion).toBe("1.0.0");
    expect(summary.engineVersion).toBe("0.1.0");
  });

  it("statement carries the does-not-diagnose posture", () => {
    const summary = clinicianSummaryGenerator.generate("subject-1", makeAssessment());
    expect(summary.statement).toContain("does not diagnose");
    expect(summary.statement).toBe(
      `${PHI_DISCLAIMER} Generated by Nexura PHI engine v0.1.0, ruleset v1.0.0.`
    );
  });

  it("extra context fills medications / allergies / recentVitals / relevantLabs / lifestyleContext", () => {
    const summary = clinicianSummaryGenerator.generate("subject-1", makeAssessment(), {
      medications: ["Metformin"],
      allergies: ["Peanut"],
      vitals: ["BP 148/92 resting, 2026-08-20"],
      labs: ["HbA1c 6.1% (2026-08-01)"],
      lifestyle: ["Sleep 5h per night"],
      conditions: ["Hypertension (clinician confirmed)"],
    });
    expect(summary.medications).toEqual(["Metformin"]);
    expect(summary.allergies).toEqual(["Peanut"]);
    expect(summary.recentVitals).toEqual(["BP 148/92 resting, 2026-08-20"]);
    expect(summary.relevantLabs).toEqual(["HbA1c 6.1% (2026-08-01)"]);
    expect(summary.lifestyleContext).toEqual(["Sleep 5h per night"]);
    // Conditions join the relevant history after the assessment's own contributing factors.
    expect(summary.relevantHistory).toEqual(["sleep entries", "Hypertension (clinician confirmed)"]);
  });

  it("extra context strings are normalised (whitespace collapsed, empties dropped)", () => {
    const summary = clinicianSummaryGenerator.generate("subject-1", makeAssessment(), {
      medications: ["  Tab   A  ", "", "   "],
      allergies: ["Peanut"],
      vitals: ["BP 148/92 resting"],
      labs: ["HbA1c 6.1%"],
      lifestyle: ["Sleep 5h per night"],
      conditions: [],
    });
    expect(summary.medications).toEqual(["Tab A"]);
    expect(summary.relevantHistory).toEqual(["sleep entries"]);
  });
});
