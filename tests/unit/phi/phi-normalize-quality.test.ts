import { describe, expect, it } from "vitest";
import {
  calcBmi,
  feetInchesToCm,
  fahrenheitToCelsius,
  glucoseMgDlToMmol,
  glucoseMmolToMgDl,
  isPlausible,
  isPlausibleBp,
  lbToKg,
  normalizeAdultAge,
  normalizeSex,
  parseBloodPressure,
} from "@/modules/phi/normalize";
import { dataQualityEngine } from "@/modules/phi/quality/engine";
import type { ProfileSnapshot, RecordSnapshot } from "@/modules/phi/contracts";

/* ============================================================
 * PHI NORMALIZATION + DATA QUALITY REGRESSION
 * Missing is never normal; implausible values never silently pass.
 * ============================================================ */

describe("BMI", () => {
  it("computes standard values", () => {
    expect(calcBmi(70, 175)).toBeCloseTo(22.9, 1);
    expect(calcBmi(90, 175)).toBeCloseTo(29.4, 1);
  });
  it("rejects implausible inputs", () => {
    expect(calcBmi(0, 175)).toBeNull();
    expect(calcBmi(70, 0)).toBeNull();
    expect(calcBmi(500, 100)).toBeNull();
    expect(calcBmi(NaN, 175)).toBeNull();
  });
});

describe("unit conversions", () => {
  it("feet/inches to cm", () => {
    expect(feetInchesToCm(5, 8)).toBe(172.7);
    expect(feetInchesToCm(0, 8)).toBeNull();
    expect(feetInchesToCm(6, 12)).toBeNull();
  });
  it("lb to kg", () => {
    expect(lbToKg(220.46)).toBe(100);
    expect(lbToKg(-5)).toBeNull();
  });
  it("fahrenheit to celsius", () => {
    expect(fahrenheitToCelsius(100.4)).toBe(38);
    expect(fahrenheitToCelsius(60)).toBeNull(); // below human range — likely input error
  });
  it("glucose mmol<->mg/dL", () => {
    expect(glucoseMmolToMgDl(5.5)).toBeCloseTo(99.1, 0);
    expect(glucoseMgDlToMmol(126)).toBeCloseTo(7.0, 1);
    expect(glucoseMmolToMgDl(-1)).toBeNull();
  });
});

describe("blood pressure parsing", () => {
  it("parses 120/80", () => {
    expect(parseBloodPressure("120/80")).toEqual({ systolic: 120, diastolic: 80 });
    expect(parseBloodPressure(" 120 / 80 ")).toEqual({ systolic: 120, diastolic: 80 });
  });
  it("rejects reversed or implausible pairs", () => {
    expect(parseBloodPressure("80/120")).toBeNull();
    expect(parseBloodPressure("400/80")).toBeNull();
    expect(parseBloodPressure("abc")).toBeNull();
  });
  it("isPlausibleBp requires systolic > diastolic", () => {
    expect(isPlausibleBp(120, 80)).toBe(true);
    expect(isPlausibleBp(80, 80)).toBe(false);
    expect(isPlausibleBp(200, 120)).toBe(true);
  });
});

describe("plausibility ranges", () => {
  it("accepts human values and rejects machine errors", () => {
    expect(isPlausible("heartRate", 72)).toBe(true);
    expect(isPlausible("heartRate", 10)).toBe(false);
    expect(isPlausible("spo2", 98)).toBe(true);
    expect(isPlausible("spo2", 12)).toBe(false);
    expect(isPlausible("temperatureC", 37)).toBe(true);
    expect(isPlausible("temperatureC", 55)).toBe(false);
  });
});

describe("sex and adult-age normalization", () => {
  it("normalizes sex aliases", () => {
    expect(normalizeSex("F")).toBe("female");
    expect(normalizeSex("Male")).toBe("male");
    expect(normalizeSex("prefer_not_to_say")).toBe("undisclosed");
    expect(normalizeSex("banana")).toBeNull();
  });
  it("routes minors out (null) and keeps plausible adults", () => {
    expect(normalizeAdultAge(17)).toBeNull();
    expect(normalizeAdultAge(4)).toBeNull();
    expect(normalizeAdultAge(34)).toBe(34);
    expect(normalizeAdultAge(null)).toBeNull();
  });
});

/* ---------------- data quality ---------------- */

function cleanProfile(): ProfileSnapshot {
  return {
    ageYears: 34,
    sexAtBirth: "female",
    pregnancyPossibility: false,
    heightCm: 165,
    weightKg: 68,
    waistCm: null,
    conditions: [{ name: "hypothyroidism", source: "clinician_confirmed", status: "managed" }],
    medications: [{ name: "levothyroxine", strength: null, frequency: null }],
    allergies: [],
    lifestyle: {
      sleepHours: 7,
      sleepQuality: "good",
      activityMinutesWeek: 120,
      sedentaryHours: 6,
      fruitsVegFrequency: "daily",
      proteinSources: "dal, curd",
      waterGlasses: 8,
      tobacco: "never",
      alcohol: "occasional",
      stressLevel: "moderate",
      shiftWork: false,
    },
    dietaryPref: "vegetarian",
    languagePref: "en",
  };
}

function cleanRecords(): RecordSnapshot {
  return {
    symptoms: [{ category: "headache", severity1to10: 4, suddenOnset: false, worsening: false, durationDays: 3, associated: [] }],
    vitals: [{ systolic: 124, diastolic: 82, heartRate: 74, temperatureC: 36.8, spo2: 98, glucoseMgDl: 96, atRest: true, measuredAt: new Date().toISOString(), confidence: "sure" }],
    labs: [],
    lifestyleEntries: [],
    assessmentHistory: [],
  };
}

describe("data quality — completeness", () => {
  it("scores a fully populated profile near 100", () => {
    const q = dataQualityEngine.assess(cleanProfile(), cleanRecords());
    expect(q.completeness).toBeGreaterThanOrEqual(90);
    expect(q.warnings).toHaveLength(0);
  });

  it("treats missing as missing — never as normal", () => {
    const profile = cleanProfile();
    profile.lifestyle = null;
    const q = dataQualityEngine.assess(profile, { ...cleanRecords(), vitals: [], labs: [], symptoms: [] });
    expect(q.completeness).toBeLessThan(80);
    expect(q.missingInformation.length).toBeGreaterThan(2);
    expect(q.missingInformation.some((m) => m.toLowerCase().includes("readings"))).toBe(true);
    expect(q.missingInformation.some((m) => m.toLowerCase().includes("symptoms"))).toBe(true);
    expect(q.missingInformation.some((m) => m.toLowerCase().includes("lab results"))).toBe(true);
  });

  it("flags age as required for safe routing", () => {
    const profile = cleanProfile();
    profile.ageYears = null;
    const q = dataQualityEngine.assess(profile, cleanRecords());
    expect(q.missingInformation.some((m) => m.toLowerCase().includes("age"))).toBe(true);
  });
});

describe("data quality — plausibility + contradiction", () => {
  it("flags reversed blood pressure as implausible", () => {
    const records = cleanRecords();
    records.vitals = [{ systolic: 80, diastolic: 120, atRest: true, measuredAt: new Date().toISOString() }];
    const q = dataQualityEngine.assess(cleanProfile(), records);
    expect(q.warnings.some((w) => w.issue === "implausible" && w.field.includes("blood_pressure"))).toBe(true);
  });

  it("flags out-of-range temperature as implausible", () => {
    const records = cleanRecords();
    records.vitals = [{ temperatureC: 55, atRest: true, measuredAt: new Date().toISOString() }];
    const q = dataQualityEngine.assess(cleanProfile(), records);
    expect(q.warnings.some((w) => w.issue === "implausible" && w.field.includes("temperature"))).toBe(true);
  });

  it("flags contradictory same-day resting BP readings (40+ spread)", () => {
    const now = new Date().toISOString();
    const records = cleanRecords();
    records.vitals = [
      { systolic: 118, diastolic: 78, atRest: true, measuredAt: now },
      { systolic: 168, diastolic: 95, atRest: true, measuredAt: now },
    ];
    const q = dataQualityEngine.assess(cleanProfile(), records);
    expect(q.warnings.some((w) => w.issue === "contradictory")).toBe(true);
  });

  it("flags low-confidence readings with caution language", () => {
    const records = cleanRecords();
    records.vitals = [{ systolic: 124, diastolic: 82, atRest: true, measuredAt: new Date().toISOString(), confidence: "unsure" }];
    const q = dataQualityEngine.assess(cleanProfile(), records);
    expect(q.warnings.some((w) => w.issue === "low_confidence")).toBe(true);
  });

  it("is deterministic", () => {
    const a = dataQualityEngine.assess(cleanProfile(), cleanRecords());
    const b = dataQualityEngine.assess(cleanProfile(), cleanRecords());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("never includes raw values in missing-information messages", () => {
    const profile = cleanProfile();
    profile.weightKg = null;
    const q = dataQualityEngine.assess(profile, cleanRecords());
    for (const m of q.missingInformation) {
      expect(m).not.toMatch(/\d+\s*kg/i);
    }
  });
});
