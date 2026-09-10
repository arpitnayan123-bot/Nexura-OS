/* ============================================================
 * PIE — India Calibration test suite
 * Determinism, monotonicity (every modifiable factor moves risk
 * the right way), Indian-specific calibration anchors, banding
 * and the one-change nudge invariants.
 * ============================================================ */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE,
  INDIAN_CITIES,
  bandOfOnset,
  computeOnsetRisk,
  nudgeFor,
  type RiskProfile,
} from "@/modules/pi-engine/india-calibration";

const profile = (over: Partial<RiskProfile> = {}): RiskProfile => ({
  ...DEFAULT_PROFILE,
  diet: { ...DEFAULT_PROFILE.diet },
  ...over,
});

describe("india calibration — determinism & shape", () => {
  it("is deterministic: same profile, same risks", () => {
    const a = computeOnsetRisk(DEFAULT_PROFILE);
    const b = computeOnsetRisk(DEFAULT_PROFILE);
    expect(a).toEqual(b);
  });

  it("returns three risks in [0.02, 0.85] and an early-warning score in [5, 100]", () => {
    for (const p of [DEFAULT_PROFILE, profile({ age: 62, smoker: true }), profile({ age: 24, exerciseMinPerDay: 60, sleepHours: 8 })]) {
      const r = computeOnsetRisk(p);
      for (const v of Object.values(r.risks)) {
        expect(v).toBeGreaterThanOrEqual(0.02);
        expect(v).toBeLessThanOrEqual(0.85);
      }
      expect(r.earlyWarning).toBeGreaterThanOrEqual(5);
      expect(r.earlyWarning).toBeLessThanOrEqual(100);
      expect(r.drivers.length).toBeGreaterThan(0);
    }
  });
});

describe("india calibration — monotonicity of modifiable factors", () => {
  it("more exercise never increases any risk", () => {
    const low = computeOnsetRisk(profile({ exerciseMinPerDay: 60 }));
    const high = computeOnsetRisk(profile({ exerciseMinPerDay: 0 }));
    expect(high.risks.type2).toBeGreaterThan(low.risks.type2);
    expect(high.risks.hypertension).toBeGreaterThan(low.risks.hypertension);
    expect(high.risks.cardiac).toBeGreaterThan(low.risks.cardiac);
  });

  it("better sleep never increases risk", () => {
    const good = computeOnsetRisk(profile({ sleepHours: 7.5 }));
    const bad = computeOnsetRisk(profile({ sleepHours: 5 }));
    expect(bad.risks.type2).toBeGreaterThan(good.risks.type2);
    expect(bad.risks.cardiac).toBeGreaterThan(good.risks.cardiac);
  });

  it("each diet flag independently raises type-2 risk", () => {
    const clean = computeOnsetRisk(profile({ diet: { outsideFoodOften: false, sugaryDrinks: false, lateNightMeals: false } }));
    expect(computeOnsetRisk(profile({ diet: { outsideFoodOften: true, sugaryDrinks: false, lateNightMeals: false } })).risks.type2).toBeGreaterThan(clean.risks.type2);
    expect(computeOnsetRisk(profile({ diet: { outsideFoodOften: false, sugaryDrinks: true, lateNightMeals: false } })).risks.type2).toBeGreaterThan(clean.risks.type2);
    expect(computeOnsetRisk(profile({ diet: { outsideFoodOften: false, sugaryDrinks: false, lateNightMeals: true } })).risks.type2).toBeGreaterThan(clean.risks.type2);
  });

  it("worse air never lowers cardiac risk", () => {
    const cleanAir = computeOnsetRisk(profile({ cityAqi: 50 }));
    const toxicAir = computeOnsetRisk(profile({ cityAqi: 320 }));
    expect(toxicAir.risks.cardiac).toBeGreaterThan(cleanAir.risks.cardiac);
    expect(toxicAir.risks.hypertension).toBeGreaterThan(cleanAir.risks.hypertension);
  });

  it("family history raises type-2 risk strongly (Indian first-degree RR)", () => {
    const noFam = computeOnsetRisk(profile({ familyHistory: false }));
    const fam = computeOnsetRisk(profile({ familyHistory: true }));
    expect(fam.risks.type2 / noFam.risks.type2).toBeGreaterThan(1.8);
  });

  it("older age monotonically increases risk (early-onset Indian curve)", () => {
    const young = computeOnsetRisk(profile({ age: 26 })).risks.type2;
    const mid = computeOnsetRisk(profile({ age: 40 })).risks.type2;
    const older = computeOnsetRisk(profile({ age: 58 })).risks.type2;
    expect(mid).toBeGreaterThan(young);
    expect(older).toBeGreaterThan(mid);
  });
});

describe("india calibration — Indian anchors", () => {
  it("ships a metro AQI table with realistic ordering", () => {
    const delhi = INDIAN_CITIES.find((c) => c.name === "Delhi NCR")!;
    const bengaluru = INDIAN_CITIES.find((c) => c.name === "Bengaluru")!;
    expect(delhi.aqi).toBeGreaterThan(bengaluru.aqi * 1.5);
    expect(INDIAN_CITIES.length).toBeGreaterThanOrEqual(8);
  });

  it("a sedentary 45-year-old with family history lands in the red watch range", () => {
    const r = computeOnsetRisk(profile({ age: 45, exerciseMinPerDay: 0, sleepHours: 5.5, diet: { outsideFoodOften: true, sugaryDrinks: true, lateNightMeals: true }, familyHistory: true }));
    expect(r.earlyWarning).toBeGreaterThan(60);
    expect(r.risks.type2).toBeGreaterThan(0.28);
  });

  it("a fit 28-year-old with clean habits stays low-risk", () => {
    const r = computeOnsetRisk(profile({ age: 28, exerciseMinPerDay: 60, sleepHours: 8, diet: { outsideFoodOften: false, sugaryDrinks: false, lateNightMeals: false }, familyHistory: false, smoker: false, cityAqi: 60 }));
    expect(r.earlyWarning).toBeLessThan(30);
    expect(bandOfOnset(r.risks.type2)).toBe("low");
  });
});

describe("india calibration — banding & nudges", () => {
  it("bands follow thresholds", () => {
    expect(bandOfOnset(0.05)).toBe("low");
    expect(bandOfOnset(0.2)).toBe("moderate");
    expect(bandOfOnset(0.4)).toBe("high");
  });

  it("the nudge always improves the early-warning score and names one change", () => {
    for (const p of [
      DEFAULT_PROFILE,
      profile({ exerciseMinPerDay: 0 }),
      profile({ sleepHours: 5, diet: { outsideFoodOften: false, sugaryDrinks: false, lateNightMeals: false }, familyHistory: false }),
      profile({ smoker: true, diet: { outsideFoodOften: false, sugaryDrinks: false, lateNightMeals: false }, familyHistory: false, exerciseMinPerDay: 45, sleepHours: 7.5 }),
    ]) {
      const r = computeOnsetRisk(p);
      const nudge = nudgeFor(p, r);
      if (nudge) {
        expect(nudge.to).toBeLessThan(nudge.from);
        expect(nudge.label.length).toBeGreaterThan(3);
      } else {
        // only allowed when nothing modifiable dominates
        expect(r.drivers.some((d) => d.modifiable)).toBe(false);
      }
    }
  });

  it("drivers are ordered strongest-first with shares summing <= 1", () => {
    const r = computeOnsetRisk(DEFAULT_PROFILE);
    for (let i = 1; i < r.drivers.length; i++) {
      expect(r.drivers[i - 1].share).toBeGreaterThanOrEqual(r.drivers[i].share);
    }
    const sum = r.drivers.reduce((a, d) => a + d.share, 0);
    expect(sum).toBeLessThanOrEqual(1.001);
  });
});
