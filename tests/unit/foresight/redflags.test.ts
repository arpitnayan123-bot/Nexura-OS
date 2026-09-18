/* ============================================================
 * FORESIGHT ENGINE TESTS — red-flag triage (safety-critical)
 * ============================================================ */

import { describe, expect, it } from "vitest";
import { runTriage, SYMPTOM_IDS } from "@/modules/foresight/redflags";
import { EMPTY_INPUT } from "./fixtures";

const withSymptom = (id: string, severity = 8, onsetDays = 1, worsening = false) => ({
  ...EMPTY_INPUT,
  symptoms: [{ id, severity, onsetDays, worsening }],
});

describe("EMERGENCY symptom rules", () => {
  it("escalates chest pain and blocks analysis", () => {
    const t = runTriage(withSymptom(SYMPTOM_IDS.chestPain, 8));
    expect(t.level).toBe("EMERGENCY");
    expect(t.analysisBlocked).toBe(true);
    expect(t.hits[0].action).toContain("108");
  });
  it("escalates chest pain at low severity when paired with breathlessness", () => {
    const t = runTriage({
      ...EMPTY_INPUT,
      symptoms: [
        { id: SYMPTOM_IDS.chestPain, severity: 3, onsetDays: 1, worsening: false },
        { id: SYMPTOM_IDS.breathlessness, severity: 5, onsetDays: 1, worsening: false },
      ],
    });
    expect(t.level).toBe("EMERGENCY");
  });
  it("escalates stroke signs (one-side weakness, slur, sudden vision)", () => {
    for (const id of [
      SYMPTOM_IDS.oneSideWeakness,
      SYMPTOM_IDS.speechSlur,
      SYMPTOM_IDS.visionSudden,
    ]) {
      const t = runTriage(withSymptom(id, 7));
      expect(t.level).toBe("EMERGENCY");
      expect(t.hits[0].title.toLowerCase()).toContain("stroke");
    }
  });
  it("escalates seizures and severe bleeding", () => {
    expect(runTriage(withSymptom(SYMPTOM_IDS.seizure, 5)).level).toBe("EMERGENCY");
    expect(runTriage(withSymptom(SYMPTOM_IDS.severeBleeding, 5)).level).toBe("EMERGENCY");
  });
  it("mild long-standing vision change is NOT an emergency (proportionality)", () => {
    const t = runTriage(withSymptom(SYMPTOM_IDS.visionSudden, 3, 400));
    expect(t.level).not.toBe("EMERGENCY");
  });
});

describe("EMERGENCY vitals rules", () => {
  it("escalates hypertensive crisis 180/110+", () => {
    const t = runTriage({ ...EMPTY_INPUT, vitals: { systolic: 185, diastolic: 112 } });
    expect(t.level).toBe("EMERGENCY");
    expect(t.hits.some((h) => h.id === "rf.bp.crisis")).toBe(true);
  });
  it("escalates glucose extremes (>=350, <=60)", () => {
    const high = runTriage({
      ...EMPTY_INPUT,
      vitals: { glucoseMgDl: 380, glucoseContext: "random" },
    });
    const low = runTriage({ ...EMPTY_INPUT, vitals: { glucoseMgDl: 55 } });
    expect(high.level).toBe("EMERGENCY");
    expect(low.level).toBe("EMERGENCY");
  });
  it("escalates SpO2 below 92", () => {
    const t = runTriage({ ...EMPTY_INPUT, vitals: { spo2: 88 } });
    expect(t.level).toBe("EMERGENCY");
  });
});

describe("Mental-health safety net", () => {
  it("catches English self-harm language in free text", () => {
    const t = runTriage({ ...EMPTY_INPUT, freeText: "sometimes I think about ending my life" });
    expect(t.level).toBe("EMERGENCY");
    expect(t.hits[0].action).toContain("14416");
  });
  it("catches romanised Hindi self-harm language", () => {
    for (const phrase of [
      "marna chahta hai",
      "jaan de dena hai",
      "khudkhushi ke bare me sochta hu",
    ]) {
      const t = runTriage({ ...EMPTY_INPUT, freeText: phrase });
      expect(t.level).toBe("EMERGENCY");
    }
  });
  it("catches Devanagari self-harm language", () => {
    const t = runTriage({ ...EMPTY_INPUT, freeText: "मुझे जीना नहीं है" });
    expect(t.level).toBe("EMERGENCY");
  });
  it("routes severe two-week low mood to same-day support (not emergency)", () => {
    const t = runTriage({ ...EMPTY_INPUT, history: { ...EMPTY_INPUT.history, moodLowDays: 13 } });
    expect(t.level).toBe("SAME_DAY");
    expect(t.hits[0].action).toContain("14416");
  });
  it("ordinary sadness does not trigger the safety net", () => {
    const t = runTriage({ ...EMPTY_INPUT, history: { ...EMPTY_INPUT.history, moodLowDays: 2 } });
    expect(t.level).toBe("STANDARD");
  });
});

describe("SAME_DAY rules", () => {
  it("sends 3+ day fevers to a doctor today with an Indian fever panel", () => {
    const t = runTriage(withSymptom(SYMPTOM_IDS.feverPersistent, 6, 4));
    expect(t.level).toBe("SAME_DAY");
    expect(t.hits[0].action).toContain("dengue");
  });
  it("passes ordinary standard inputs straight through", () => {
    const t = runTriage(EMPTY_INPUT);
    expect(t.level).toBe("STANDARD");
    expect(t.analysisBlocked).toBe(false);
  });
});

describe("Pregnancy overlays", () => {
  it("escalates bleeding with possible pregnancy", () => {
    const t = runTriage({
      ...EMPTY_INPUT,
      profile: { ...EMPTY_INPUT.profile, pregnancyPossibility: true },
      symptoms: [{ id: SYMPTOM_IDS.severeBleeding, severity: 4, onsetDays: 1, worsening: false }],
    });
    expect(t.level).toBe("EMERGENCY");
  });
});
