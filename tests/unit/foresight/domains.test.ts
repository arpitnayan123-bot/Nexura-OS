/* ============================================================
 * FORESIGHT ENGINE TESTS — domain scorers
 * ============================================================ */

import { describe, expect, it } from "vitest";
import { scoreAllDomains } from "@/modules/foresight/domains";
import { EMPTY_INPUT } from "./fixtures";

const domain = (id: string) => scoreAllDomains(EMPTY_INPUT).find((d) => d.id === id)!;

describe("metabolic domain", () => {
  it("healthy-weight active adult stays LOW", () => {
    const m = domain("metabolic");
    expect(m.level).toBe("LOW");
  });
  it("South-Asian BMI 25+ + family history + sweets stacks ELEVATED", () => {
    const all = scoreAllDomains({
      ...EMPTY_INPUT,
      profile: { ...EMPTY_INPUT.profile, weightKg: 78, waistCm: 94, heightCm: 172 }, // BMI 26.4
      history: { ...EMPTY_INPUT.history, familyHistory: ["diabetes"] },
      diet: {
        ...EMPTY_INPUT.diet,
        sweetsPerWeek: "daily",
        friedPerWeek: "weekly",
        riceRotiBalance: "rice_heavy",
      },
      activity: { ...EMPTY_INPUT.activity, minutesPerWeek: 20 },
      symptoms: [
        { id: "sym.thirst_excess", severity: 5, onsetDays: 20, worsening: false },
        { id: "sym.urination_frequent", severity: 5, onsetDays: 20, worsening: false },
      ],
    }).find((x) => x.id === "metabolic")!;
    expect(all.burden).toBeGreaterThan(40);
    expect(all.level === "ELEVATED" || all.level === "HIGH").toBe(true);
    expect(all.factors.some((f) => f.id === "m.family")).toBe(true);
  });
  it("HbA1c 6.9 anchors the domain to HIGH with a doctor action", () => {
    const all = scoreAllDomains({
      ...EMPTY_INPUT,
      labs: { hba1cPct: 6.9 },
    }).find((x) => x.id === "metabolic")!;
    expect(all.confidence).toBe("HIGHER_WITHIN_SCREENING_SCOPE");
    expect(all.actions[0].title.toLowerCase()).toContain("doctor");
  });
  it("HbA1c 5.2 is protective", () => {
    const all = scoreAllDomains({ ...EMPTY_INPUT, labs: { hba1cPct: 5.2 } }).find(
      (x) => x.id === "metabolic",
    )!;
    expect(all.factors.some((f) => f.direction === "protective" && f.id === "m.hba1c")).toBe(true);
  });
});

describe("hemoglobin domain", () => {
  it("Hb 8.9 in a woman anchors ELEVATED/HIGH", () => {
    const all = scoreAllDomains({
      ...EMPTY_INPUT,
      profile: { ...EMPTY_INPUT.profile, sexAtBirth: "female" },
      labs: { hemoglobinGdl: 8.9 },
    }).find((x) => x.id === "hemoglobin")!;
    expect(all.burden).toBeGreaterThanOrEqual(40);
    expect(all.confidence).toBe("HIGHER_WITHIN_SCREENING_SCOPE");
  });
  it("vegetarian + female + fatigue raises burden even without labs (LOW confidence)", () => {
    const all = scoreAllDomains({
      ...EMPTY_INPUT,
      profile: { ...EMPTY_INPUT.profile, sexAtBirth: "female" },
      diet: { ...EMPTY_INPUT.diet, type: "vegetarian" },
      symptoms: [{ id: "sym.fatigue_persistent", severity: 6, onsetDays: 30, worsening: false }],
    }).find((x) => x.id === "hemoglobin")!;
    expect(all.burden).toBeGreaterThan(0);
    expect(all.confidence).not.toBe("HIGHER_WITHIN_SCREENING_SCOPE");
  });
});

describe("sleep / OSA domain", () => {
  it("loud snoring + severe sleepiness + high waist clusters", () => {
    const all = scoreAllDomains({
      ...EMPTY_INPUT,
      profile: { ...EMPTY_INPUT.profile, weightKg: 95, waistCm: 104 }, // BMI 32
      sleep: { ...EMPTY_INPUT.sleep, snoring: "loud_regular", daytimeSleepiness: "severe" },
    }).find((x) => x.id === "sleep")!;
    expect(all.burden).toBeGreaterThan(40);
    expect(all.screening.some((s) => s.test.toLowerCase().includes("sleep study"))).toBe(true);
  });
});

describe("thyroid domain", () => {
  it("TSH 9.8 anchors above the screening band", () => {
    const all = scoreAllDomains({ ...EMPTY_INPUT, labs: { tshMiuL: 9.8 } }).find(
      (x) => x.id === "thyroid",
    )!;
    expect(all.factors.some((f) => f.id === "th.tsh" && f.direction === "risk")).toBe(true);
    expect(all.confidence).toBe("HIGHER_WITHIN_SCREENING_SCOPE");
  });
});

describe("b12 domain", () => {
  it("vegetarian + tingling raises the nerve pattern", () => {
    const all = scoreAllDomains({
      ...EMPTY_INPUT,
      diet: { ...EMPTY_INPUT.diet, type: "vegetarian" },
      symptoms: [
        { id: "sym.tingling_feet", severity: 5, onsetDays: 30, worsening: false },
        { id: "sym.memory_fog", severity: 4, onsetDays: 60, worsening: false },
      ],
    }).find((x) => x.id === "b12")!;
    expect(all.burden).toBeGreaterThan(18);
  });
});

describe("lungs domain", () => {
  it("severe AQI adds real burden in Delhi-winter profiles", () => {
    const severe = scoreAllDomains({
      ...EMPTY_INPUT,
      environment: { aqiBand: "severe", sunlightMinutesPerDay: 10 },
    }).find((x) => x.id === "lungs")!;
    const good = domain("lungs");
    expect(severe.burden).toBeGreaterThan(good.burden);
  });
  it("3-week cough inserts the TB-rule screening", () => {
    const all = scoreAllDomains({
      ...EMPTY_INPUT,
      symptoms: [{ id: "sym.cough_persistent", severity: 4, onsetDays: 25, worsening: false }],
    }).find((x) => x.id === "lungs")!;
    expect(all.screening.some((s) => /x-ray|doctor/i.test(s.test))).toBe(true);
  });
});

describe("pcos domain", () => {
  it("is skipped for male profiles with insufficient confidence", () => {
    const all = scoreAllDomains(EMPTY_INPUT).find((x) => x.id === "pcos")!;
    expect(all.burden).toBe(0);
    expect(all.confidence).toBe("INSUFFICIENT_INFORMATION");
  });
  it("irregular cycles + high waist clusters for women", () => {
    const all = scoreAllDomains({
      ...EMPTY_INPUT,
      profile: { ...EMPTY_INPUT.profile, sexAtBirth: "female", weightKg: 82, waistCm: 92 },
      history: { ...EMPTY_INPUT.history, menstruationRegular: false, familyHistory: ["pcos"] },
      activity: { ...EMPTY_INPUT.activity, minutesPerWeek: 10 },
    }).find((x) => x.id === "pcos")!;
    expect(all.burden).toBeGreaterThan(40);
  });
});

describe("mind domain", () => {
  it("high stress + 11 low days + short sleep loads the domain", () => {
    const all = scoreAllDomains({
      ...EMPTY_INPUT,
      history: { ...EMPTY_INPUT.history, stress: "high", moodLowDays: 11 },
      sleep: { ...EMPTY_INPUT.sleep, hoursPerNight: 5, quality: "poor" },
    }).find((x) => x.id === "mind")!;
    expect(all.burden).toBeGreaterThan(40);
    expect(all.screening.some((s) => s.test.toLowerCase().includes("counsellor"))).toBe(true);
  });
});

describe("universals", () => {
  it("every domain ships explainable factors for non-LOW levels", () => {
    const loaded = scoreAllDomains({
      ...EMPTY_INPUT,
      profile: { ...EMPTY_INPUT.profile, weightKg: 98, waistCm: 108 },
      history: {
        ...EMPTY_INPUT.history,
        tobacco: "current_smoke",
        stress: "high",
        familyHistory: ["diabetes", "heart_disease", "hypertension"],
      },
      diet: {
        ...EMPTY_INPUT.diet,
        sweetsPerWeek: "daily",
        friedPerWeek: "daily",
        salt: "high",
        sugaryDrinksPerWeek: "daily",
      },
      activity: { ...EMPTY_INPUT.activity, minutesPerWeek: 0 },
      sleep: {
        ...EMPTY_INPUT.sleep,
        hoursPerNight: 5,
        quality: "poor",
        snoring: "loud_regular",
        daytimeSleepiness: "severe",
      },
    });
    for (const d of loaded) {
      if (d.level !== "LOW") {
        expect(d.factors.length, `${d.id} should explain itself`).toBeGreaterThan(0);
        expect(d.actions.length, `${d.id} should offer actions`).toBeGreaterThan(0);
      }
      expect(d.burden).toBeGreaterThanOrEqual(0);
      expect(d.burden).toBeLessThanOrEqual(100);
      expect(Object.keys(d).sort()).toEqual(
        [
          "actions",
          "burden",
          "clinicianQuestions",
          "confidence",
          "factors",
          "headline",
          "id",
          "level",
          "screening",
        ].sort(),
      );
    }
  });
});
