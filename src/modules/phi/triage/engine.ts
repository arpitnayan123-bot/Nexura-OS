/* ============================================================
 * NEXURA PHI — TRIAGE RULES ENGINE (deterministic, no LLM)
 * Runs pipeline position 4 — BEFORE anything generative or
 * predictive. Uncertainty bias: escalate, never reassure.
 * ============================================================ */

import {
  type SafetyAlert,
  type TriageInput,
  type TriageOutcome,
  type TriageRulesEngine,
  type UrgencyLevel,
  maxUrgency,
} from "../contracts";
import {
  RED_FLAG_RULES,
  RULESET_ID,
  RULESET_VERSION,
  assertRulesetReviewable,
  ruleToAlert,
} from "./ruleset";

assertRulesetReviewable(RED_FLAG_RULES);

function routeMinors(input: TriageInput): string | null {
  if (input.ageYears != null && input.ageYears < 18) {
    return "MINOR_ROUTED_OUT: This version of Nexura Predictive is designed for adults 18 and above. For anyone under 18, please consult a pediatrician or call your clinic — do not use this tool for children.";
  }
  return null;
}

function routePregnancy(input: TriageInput): string | null {
  if (input.pregnancyPossibility) {
    return "PREGNANCY_ROUTING: Because pregnancy may be possible, several guidance thresholds are deliberately more cautious. Any bleeding, severe pain, severe headache, or reduced fetal movement needs immediate in-person review — Nexura will always escalate these.";
  }
  return null;
}

function routeSevereChronic(input: TriageInput): string | null {
  const severe = input.conditions.some((c) =>
    /active cancer|chemotherapy|immunocomprom|transplant|dialysis|severe |advanced heart|copd|kidney failure|renal failure/i.test(c)
  );
  if (severe) {
    return "SPECIAL_POPULATION_ROUTING: You told us about a serious ongoing condition. With such conditions, seemingly small changes can matter more and thresholds here are more cautious. Keep your specialist in the loop for anything new or worsening.";
  }
  return null;
}

export const triageEngine: TriageRulesEngine = {
  id: RULESET_ID,
  version: RULESET_VERSION,

  evaluate(input: TriageInput): TriageOutcome {
    const alerts: SafetyAlert[] = [];
    const matchedRuleIds: string[] = [];
    let urgency: UrgencyLevel = "MONITOR_AND_PREVENT";

    // 1. Minors are routed out entirely — the adult flow never analyzes them.
    const minorRouting = routeMinors(input);

    // 2. Red-flag rules — evaluated for everyone except when minors are routed out.
    if (!minorRouting) {
      for (const rule of RED_FLAG_RULES) {
        try {
          if (rule.trigger(input) && !(rule.exclude && rule.exclude(input))) {
            alerts.push(ruleToAlert(rule));
            matchedRuleIds.push(rule.id);
            urgency = maxUrgency(urgency, rule.urgency);
          }
        } catch {
          // A crashing rule must never silently pass triage — treat as escalation.
          urgency = maxUrgency(urgency, "SAME_DAY_MEDICAL_REVIEW");
          matchedRuleIds.push(`${rule.id}:EVAL_ERROR`);
        }
      }
    }

    // 3. Uncertainty bias: a severe symptom reported with SPARSE context
    //    (no vitals, no conditions, no associated detail) cannot be
    //    interpreted confidently — add an explicit uncertainty alert on top
    //    of whatever rules fired. Escalate, never reassure.
    let escalatedOnUncertainty = false;
    const anySevere = input.symptoms.some((s) => s.severity1to10 >= 8);
    const sparseContext = input.symptoms.length > 0 && !input.vitals && input.conditions.length === 0;
    if (anySevere && sparseContext) {
      escalatedOnUncertainty = true;
      matchedRuleIds.push("RF-UNCERTAINTY-001");
      alerts.push({
        ruleId: "RF-UNCERTAINTY-001",
        title: "Severe symptom reported — needs professional eyes today",
        userAction:
          "Please see a doctor today. When something this strong is reported, the responsible step is an in-person check, not a remote interpretation.",
        whyRemoteAssessmentUnsafe:
          "Nexura cannot examine you. Severe symptoms sometimes need tests that only a clinic can do.",
        careNavigation:
          "Call 108 immediately if breathing becomes hard, consciousness changes, bleeding starts, or pain becomes unbearable.",
      });
    }

    // 4. Special-population routing notices (non-blocking, always surfaced).
    const specialRouting =
      minorRouting ?? routePregnancy(input) ?? routeSevereChronic(input);

    return { urgency, alerts, matchedRuleIds, escalatedOnUncertainty, specialRouting };
  },
};
