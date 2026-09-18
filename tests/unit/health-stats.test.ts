import { describe, it, expect } from "vitest";
import {
  mean,
  deriveStressFromHrv,
  deriveStressFromRestingHr,
  deriveMood,
  deriveCalories,
  buildHourlySeries,
  demoSeries,
  DEMO_PAYLOAD,
} from "@/lib/site/health-stats";

/* Health-stats derivations for the homepage preview:
 *  - every formula is fixed and clamped (no NaN, no out-of-range);
 *  - hourly series only buckets real samples, never invents points;
 *  - the demo payload is deterministic (SSR-safe, stable across polls). */

describe("health-stats derivations", () => {
  it("maps HRV to stress linearly and clamps both ends", () => {
    expect(deriveStressFromHrv(15)).toBe(84);
    expect(deriveStressFromHrv(70)).toBe(0);
    expect(deriveStressFromHrv(42)).toBeGreaterThanOrEqual(0);
    expect(deriveStressFromHrv(42)).toBeLessThanOrEqual(100);
    expect(deriveStressFromHrv(100)).toBe(0); // clamped below 0
    expect(deriveStressFromHrv(0)).toBe(100); // clamped above 100
  });

  it("derives stress from resting HR when HRV is absent", () => {
    expect(deriveStressFromRestingHr(55)).toBe(0);
    expect(deriveStressFromRestingHr(95)).toBe(88);
    expect(deriveStressFromRestingHr(200)).toBe(100);
    expect(deriveStressFromRestingHr(40)).toBe(0);
  });

  it("mirrors mood off stress with a readable floor", () => {
    expect(deriveMood(0)).toBe(100);
    expect(deriveMood(84)).toBe(41);
    expect(deriveMood(200)).toBe(30); // floor
  });

  it("derives calories from steps with a resting-metabolic floor", () => {
    expect(deriveCalories(8420)).toBe(Math.round(8420 * 0.045 + 1450));
    expect(deriveCalories(0)).toBe(1450);
  });

  it("mean returns null for empty input", () => {
    expect(mean([])).toBeNull();
    expect(mean([1, 2, 3])).toBe(2);
  });
});

describe("hourly series", () => {
  const now = new Date("2026-09-19T15:30:00Z");

  it("buckets samples by UTC hour and averages them", () => {
    const samples = [
      { capturedAt: new Date("2026-09-19T14:05:00Z"), value: 70 },
      { capturedAt: new Date("2026-09-19T14:45:00Z"), value: 74 },
      { capturedAt: new Date("2026-09-19T13:10:00Z"), value: 66 },
    ];
    const series = buildHourlySeries(samples, 14, now);
    expect(series).toEqual([
      { t: "13:00", v: 66 },
      { t: "14:00", v: 72 },
    ]);
  });

  it("drops samples older than the window", () => {
    const samples = [
      { capturedAt: new Date("2026-09-19T14:00:00Z"), value: 70 },
      { capturedAt: new Date("2026-09-18T02:00:00Z"), value: 120 }, // >14h old
    ];
    expect(buildHourlySeries(samples, 14, now)).toEqual([{ t: "14:00", v: 70 }]);
  });

  it("returns an empty series for no samples (chart shows what exists)", () => {
    expect(buildHourlySeries([], 14, now)).toEqual([]);
  });

  it("sorts buckets chronologically regardless of input order", () => {
    const samples = [
      { capturedAt: new Date("2026-09-19T15:00:00Z"), value: 80 },
      { capturedAt: new Date("2026-09-19T13:00:00Z"), value: 60 },
      { capturedAt: new Date("2026-09-19T14:00:00Z"), value: 70 },
    ];
    expect(buildHourlySeries(samples, 14, now).map((p) => p.t)).toEqual([
      "13:00",
      "14:00",
      "15:00",
    ]);
  });
});

describe("demo payload", () => {
  it("is deterministic across calls (no Date.now jitter)", () => {
    expect(demoSeries()).toEqual(demoSeries());
    expect(DEMO_PAYLOAD.series).toEqual(demoSeries());
  });

  it("labels hydration null — no honest data source", () => {
    expect(DEMO_PAYLOAD.water).toBeNull();
  });
});
