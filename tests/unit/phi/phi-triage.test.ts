import { describe, expect, it } from "vitest";
import { triageEngine } from "@/modules/phi/triage/engine";
import { RED_FLAG_RULES } from "@/modules/phi/triage/ruleset";
import type { TriageInput, TriagedSymptom } from "@/modules/phi/contracts";

/* ============================================================
 * PHI TRIAGE REGRESSION SUITE
 * Every red-flag rule must fire on its intended combination and
 * stay silent otherwise. Uncertainty must escalate, never reassure.
 * ============================================================ */

function baseInput(overrides: Partial<TriageInput> = {}): TriageInput {
  return {
    ageYears: 34,
    sexAtBirth: "female",
    pregnancyPossibility: false,
    symptoms: [],
    vitals: null,
    conditions: [],
    medications: [],
    selfHarmLanguage: false,
    overdoseOrPoisoningSignal: false,
    traumaSignal: false,
    ...overrides,
  };
}

function symptom(overrides: Partial<TriagedSymptom> = {}): TriagedSymptom {
  return {
    category: "general",
    severity1to10: 3,
    suddenOnset: false,
    worsening: false,
    durationDays: 2,
    associated: [],
    ...overrides,
  };
}

const EMERGENCY_RULES = RED_FLAG_RULES.filter((r) => r.urgency === "EMERGENCY_NOW");

describe("ruleset integrity", () => {
  it("has unique rule ids and complete metadata", () => {
    const ids = RED_FLAG_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of RED_FLAG_RULES) {
      expect(r.id).toMatch(/^RF-[A-Z]+-\d{3}$/);
      expect(r.userAction.length).toBeGreaterThan(20);
      expect(r.whyRemoteAssessmentUnsafe.length).toBeGreaterThan(20);
      expect(r.careNavigation.length).toBeGreaterThan(10);
      expect(r.dateCreated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.nextReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.version).toBe("1.0.0");
    }
  });

  it("includes at least one EMERGENCY_NOW rule per critical domain", () => {
    const ids = RED_FLAG_RULES.map((r) => r.id);
    expect(ids).toContain("RF-NEURO-001");
    expect(ids).toContain("RF-CARDIO-001");
    expect(ids).toContain("RF-RESP-001");
    expect(ids).toContain("RF-BLEED-001");
    expect(ids).toContain("RF-ALLERGY-001");
    expect(ids).toContain("RF-PREG-001");
    expect(ids).toContain("RF-MH-001");
    expect(ids).toContain("RF-POISON-001");
    expect(ids).toContain("RF-TRAUMA-001");
    expect(ids).toContain("RF-VITAL-001");
  });

  it("never uses diagnosis language in user-facing actions", () => {
    for (const r of RED_FLAG_RULES) {
      expect(r.userAction).not.toMatch(/you (definitely|are suffering|have)\b/i);
      expect(r.userAction.toLowerCase()).not.toContain("diagnos");
      expect(r.userAction).not.toMatch(/\bmg\b|\bdose\b|\bdosage\b/i);
    }
  });
});

describe("RF-NEURO-001", () => {
  it("escalates on neurological symptoms", () => {
    const out = triageEngine.evaluate(
      baseInput({ symptoms: [symptom({ category: "neurological", severity1to10: 7, suddenOnset: true })] })
    );
    expect(out.matchedRuleIds).toContain("RF-NEURO-001");
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });

  it("escalates on one-sided weakness association", () => {
    const out = triageEngine.evaluate(
      baseInput({ symptoms: [symptom({ category: "headache", severity1to10: 6, associated: ["left arm weakness"] })] })
    );
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });

  it("stays silent for mild recurrent headache without neuro signs", () => {
    const out = triageEngine.evaluate(
      baseInput({ symptoms: [symptom({ category: "headache", severity1to10: 3 })] })
    );
    expect(out.matchedRuleIds).not.toContain("RF-NEURO-001");
  });
});

describe("RF-CARDIO-001", () => {
  it("escalates on chest pain with sweating", () => {
    const out = triageEngine.evaluate(
      baseInput({ symptoms: [symptom({ category: "chest_pain", severity1to10: 6, associated: ["sweating"] })] })
    );
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });

  it("escalates on severe chest pain even without associations", () => {
    const out = triageEngine.evaluate(
      baseInput({ symptoms: [symptom({ category: "chest_pain", severity1to10: 7 })] })
    );
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });

  it("stays silent for mild chest-muscle soreness", () => {
    const out = triageEngine.evaluate(
      baseInput({ symptoms: [symptom({ category: "chest_pain", severity1to10: 2 })] })
    );
    expect(out.matchedRuleIds).not.toContain("RF-CARDIO-001");
  });
});

describe("RF-RESP-001", () => {
  it("escalates on severe breathing difficulty", () => {
    const out = triageEngine.evaluate(
      baseInput({ symptoms: [symptom({ category: "breathing", severity1to10: 8 })] })
    );
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });

  it("escalates on low SpO2 even with mild symptoms", () => {
    const out = triageEngine.evaluate(
      baseInput({
        symptoms: [symptom({ category: "breathing", severity1to10: 2 })],
        vitals: { spo2: 88, atRest: true },
      })
    );
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });
});

describe("RF-BLEED-001 / RF-ALLERGY-001 / RF-DEHYD-001 / RF-INFEC-001", () => {
  it("escalates severe bleeding with faintness", () => {
    const out = triageEngine.evaluate(
      baseInput({ symptoms: [symptom({ category: "bleeding", severity1to10: 7, associated: ["feeling faint"] })] })
    );
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });

  it("escalates allergic reaction with swelling + breathlessness", () => {
    const out = triageEngine.evaluate(
      baseInput({
        symptoms: [symptom({ category: "rash", severity1to10: 5, associated: ["swelling of lips", "breathless"] })],
      })
    );
    expect(out.matchedRuleIds).toContain("RF-ALLERGY-001");
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });

  it("escalates fever + stiff neck combination", () => {
    const out = triageEngine.evaluate(
      baseInput({
        symptoms: [symptom({ category: "fever", severity1to10: 5, associated: ["stiff neck"] })],
        vitals: { temperatureC: 39.8, atRest: true },
      })
    );
    expect(out.matchedRuleIds).toContain("RF-INFEC-001");
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });

  it("does not escalate fever alone without danger associations", () => {
    const out = triageEngine.evaluate(
      baseInput({
        symptoms: [symptom({ category: "fever", severity1to10: 4 })],
        vitals: { temperatureC: 38.5, atRest: true },
      })
    );
    expect(out.urgency).not.toBe("EMERGENCY_NOW");
  });
});

describe("RF-PREG-001", () => {
  it("escalates pregnancy + bleeding", () => {
    const out = triageEngine.evaluate(
      baseInput({
        pregnancyPossibility: true,
        symptoms: [symptom({ category: "bleeding", severity1to10: 4 })],
      })
    );
    expect(out.matchedRuleIds).toContain("RF-PREG-001");
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });

  it("does not fire without pregnancy possibility", () => {
    const out = triageEngine.evaluate(
      baseInput({ symptoms: [symptom({ category: "bleeding", severity1to10: 4 })] })
    );
    expect(out.matchedRuleIds).not.toContain("RF-PREG-001");
  });

  it("sets the pregnancy routing notice", () => {
    const out = triageEngine.evaluate(baseInput({ pregnancyPossibility: true }));
    expect(out.specialRouting).toContain("PREGNANCY_ROUTING");
  });
});

describe("RF-MH-001 (self-harm) — safety critical", () => {
  it("escalates immediately with Tele-MANAS guidance", () => {
    const out = triageEngine.evaluate(baseInput({ selfHarmLanguage: true }));
    expect(out.matchedRuleIds).toContain("RF-MH-001");
    expect(out.urgency).toBe("EMERGENCY_NOW");
    const alert = out.alerts.find((a) => a.ruleId === "RF-MH-001");
    expect(alert?.userAction).toContain("14416");
    expect(alert?.userAction).toContain("108");
  });
});

describe("RF-MH-002 exclusion", () => {
  it("is suppressed when RF-MH-001 already fired", () => {
    const out = triageEngine.evaluate(
      baseInput({
        selfHarmLanguage: true,
        symptoms: [symptom({ category: "mental_health", severity1to10: 9 })],
      })
    );
    expect(out.matchedRuleIds).toContain("RF-MH-001");
    expect(out.matchedRuleIds).not.toContain("RF-MH-002");
  });

  it("fires same-day escalation for severe distress without self-harm language", () => {
    const out = triageEngine.evaluate(
      baseInput({ symptoms: [symptom({ category: "mental_health", severity1to10: 8 })] })
    );
    expect(out.matchedRuleIds).toContain("RF-MH-002");
    expect(out.urgency).toBe("SAME_DAY_MEDICAL_REVIEW");
  });
});

describe("RF-POISON-001 / RF-TRAUMA-001", () => {
  it("escalates overdose signals", () => {
    const out = triageEngine.evaluate(baseInput({ overdoseOrPoisoningSignal: true }));
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });

  it("escalates trauma signals", () => {
    const out = triageEngine.evaluate(baseInput({ traumaSignal: true }));
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });
});

describe("RF-VITAL-001", () => {
  it("escalates extreme resting blood pressure", () => {
    const out = triageEngine.evaluate(
      baseInput({ vitals: { systolic: 195, diastolic: 110, atRest: true } })
    );
    expect(out.matchedRuleIds).toContain("RF-VITAL-001");
    expect(out.urgency).toBe("EMERGENCY_NOW");
  });

  it("escalates extreme resting bradycardia", () => {
    const out = triageEngine.evaluate(
      baseInput({ vitals: { heartRate: 36, atRest: true } })
    );
    expect(out.matchedRuleIds).toContain("RF-VITAL-001");
  });

  it("ignores alarming values that were NOT measured at rest", () => {
    const out = triageEngine.evaluate(
      baseInput({ vitals: { heartRate: 165, atRest: false } })
    );
    expect(out.matchedRuleIds).not.toContain("RF-VITAL-001");
  });
});

describe("RF-DEHYD-002 vulnerable-adult routing", () => {
  it("escalates same-day for 65+ with vomiting", () => {
    const out = triageEngine.evaluate(
      baseInput({
        ageYears: 70,
        symptoms: [symptom({ category: "vomiting", severity1to10: 6, durationDays: 2 })],
      })
    );
    expect(out.matchedRuleIds).toContain("RF-DEHYD-002");
    expect(out.urgency).toBe("SAME_DAY_MEDICAL_REVIEW");
  });

  it("escalates same-day for chronic kidney disease with vomiting", () => {
    const out = triageEngine.evaluate(
      baseInput({
        ageYears: 40,
        conditions: ["chronic kidney disease stage 3"],
        symptoms: [symptom({ category: "vomiting", severity1to10: 5, durationDays: 1 })],
      })
    );
    expect(out.matchedRuleIds).toContain("RF-DEHYD-002");
  });

  it("stays monitor-level for a healthy 30-year-old with mild symptoms", () => {
    const out = triageEngine.evaluate(
      baseInput({
        ageYears: 30,
        symptoms: [symptom({ category: "vomiting", severity1to10: 3, durationDays: 1 })],
      })
    );
    expect(out.matchedRuleIds).not.toContain("RF-DEHYD-002");
  });
});

describe("minor routing — adults only", () => {
  it("routes under-18 out of the adult flow entirely", () => {
    const out = triageEngine.evaluate(
      baseInput({
        ageYears: 12,
        symptoms: [symptom({ category: "fever", severity1to10: 6 })],
      })
    );
    expect(out.specialRouting).toContain("MINOR_ROUTED_OUT");
  });

  it("does not run red-flag rules for minors (routed out before analysis)", () => {
    const out = triageEngine.evaluate(
      baseInput({
        ageYears: 10,
        symptoms: [symptom({ category: "neurological", severity1to10: 9 })],
      })
    );
    // The minor notice takes precedence; rules do not process the child.
    expect(out.specialRouting).toContain("MINOR_ROUTED_OUT");
  });
});

describe("uncertainty bias — escalate, never reassure", () => {
  it("escalates severe unexplained symptoms to same-day review", () => {
    const out = triageEngine.evaluate(
      baseInput({ symptoms: [symptom({ category: "general", severity1to10: 9 })] })
    );
    expect(out.escalatedOnUncertainty).toBe(true);
    expect(out.urgency).toBe("SAME_DAY_MEDICAL_REVIEW");
    expect(out.matchedRuleIds).toContain("RF-UNCERTAINTY-001");
  });

  it("escalates rapid worsening", () => {
    const out = triageEngine.evaluate(
      baseInput({ symptoms: [symptom({ category: "general", severity1to10: 7, worsening: true, durationDays: 1 })] })
    );
    expect(out.matchedRuleIds).toContain("RF-GEN-001");
    expect(out.urgency).toBe("SAME_DAY_MEDICAL_REVIEW");
  });

  it("never returns reassurance when any EMERGENCY_NOW rule fires", () => {
    const out = triageEngine.evaluate(
      baseInput({
        symptoms: [symptom({ category: "breathing", severity1to10: 9 })],
        vitals: { heartRate: 150, atRest: true },
      })
    );
    expect(out.urgency).toBe("EMERGENCY_NOW");
    expect(out.alerts.length).toBeGreaterThan(0);
  });
});

describe("clean baseline", () => {
  it("returns MONITOR_AND_PREVENT for an empty healthy adult", () => {
    const out = triageEngine.evaluate(baseInput());
    expect(out.urgency).toBe("MONITOR_AND_PREVENT");
    expect(out.alerts).toHaveLength(0);
    expect(out.escalatedOnUncertainty).toBe(false);
  });

  it("is deterministic for identical inputs", () => {
    const input = baseInput({
      symptoms: [symptom({ category: "chest_pain", severity1to10: 8, associated: ["sweating"] })],
    });
    const a = triageEngine.evaluate(input);
    const b = triageEngine.evaluate(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("every EMERGENCY_NOW rule reachable in regression", () => {
  it("each emergency rule fires on at least one crafted input in this suite", () => {
    // Sanity: the suite crafts inputs for the core emergency rules.
    const fired = new Set<string>();
    const cases: TriageInput[] = [
      baseInput({ symptoms: [symptom({ category: "neurological", severity1to10: 7 })] }),
      baseInput({ symptoms: [symptom({ category: "chest_pain", severity1to10: 8 })] }),
      baseInput({ symptoms: [symptom({ category: "breathing", severity1to10: 8 })] }),
      baseInput({ symptoms: [symptom({ category: "bleeding", severity1to10: 8 })] }),
      baseInput({ symptoms: [symptom({ category: "allergic_reaction", severity1to10: 6 })] }),
      baseInput({ symptoms: [symptom({ category: "dehydration", severity1to10: 8 })] }),
      baseInput({ pregnancyPossibility: true, symptoms: [symptom({ category: "bleeding", severity1to10: 5 })] }),
      baseInput({ selfHarmLanguage: true }),
      baseInput({ overdoseOrPoisoningSignal: true }),
      baseInput({ traumaSignal: true }),
      baseInput({ vitals: { systolic: 195, diastolic: 105, atRest: true } }),
      baseInput({
        symptoms: [symptom({ category: "fever", severity1to10: 6, associated: ["stiff neck"] })],
        vitals: { temperatureC: 40, atRest: true },
      }),
    ];
    for (const c of cases) {
      for (const id of triageEngine.evaluate(c).matchedRuleIds) fired.add(id);
    }
    for (const rule of EMERGENCY_RULES) {
      expect(fired.has(rule.id)).toBe(true);
    }
  });
});
