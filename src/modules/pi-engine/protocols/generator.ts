/* ============================================================
 * PIE Phase 3.1b — ProtocolGenerator
 * Risk crossing → guideline-indexed Pre-Emptive Protocol.
 * Hard safety gate: confidence < 0.8 NEVER auto-generates an
 * actionable protocol — it flags "Uncertain — Manual Review".
 * Pure decision logic; persistence in db adapter.
 * ============================================================ */

import { CONFIDENCE_FLOOR } from "../types";
import type { PreEmptiveProtocolSpec, RiskAssessment } from "../types";
import { PROTOCOL_KB } from "./knowledge-base";

export interface GenerationDecision {
  action: "generate" | "uncertain_manual_review" | "below_threshold" | "existing_protocol_active";
  protocol: PreEmptiveProtocolSpec | null;
  reason: string;
}

/** Map a risk assessment to its guideline protocol, if any.
 *  The composite domain sniffs drivers so the engine's fused
 *  assessment still lands on the right guideline pathway. */
export function protocolFor(
  domain: RiskAssessment["domain"],
  drivers: string[],
): PreEmptiveProtocolSpec | null {
  const joined = drivers.join(" ").toLowerCase();
  if (domain === "composite") {
    if (/heart rate|wbc|infection|temperature|oxygen|respiratory/.test(joined))
      return PROTOCOL_KB.sepsis_bundle;
    if (/cardiac|nt-probnp|fluid/.test(joined)) return PROTOCOL_KB.hf_exacerbation;
    if (/glycemic|glucose|hba1c/.test(joined)) return PROTOCOL_KB.dka_risk;
    if (/hypertension|sbp|blood pressure/.test(joined)) return PROTOCOL_KB.htn_urgency;
    if (/renal|creatinine/.test(joined)) return PROTOCOL_KB.aki_watch;
    return null;
  }
  if (domain === "sepsis") return PROTOCOL_KB.sepsis_bundle;
  if (domain === "readmission") return null; // readmission is a care-coordination concern, not an acute protocol
  if (domain === "chronic_deterioration") {
    if (joined.includes("glycemic") || joined.includes("glucose") || joined.includes("hba1c"))
      return PROTOCOL_KB.dka_risk;
    if (joined.includes("hypertension") || joined.includes("sbp")) return PROTOCOL_KB.htn_urgency;
    if (joined.includes("renal") || joined.includes("creatinine")) return PROTOCOL_KB.aki_watch;
    if (joined.includes("cardiac")) return PROTOCOL_KB.hf_exacerbation;
    return PROTOCOL_KB.dka_risk;
  }
  if (domain === "cardiac") return PROTOCOL_KB.hf_exacerbation;
  return null;
}

/**
 * Decide whether a risk assessment triggers a protocol.
 * @param openProtocolExists true when the patient already has a
 *        pending/approved protocol — prevents alert storms.
 */
export function decideProtocol(
  assessment: RiskAssessment,
  openProtocolExists: boolean,
): GenerationDecision {
  if (assessment.band !== "red") {
    return {
      action: "below_threshold",
      protocol: null,
      reason: `Score ${assessment.score} is below the red threshold.`,
    };
  }
  if (openProtocolExists) {
    return {
      action: "existing_protocol_active",
      protocol: null,
      reason: "An open protocol already covers this patient.",
    };
  }
  if (assessment.confidence < CONFIDENCE_FLOOR) {
    return {
      action: "uncertain_manual_review",
      protocol: null,
      reason: `Confidence ${(assessment.confidence * 100).toFixed(0)}% < ${CONFIDENCE_FLOOR * 100}% — flagged "Uncertain — Manual Review Required".`,
    };
  }
  const spec = protocolFor(
    assessment.domain,
    assessment.drivers.map((d) => d.feature + " " + d.detail),
  );
  if (!spec) {
    return {
      action: "uncertain_manual_review",
      protocol: null,
      reason: "Red zone reached but no guideline protocol maps this pattern — manual review.",
    };
  }
  return {
    action: "generate",
    protocol: spec,
    reason: `Confidence ${(assessment.confidence * 100).toFixed(0)}% ≥ threshold; ${assessment.domain} red zone.`,
  };
}
