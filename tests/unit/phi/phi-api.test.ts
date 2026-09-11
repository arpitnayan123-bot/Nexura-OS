/* ============================================================
 * NEXURA PHI — API SURFACE TESTS (pure parts)
 *
 * Route handlers depend on next/headers cookies() (request context),
 * so tests target the pure layers that routes are built from:
 *   1. src/modules/phi/schemas.ts — zod validation incl. unit
 *      conversions (temperatureF→°C, glucoseMmol→mg/dL) and the
 *      adults-only age rule.
 *   2. src/modules/phi/share-utils.ts — capability-token mechanics,
 *      grant expiry/revocation, section allow-list filtering, and
 *      clinician-summary "extra" composition.
 * ============================================================ */

import { describe, expect, it } from "vitest";
import {
  INTAKE_BUCKETS,
  allergySchema,
  consentPutSchema,
  feedbackPostSchema,
  isIntakeBucket,
  labSchema,
  lifestyleSchema,
  profilePutSchema,
  sharePostSchema,
  symptomSchema,
  vitalsSchema,
} from "@/modules/phi/schemas";
import {
  buildSummaryExtra,
  filterSummarySections,
  generateShareToken,
  isGrantActive,
  mergeSummaryExtra,
  shareExpiryFromNow,
  type SummaryExtra,
  type SummarySourceRows,
} from "@/modules/phi/share-utils";
import type { ClinicianSummary } from "@/modules/phi/contracts";
import { SHARE_SECTIONS } from "@/modules/phi/schemas";

/* ---------------- profile schema ---------------- */

describe("profilePutSchema", () => {
  it("rejects a minor age (adults-only tool)", () => {
    const r = profilePutSchema.safeParse({ ageYears: 12 });
    expect(r.success).toBe(false);
  });

  it("rejects an age above the supported maximum", () => {
    expect(profilePutSchema.safeParse({ ageYears: 121 }).success).toBe(false);
  });

  it("accepts a valid adult profile", () => {
    const r = profilePutSchema.safeParse({
      ageYears: 42,
      sexAtBirth: "male",
      heightCm: 172,
      weightKg: 74,
      waistCm: 88,
      pregnancyPossibility: false,
      languagePref: "en",
      dietaryPref: "vegetarian",
      cuisine: "south_indian",
      shiftWork: true,
      accessibilityNotes: "prefers large fonts",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.ageYears).toBe(42);
  });

  it("rejects implausible anthropometrics", () => {
    expect(profilePutSchema.safeParse({ heightCm: 300 }).success).toBe(false);
    expect(profilePutSchema.safeParse({ weightKg: 10 }).success).toBe(false);
    expect(profilePutSchema.safeParse({ waistCm: 20 }).success).toBe(false);
  });

  it("rejects unknown keys (strict body)", () => {
    expect(profilePutSchema.safeParse({ ageYears: 30, evilExtra: "x" }).success).toBe(false);
  });
});

/* ---------------- vitals schema: plausibility + unit conversions ---------------- */

describe("vitalsSchema", () => {
  it("rejects implausible vitals", () => {
    expect(vitalsSchema.safeParse({ systolic: 400 }).success).toBe(false);
    expect(vitalsSchema.safeParse({ diastolic: 10 }).success).toBe(false);
    expect(vitalsSchema.safeParse({ heartRate: 300 }).success).toBe(false);
    expect(vitalsSchema.safeParse({ spo2: 20 }).success).toBe(false);
    expect(vitalsSchema.safeParse({ weightKg: 5 }).success).toBe(false);
  });

  it("converts temperatureF to canonical temperatureC", () => {
    const r = vitalsSchema.safeParse({ temperatureF: 99 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.temperatureC).toBe(37.2);
      expect((r.data as Record<string, unknown>).temperatureF).toBeUndefined();
    }
  });

  it("keeps an explicit temperatureC untouched", () => {
    const r = vitalsSchema.safeParse({ temperatureC: 38.4 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.temperatureC).toBe(38.4);
  });

  it("converts glucoseMmol to canonical glucoseMgDl", () => {
    const r = vitalsSchema.safeParse({ glucoseMmol: 7 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.glucoseMgDl).toBe(126.1);
      expect((r.data as Record<string, unknown>).glucoseMmol).toBeUndefined();
    }
  });

  it("rejects providing both temperature units or both glucose units", () => {
    expect(vitalsSchema.safeParse({ temperatureC: 37, temperatureF: 99 }).success).toBe(false);
    expect(vitalsSchema.safeParse({ glucoseMgDl: 126, glucoseMmol: 7 }).success).toBe(false);
  });

  it("rejects a payload with no measurement at all", () => {
    expect(vitalsSchema.safeParse({ atRest: true, deviceSource: "user_entered" }).success).toBe(false);
  });

  it("rejects systolic <= diastolic", () => {
    expect(vitalsSchema.safeParse({ systolic: 110, diastolic: 130 }).success).toBe(false);
  });
});

/* ---------------- other intake schemas ---------------- */

describe("intake schemas", () => {
  it("symptomSchema rejects severity outside 1..10", () => {
    expect(symptomSchema.safeParse({ category: "headache", severity1to10: 0 }).success).toBe(false);
    expect(symptomSchema.safeParse({ category: "headache", severity1to10: 11 }).success).toBe(false);
    expect(symptomSchema.safeParse({ category: "headache", severity1to10: 7 }).success).toBe(true);
  });

  it("symptomSchema rejects more than 10 associated entries and over-long wording", () => {
    const associated = Array.from({ length: 11 }, (_, i) => `item-${i}`);
    expect(symptomSchema.safeParse({ category: "cough", severity1to10: 3, associated }).success).toBe(false);
    expect(
      symptomSchema.safeParse({ category: "cough", severity1to10: 3, userWording: "x".repeat(501) }).success
    ).toBe(false);
  });

  it("lifestyleSchema enforces ranges; unfilled fields stay missing (never fabricated defaults)", () => {
    expect(
      lifestyleSchema.safeParse({ sleepHours: 6.5, sleepQuality: "fair", activityMinutesWeek: 90, tobacco: "never", alcohol: "never", stressLevel: "low" }).success
    ).toBe(true);
    expect(lifestyleSchema.safeParse({ sleepHours: 30, sleepQuality: "fair", activityMinutesWeek: 90, tobacco: "never", alcohol: "never", stressLevel: "low" }).success).toBe(false);
    expect(lifestyleSchema.safeParse({ sleepHours: 6, sleepQuality: "fair", activityMinutesWeek: 4000, tobacco: "never", alcohol: "never", stressLevel: "low" }).success).toBe(false);
    // Partial entries are VALID: absence is treated as missing data by the
    // quality engine, never as a healthy default value.
    expect(lifestyleSchema.safeParse({ sleepHours: 6, sleepQuality: "fair" }).success).toBe(true);
    expect(lifestyleSchema.safeParse({}).success).toBe(true);
    // Unknown enum values still fail.
    expect(lifestyleSchema.safeParse({ stressLevel: "extreme" }).success).toBe(false);
  });

  it("labSchema requires testName, resultValue and unit", () => {
    expect(labSchema.safeParse({ testName: "HbA1c", resultValue: 6.2, unit: "%" }).success).toBe(true);
    expect(labSchema.safeParse({ resultValue: 6.2, unit: "%" }).success).toBe(false);
    expect(labSchema.safeParse({ testName: "HbA1c", unit: "%" }).success).toBe(false);
  });

  it("allergySchema validates severity enum", () => {
    expect(allergySchema.safeParse({ substance: "Peanuts", severity: "severe" }).success).toBe(true);
    expect(allergySchema.safeParse({ substance: "Peanuts", severity: "extreme" }).success).toBe(false);
  });
});

/* ---------------- bucket + small body schemas ---------------- */

describe("bucket and body validation", () => {
  it("recognizes exactly the seven intake buckets", () => {
    expect(INTAKE_BUCKETS).toEqual([
      "symptoms",
      "conditions",
      "medications",
      "allergies",
      "lifestyle",
      "vitals",
      "labs",
    ]);
    for (const b of INTAKE_BUCKETS) expect(isIntakeBucket(b)).toBe(true);
    expect(isIntakeBucket("notes")).toBe(false);
    expect(isIntakeBucket("../etc")).toBe(false);
    expect(isIntakeBucket("")).toBe(false);
  });

  it("consentPutSchema only accepts known scopes", () => {
    expect(consentPutSchema.safeParse({ scope: "health_profile", granted: true }).success).toBe(true);
    expect(consentPutSchema.safeParse({ scope: "banana", granted: true }).success).toBe(false);
    expect(consentPutSchema.safeParse({ scope: "health_profile", granted: "yes" }).success).toBe(false);
  });

  it("sharePostSchema enforces section allow-list and 30-day expiry cap", () => {
    expect(
      sharePostSchema.safeParse({ assessmentId: "a1", includes: ["detectedSignals"], expiresInDays: 30 }).success
    ).toBe(true);
    expect(
      sharePostSchema.safeParse({ assessmentId: "a1", includes: ["detectedSignals"], expiresInDays: 31 }).success
    ).toBe(false);
    expect(
      sharePostSchema.safeParse({ assessmentId: "a1", includes: ["mainSymptoms"] }).success
    ).toBe(false);
    expect(
      sharePostSchema.safeParse({ assessmentId: "a1", includes: [] }).success
    ).toBe(false);
  });

  it("feedbackPostSchema validates kind and message length", () => {
    expect(feedbackPostSchema.safeParse({ kind: "unclear" }).success).toBe(true);
    expect(feedbackPostSchema.safeParse({ kind: "wrong" }).success).toBe(false);
    expect(feedbackPostSchema.safeParse({ kind: "other", message: "x".repeat(1001) }).success).toBe(false);
  });
});

/* ---------------- share-utils: tokens, expiry, sections ---------------- */

describe("share token + grant lifecycle", () => {
  it("generates URL-safe, unique 72-char tokens", () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{72}$/);
    expect(a).not.toMatch(/[/+@#?&=]/);
  });

  it("computes expiry strictly from the requested day count", () => {
    const now = new Date("2026-01-15T10:00:00.000Z");
    const exp = shareExpiryFromNow(30, now);
    expect(exp.toISOString()).toBe("2026-02-14T10:00:00.000Z");
  });

  it("treats expired grants as inactive", () => {
    const grant = { expiresAt: new Date(Date.now() - 60_000).toISOString(), revokedAt: null };
    expect(isGrantActive(grant)).toBe(false);
  });

  it("treats revoked grants as inactive even before expiry", () => {
    const grant = { expiresAt: new Date(Date.now() + 86_400_000).toISOString(), revokedAt: new Date().toISOString() };
    expect(isGrantActive(grant)).toBe(false);
  });

  it("treats un-revoked, un-expired grants as active", () => {
    const grant = { expiresAt: new Date(Date.now() + 86_400_000).toISOString(), revokedAt: null };
    expect(isGrantActive(grant)).toBe(true);
  });
});

describe("filterSummarySections", () => {
  const fullSummary = {
    statement: "demo statement",
    detectedSignals: ["Signal A (watch, LOW_CONFIDENCE)"],
    missingInformation: ["Age is missing"],
    questionsToAsk: ["Which screenings make sense?"],
    recentVitals: ["Systolic 138 mmHg @ 2026-09-10T10:00:00.000Z"],
    medications: ["Metformin 500 mg"],
    allergies: ["Peanuts"],
    lifestyleContext: ["Lifestyle context: sleep 6.5 h."],
    // never-grantable sections:
    mainSymptoms: ["should never leak"],
    onsetAndDuration: "should never leak",
  };

  it("returns only the granted sections", () => {
    const { statement, sections } = filterSummarySections(fullSummary, ["detectedSignals", "medications"]);
    expect(statement).toBe("demo statement");
    expect(sections.detectedSignals).toEqual(["Signal A (watch, LOW_CONFIDENCE)"]);
    expect(sections.medications).toEqual(["Metformin 500 mg"]);
    expect(sections.missingInformation).toBeUndefined();
    expect(sections.questionsToAsk).toBeUndefined();
    expect(sections.recentVitals).toBeUndefined();
    expect(sections.allergies).toBeUndefined();
    expect(sections.lifestyleContext).toBeUndefined();
  });

  it("never exposes sections outside the allow-list, even if requested", () => {
    const { sections } = filterSummarySections(fullSummary, ["mainSymptoms", "onsetAndDuration", "detectedSignals"]);
    expect(Object.keys(sections)).toEqual(["detectedSignals"]);
    expect(sections.medications).toBeUndefined();
  });

  it("recognizes exactly the seven grantable sections", () => {
    expect(SHARE_SECTIONS).toEqual([
      "detectedSignals",
      "missingInformation",
      "questionsToAsk",
      "recentVitals",
      "medications",
      "allergies",
      "lifestyleContext",
    ]);
  });
});

/* ---------------- share-utils: summary extra composition ---------------- */

describe("buildSummaryExtra", () => {
  const rows: SummarySourceRows = {
    medications: [
      { name: "Metformin", strength: "500 mg", frequency: "twice daily" },
      { name: "Vitamin D", strength: null, frequency: null },
    ],
    allergies: [{ substance: "Peanuts", reaction: "rash", severity: "moderate" }],
    vitals: [
      { systolic: 120, diastolic: 80, heartRate: null, temperatureC: null, spo2: null, glucoseMgDl: null, weightKg: null, measuredAt: "2026-09-01T08:00:00.000Z" },
      { systolic: 138, diastolic: 88, heartRate: 76, temperatureC: null, spo2: 98, glucoseMgDl: null, weightKg: null, measuredAt: "2026-09-10T10:00:00.000Z" },
      { systolic: null, diastolic: null, heartRate: null, temperatureC: 37.2, spo2: null, glucoseMgDl: 110, weightKg: 74, measuredAt: "2026-09-05T09:00:00.000Z" },
    ],
    labs: [{ testName: "HbA1c", resultValue: 6.2, unit: "%", collectedAt: "2026-09-01T00:00:00.000Z" }],
    lifestyle: {
      sleepHours: 6.5,
      sleepQuality: "poor",
      activityMinutesWeek: 90,
      tobacco: "never",
      alcohol: "occasional",
      stressLevel: "high",
    },
    conditions: [{ name: "Hypertension", status: "managed" }],
  };

  it("formats vitals as metric strings with ISO timestamps", () => {
    const extra = buildSummaryExtra(rows);
    expect(extra.recentVitals).toContain("BP 138/88 mmHg, Pulse 76 bpm, SpO2 98% @ 2026-09-10T10:00:00.000Z");
    expect(extra.recentVitals).toContain("Temp 37.2 °C, Glucose 110 mg/dL, Weight 74 kg @ 2026-09-05T09:00:00.000Z");
    expect(extra.recentVitals).toContain("BP 120/80 mmHg @ 2026-09-01T08:00:00.000Z");
  });

  it("caps recent vitals at the 5 most recent measurements", () => {
    const many: SummarySourceRows = {
      ...rows,
      vitals: Array.from({ length: 8 }, (_, i) => ({
        systolic: 100 + i,
        diastolic: 70,
        heartRate: null,
        temperatureC: null,
        spo2: null,
        glucoseMgDl: null,
        weightKg: null,
        measuredAt: new Date(Date.UTC(2026, 8, 1 + i, 8)).toISOString(),
      })),
    };
    const extra = buildSummaryExtra(many);
    expect(extra.recentVitals).toHaveLength(5);
    expect(extra.recentVitals[0]).toContain("BP 107/70 mmHg"); // newest first
  });

  it("formats labs, medications, allergies, lifestyle and conditions", () => {
    const extra = buildSummaryExtra(rows);
    expect(extra.relevantLabs).toEqual(["HbA1c 6.2 % @ 2026-09-01"]);
    expect(extra.medications).toEqual(["Metformin 500 mg twice daily", "Vitamin D"]);
    expect(extra.allergies).toEqual(["Peanuts — reaction: rash — severity: moderate"]);
    expect(extra.lifestyleContext).toEqual([
      "Lifestyle context: sleep 6.5 h (poor); activity 90 min/week; tobacco never; alcohol occasional; stress high.",
    ]);
    expect(extra.conditions).toEqual(["Hypertension"]);
  });

  it("omits the lifestyle line entirely when no lifestyle row exists", () => {
    const extra = buildSummaryExtra({ ...rows, lifestyle: null });
    expect(extra.lifestyleContext).toEqual([]);
  });
});

/* ---------------- share-utils: E2 integration-window merge ---------------- */

describe("mergeSummaryExtra", () => {
  const extra: SummaryExtra = {
    medications: ["Metformin 500 mg twice daily"],
    allergies: ["Peanuts — reaction: rash"],
    recentVitals: ["BP 138/88 mmHg @ 2026-09-10T10:00:00.000Z"],
    relevantLabs: ["HbA1c 6.2 % @ 2026-09-01"],
    lifestyleContext: ["Lifestyle context: sleep 6.5 h."],
    conditions: ["Hypertension"],
  };

  function summaryWith(overrides: Partial<ClinicianSummary>): ClinicianSummary {
    return {
      generatedAt: "2026-09-10T10:00:00.000Z",
      mainSymptoms: [],
      onsetAndDuration: "",
      progression: "",
      relevantHistory: [],
      medications: [],
      allergies: [],
      recentVitals: [],
      relevantLabs: [],
      lifestyleContext: [],
      detectedSignals: [],
      missingInformation: [],
      questionsToAsk: [],
      assessmentId: "a1",
      rulesetVersion: "1.0.0",
      engineVersion: "0.1.0",
      statement: "demo",
      ...overrides,
    };
  }

  it("back-fills only the sections the 2-arg generator left empty", () => {
    const merged = mergeSummaryExtra(summaryWith({}), extra);
    expect(merged.medications).toEqual(["Metformin 500 mg twice daily"]);
    expect(merged.allergies).toEqual(["Peanuts — reaction: rash"]);
    expect(merged.recentVitals).toEqual(["BP 138/88 mmHg @ 2026-09-10T10:00:00.000Z"]);
    expect(merged.relevantLabs).toEqual(["HbA1c 6.2 % @ 2026-09-01"]);
    expect(merged.lifestyleContext).toEqual(["Lifestyle context: sleep 6.5 h."]);
  });

  it("never overwrites content the generator already produced", () => {
    const merged = mergeSummaryExtra(
      summaryWith({ medications: ["engine-formatted medication"], recentVitals: ["engine-formatted vital"] }),
      extra
    );
    expect(merged.medications).toEqual(["engine-formatted medication"]);
    expect(merged.recentVitals).toEqual(["engine-formatted vital"]);
    expect(merged.allergies).toEqual(["Peanuts — reaction: rash"]); // still empty -> filled
  });

  it("leaves non-section fields untouched", () => {
    const merged = mergeSummaryExtra(summaryWith({ statement: "keep me", detectedSignals: ["sig"] }), extra);
    expect(merged.statement).toBe("keep me");
    expect(merged.detectedSignals).toEqual(["sig"]);
    expect(merged.assessmentId).toBe("a1");
  });
});
