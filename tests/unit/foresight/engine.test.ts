/* ============================================================
 * FORESIGHT ENGINE TESTS — orchestrator guarantees
 * ============================================================ */

import { describe, expect, it } from "vitest";
import { runForesight, summarizeForDoctor } from "@/modules/foresight/engine";
import { ENGINE_VERSION, CALIBRATION_VERSION, RULESET_VERSION } from "@/modules/foresight/types";
import { EMPTY_INPUT } from "./fixtures";

describe("orchestration", () => {
  it("stamps all three versions on every report", () => {
    const r = runForesight(EMPTY_INPUT);
    expect(r.engineVersion).toBe(ENGINE_VERSION);
    expect(r.rulesetVersion).toBe(RULESET_VERSION);
    expect(r.calibrationVersion).toBe(CALIBRATION_VERSION);
    expect(r.generatedAt).toBeTruthy();
  });

  it("is deterministic: same input => same score and domains", () => {
    const a = runForesight({ ...EMPTY_INPUT, labs: { hba1cPct: 6.1 } });
    const b = runForesight({ ...EMPTY_INPUT, labs: { hba1cPct: 6.1 } });
    expect(a.foresightScore).toBe(b.foresightScore);
    expect(a.domains.map((d) => [d.id, d.burden])).toEqual(b.domains.map((d) => [d.id, d.burden]));
    expect(a.topDomainIds).toEqual(b.topDomainIds);
  });

  it("healthy profile scores higher than a loaded profile, with real separation", () => {
    const healthy = runForesight(EMPTY_INPUT).foresightScore;
    const loaded = runForesight({
      ...EMPTY_INPUT,
      profile: { ...EMPTY_INPUT.profile, weightKg: 100, waistCm: 110 },
      history: {
        ...EMPTY_INPUT.history,
        tobacco: "current_smoke",
        stress: "high",
        familyHistory: ["diabetes", "heart_disease"],
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
    }).foresightScore;
    expect(loaded).toBeLessThan(healthy);
    expect(healthy - loaded).toBeGreaterThan(15);
    expect(healthy).toBeGreaterThan(80);
    expect(loaded).toBeLessThan(75);
  });

  it("a diabetes-range lab drags the composite into attention territory", () => {
    const r = runForesight({
      ...EMPTY_INPUT,
      labs: { hba1cPct: 8.4 },
      vitals: { systolic: 152, diastolic: 98 },
    });
    expect(r.foresightScore).toBeLessThan(68);
    expect(r.scoreBand === "BUILDING" || r.scoreBand === "ATTENTION").toBe(true);
    const metabolic = r.domains.find((d) => d.id === "metabolic")!;
    expect(metabolic.level).toBe("HIGH");
  });

  it("EMERGENCY triage withholds the analysis entirely", () => {
    const r = runForesight({
      ...EMPTY_INPUT,
      symptoms: [{ id: "sym.chest_pain", severity: 9, onsetDays: 0, worsening: true }],
    });
    expect(r.triage.level).toBe("EMERGENCY");
    expect(r.analysisWithheld).toBe(true);
    expect(r.domains.every((d) => d.burden === 0 && d.factors.length === 0)).toBe(true);
    expect(r.foresightScore).toBeLessThanOrEqual(35);
  });

  it("trajectory respects invariants: unchanged < current < withActions for loaded profiles", () => {
    const r = runForesight({
      ...EMPTY_INPUT,
      profile: { ...EMPTY_INPUT.profile, weightKg: 95, waistCm: 105 },
      history: { ...EMPTY_INPUT.history, tobacco: "current_smoke", stress: "high" },
      activity: { ...EMPTY_INPUT.activity, minutesPerWeek: 0 },
      sleep: { ...EMPTY_INPUT.sleep, hoursPerNight: 5, quality: "poor" },
    });
    expect(r.trajectory.unchangedScore).toBeLessThan(r.foresightScore);
    expect(r.trajectory.withActionsScore).toBeGreaterThan(r.foresightScore);
    expect(r.trajectory.unchangedScore).toBeGreaterThanOrEqual(0);
    expect(r.trajectory.withActionsScore).toBeLessThanOrEqual(100);
  });

  it("surfaces protective factors and caps at 6", () => {
    const r = runForesight(EMPTY_INPUT);
    expect(r.protectiveFactors.length).toBeGreaterThan(0);
    expect(r.protectiveFactors.length).toBeLessThanOrEqual(6);
  });

  it("completeness reports honestly when fields are missing", () => {
    const thin = runForesight({
      ...EMPTY_INPUT,
      profile: { ageYears: 40, sexAtBirth: "undisclosed" },
      vitals: {},
      history: { ...EMPTY_INPUT.history, familyHistory: [] },
    });
    expect(thin.completeness.missing).toContain("height");
    expect(thin.completeness.missing).toContain("bp");
    expect(thin.completeness.pct).toBeLessThan(100);
  });

  it("diet prescription follows the chosen cuisine", () => {
    const south = runForesight({ ...EMPTY_INPUT, diet: { ...EMPTY_INPUT.diet, cuisine: "south" } });
    expect(south.diet.cuisineLabel).toBe("South Indian");
    expect(south.diet.swaps.some((s) => /millet|rice/i.test(s.from + s.to))).toBe(true);
  });

  it("doctor summary contains triage, score and top domains", () => {
    const r = runForesight({ ...EMPTY_INPUT, labs: { hba1cPct: 6.7 } });
    const text = summarizeForDoctor(r, { ...EMPTY_INPUT, labs: { hba1cPct: 6.7 } });
    expect(text).toContain("NEXURA PREDICTIVE");
    expect(text).toContain("Foresight Score");
    expect(text).toContain("METABOLIC");
    expect(text).toContain(r.disclaimer.slice(0, 30));
  });
});
