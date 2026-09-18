/* ============================================================
 * WORKSPACE VIEW-MODEL TESTS
 * The workspace layer must be deterministic, honest about its
 * anchors, and never contradict the engine's own endpoints.
 * ============================================================ */

import { describe, expect, it } from "vitest";
import { runForesight } from "@/modules/foresight/engine";
import { EMPTY_INPUT } from "./fixtures";
import {
  buildActions,
  buildDrivers,
  buildExecStrip,
  buildForecast,
  buildInsights,
  buildMetricCards,
  buildRisks,
  buildTimeline,
  envelopeHalfWidth,
  trajectoryAt,
  type ScoreSeriesEntry,
} from "@/modules/foresight/workspace";
import type { ForesightInput } from "@/modules/foresight/types";

function loaded(): ForesightInput {
  return {
    ...EMPTY_INPUT,
    profile: { ...EMPTY_INPUT.profile, weightKg: 84, waistCm: 97 },
    vitals: { ...EMPTY_INPUT.vitals, systolic: 138, diastolic: 88 },
    labs: { hba1cPct: 6.3 },
    sleep: {
      ...EMPTY_INPUT.sleep,
      hoursPerNight: 5.5,
      quality: "poor",
      snoring: "loud_regular",
      daytimeSleepiness: "severe",
    },
    history: { ...EMPTY_INPUT.history, familyHistory: ["diabetes", "heart_disease"] },
  };
}

const RISKY = runForesight(loaded());
const CLEAN = runForesight(EMPTY_INPUT);

const NOW = new Date("2026-09-11T04:30:00.000Z").getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

describe("trajectoryAt easing", () => {
  it("anchors at start when t=0 and hits the exact endpoint at t=5", () => {
    expect(trajectoryAt(60, 49, 0)).toBe(60);
    expect(trajectoryAt(60, 49, 5)).toBeCloseTo(49, 5);
  });

  it("is monotonic between start and end", () => {
    let prev = 60;
    for (let t = 0; t <= 5; t += 0.25) {
      const v = trajectoryAt(60, 49, t);
      expect(v).toBeLessThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("envelopeHalfWidth", () => {
  it("is ~0 at the measured anchor and grows with horizon", () => {
    expect(envelopeHalfWidth(0, 80)).toBeLessThan(0.5);
    expect(envelopeHalfWidth(5, 80)).toBeGreaterThan(envelopeHalfWidth(1, 80));
  });

  it("widens when coverage is poor", () => {
    expect(envelopeHalfWidth(3, 20)).toBeGreaterThan(envelopeHalfWidth(3, 95));
  });
});

describe("buildForecast", () => {
  it("derives curves from the engine's own endpoints", () => {
    const m = buildForecast(RISKY, [], { horizon: 5 });
    expect(m.unchanged[m.unchanged.length - 1].v).toBe(RISKY.trajectory.unchangedScore);
    expect(m.withActions[m.withActions.length - 1].v).toBe(RISKY.trajectory.withActionsScore);
    expect(m.unchanged[0].v).toBe(RISKY.foresightScore);
  });

  it("always includes the current run as the t=0 observed anchor", () => {
    const series: ScoreSeriesEntry[] = [{ at: daysAgo(40), score: 55 }];
    const m = buildForecast(RISKY, series, {});
    expect(m.observed.some((o) => o.t === 0 && o.v === RISKY.foresightScore)).toBe(true);
    expect(m.observed.some((o) => o.v === 55)).toBe(true);
  });

  it("does not duplicate the anchor when history already contains the run", () => {
    const series: ScoreSeriesEntry[] = [
      { at: daysAgo(40), score: 55 },
      { at: daysAgo(0), score: RISKY.foresightScore },
    ];
    const m = buildForecast(RISKY, series, {});
    expect(m.observed.filter((o) => Math.abs(o.t) < 0.003)).toHaveLength(1);
  });

  it("respects the horizon slice", () => {
    const m1 = buildForecast(RISKY, [], { horizon: 1 });
    const m5 = buildForecast(RISKY, [], { horizon: 5 });
    expect(m1.unchanged[m1.unchanged.length - 1].t).toBe(1);
    expect(m5.unchanged[m5.unchanged.length - 1].t).toBe(5);
    // 1-year slice of the same curve equals the 5-year curve at t=1
    expect(m1.unchanged[m1.unchanged.length - 1].v).toBeCloseTo(
      m5.unchanged.find((p) => p.t === 1)!.v,
      5,
    );
  });

  it("deltas always quote the sliced horizon, never the 5-year endpoint", () => {
    const m1 = buildForecast(RISKY, [], { horizon: 1 });
    const m5 = buildForecast(RISKY, [], { horizon: 5 });
    expect(m1.deltaActions).toBe(
      m1.withActions[m1.withActions.length - 1].v - RISKY.foresightScore,
    );
    expect(Math.abs(m1.deltaActions)).toBeLessThan(Math.abs(m5.deltaActions));
    expect(m5.deltaActions).toBe(RISKY.trajectory.withActionsScore - RISKY.foresightScore);
  });

  it("is deterministic for identical inputs", () => {
    const a = buildForecast(RISKY, [], {});
    const b = buildForecast(RISKY, [], {});
    expect(a).toEqual(b);
  });
});

describe("buildDrivers", () => {
  it("merges the same signal across domains with receipts", () => {
    const rows = buildDrivers(RISKY, 12);
    const labels = rows.map((r) => r.label);
    const dup = labels.find((l, i) => labels.indexOf(l) !== i);
    expect(dup).toBeUndefined();
    const withMulti = rows.find((r) => r.domains.length > 1);
    if (withMulti) expect(withMulti.domains.length).toBeLessThanOrEqual(3);
  });

  it("sorts by weight descending and shares normalize to the max", () => {
    const rows = buildDrivers(RISKY, 12);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].weight).toBeGreaterThanOrEqual(rows[i].weight);
    }
    expect(rows[0].share).toBe(100);
  });

  it("clean profiles still produce protective drivers", () => {
    const rows = buildDrivers(CLEAN, 12);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some((r) => r.direction === "protective")).toBe(true);
  });
});

describe("buildRisks", () => {
  it("returns elevated+ domains sorted by burden with evidence and mitigation", () => {
    const risks = buildRisks(RISKY);
    expect(risks.length).toBeGreaterThan(0);
    for (let i = 1; i < risks.length; i++) {
      expect(risks[i - 1].burden).toBeGreaterThanOrEqual(risks[i].burden);
    }
    expect(risks[0].evidence.length).toBeGreaterThan(0);
    expect(risks[0].burden).toBeGreaterThanOrEqual(18);
  });

  it("returns empty for a clean profile", () => {
    expect(buildRisks(CLEAN)).toHaveLength(0);
  });
});

describe("buildActions", () => {
  it("prioritizes high-burden domains first and carries effort chips", () => {
    const actions = buildActions(RISKY);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].priority).toBeLessThanOrEqual(actions[actions.length - 1].priority);
    for (const a of actions) expect(["easy", "moderate", "with-doctor"]).toContain(a.effort);
  });
});

describe("buildTimeline", () => {
  it("is chronological, capped at 6, and anchored at now first", () => {
    const tl = buildTimeline(RISKY, NOW);
    expect(tl.length).toBeGreaterThan(1);
    expect(tl.length).toBeLessThanOrEqual(6);
    expect(tl[0].t).toBeLessThanOrEqual(tl[tl.length - 1].t);
    expect(tl[0].horizon).toBe("now");
    for (const m of tl) expect(m.when).toMatch(/20\d\d/);
  });

  it("marks band crossings as illustrative and screenings as planned", () => {
    const tl = buildTimeline(RISKY, NOW);
    const kinds = new Set(tl.map((m) => m.kind));
    expect(kinds.has("rescan")).toBe(true);
    for (const m of tl) {
      if (m.kind === "threshold") expect(m.certainty).toBe("illustrative");
      if (m.kind === "screening") expect(m.certainty).toBe("planned");
    }
  });

  it("is deterministic", () => {
    expect(buildTimeline(RISKY, NOW)).toEqual(buildTimeline(RISKY, NOW));
  });
});

describe("buildInsights", () => {
  it("grounds every insight in a metric — non-empty, referenced, honest", () => {
    const drivers = buildDrivers(RISKY);
    const ins = buildInsights(RISKY, { score: 66, at: daysAgo(90) }, drivers);
    expect(ins.length).toBeGreaterThanOrEqual(4);
    for (const i of ins) {
      expect(i.title.length).toBeGreaterThan(6);
      expect(i.body.length).toBeGreaterThan(30);
    }
    expect(ins.find((i) => i.kind === "change")?.body).toContain("66");
    expect(ins.find((i) => i.kind === "trend")?.body).toContain(
      String(RISKY.trajectory.unchangedScore),
    );
  });

  it("with no previous run, still produces trend + confidence reads", () => {
    const ins = buildInsights(RISKY, null, buildDrivers(RISKY));
    expect(ins.some((i) => i.kind === "trend")).toBe(true);
    expect(ins.some((i) => i.kind === "confidence")).toBe(true);
  });
});

describe("buildExecStrip + buildMetricCards", () => {
  it("exec agrees with the forecast model (no contradictory values)", () => {
    const fc = buildForecast(RISKY, [], { horizon: 3 });
    const tl = buildTimeline(RISKY, NOW);
    const exec = buildExecStrip(RISKY, fc, tl);
    expect(exec.scoreNow).toBe(RISKY.foresightScore);
    expect(exec.planDelta).toBe(fc.withActions[fc.withActions.length - 1].v - RISKY.foresightScore);
    expect(exec.horizon).toBe(3);
    expect(exec.nextEvent?.key).toBe(tl[0].key);
  });

  it("metric cards carry six coherent reads", () => {
    const fc = buildForecast(RISKY, [], {});
    const tl = buildTimeline(RISKY, NOW);
    const cards = buildMetricCards(RISKY, fc, tl, { score: 66, at: daysAgo(90) });
    expect(cards).toHaveLength(6);
    const scoreCard = cards.find((c) => c.key === "score-now")!;
    expect(scoreCard.value).toBe(String(RISKY.foresightScore));
    const plan = cards.find((c) => c.key === "proj-plan")!;
    expect(plan.value).toBe(String(fc.withActions[fc.withActions.length - 1].v));
    expect(cards.every((c) => c.context.length > 8)).toBe(true);
  });
});
