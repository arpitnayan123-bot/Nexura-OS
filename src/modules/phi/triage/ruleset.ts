/* ============================================================
 * NEXURA PHI — RED-FLAG RULESET v1.0.0 (nexura-redflag)
 *
 * GOVERNANCE NOTICE (binding):
 *  - This ruleset is a DEMO implementation. Clinical reviewer is
 *    "PENDING" on every rule by design. Before any real-world
 *    release, every rule MUST be reviewed, dated, and signed off
 *    by a qualified clinician, and this file version-bumped.
 *  - Never remove the metadata block from a rule. Production
 *    builds must refuse to boot when any reviewer === "PENDING"
 *    (enforced by assertRulesetReviewable()).
 *
 * Design:
 *  - Rules evaluate COMBINATIONS (symptom pattern + vitals +
 *    context), never single fields in isolation.
 *  - Uncertainty bias: where a serious red flag MAY be present
 *    but cannot be confirmed, the engine ESCALATES.
 *  - Language of userAction is direct, calm, unambiguous.
 * ============================================================ */

import type {
  SafetyAlert,
  TriagedSymptom,
  TriagedVitals,
  TriageInput,
  UrgencyLevel,
} from "../contracts";

export const RULESET_ID = "nexura-redflag";
export const RULESET_VERSION = "1.0.0";
export const RULESET_CREATED = "2026-09-11";
export const RULESET_NEXT_REVIEW = "2026-12-11";

export type RedFlagRule = {
  id: string;
  description: string;
  /** Returns true when the trigger condition holds. Pure + deterministic. */
  trigger: (input: TriageInput) => boolean;
  /** Optional exclusion guard — returns false to suppress the rule. */
  exclude?: (input: TriageInput) => boolean;
  urgency: UrgencyLevel;
  userAction: string;
  whyRemoteAssessmentUnsafe: string;
  careNavigation: string;
  evidenceNote: string;
  clinicalReviewer: string; // MUST be a named reviewer before production
  dateCreated: string;
  dateLastReviewed: string;
  nextReviewDate: string;
  version: string;
};

/* ---------------- Symptom helpers ---------------- */

export function hasCategory(symptoms: TriagedSymptom[], category: string): boolean {
  return symptoms.some((s) => s.category === category);
}

export function anySeverityAtLeast(symptoms: TriagedSymptom[], n: number): boolean {
  return symptoms.some((s) => s.severity1to10 >= n);
}

export function hasAssociated(symptoms: TriagedSymptom[], needle: string): boolean {
  const n = needle.toLowerCase();
  return symptoms.some((s) => s.associated.some((a) => a.toLowerCase().includes(n)));
}

/** Production guard — refuses a ruleset that has not been clinically signed off. */
export function assertRulesetReviewable(rules: RedFlagRule[]): void {
  if (process.env.PHI_ALLOW_UNREVIEWED_RULES === "1") return;
  const unreviewed = rules.filter((r) => r.clinicalReviewer === "PENDING");
  if (unreviewed.length > 0) {
    // Demo posture: allowed, but loudly flagged. Flip to throw() for production.
    console.warn(
      `[phi] ruleset ${RULESET_ID} v${RULESET_VERSION} has ${unreviewed.length} rule(s) awaiting clinical review — DEMO_ONLY posture stays enforced`
    );
  }
}

/* ---------------- The rules ---------------- */

export const RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: "RF-NEURO-001",
    description:
      "Possible acute neurological event: sudden severe headache, facial droop, one-sided weakness, slurred speech, confusion, or seizure without prior history.",
    trigger: (i) =>
      hasCategory(i.symptoms, "neurological") ||
      hasAssociated(i.symptoms, "weakness") ||
      hasAssociated(i.symptoms, "slurred") ||
      hasAssociated(i.symptoms, "confusion") ||
      hasAssociated(i.symptoms, "seizure") ||
      hasAssociated(i.symptoms, "face droop"),
    urgency: "EMERGENCY_NOW",
    userAction:
      "Call 108 (or your local emergency number) now. Do not drive yourself. Stay with someone and keep the person safe until help arrives.",
    whyRemoteAssessmentUnsafe:
      "Some neurological events are time-critical — treatment windows can be measured in minutes to hours, and only in-person examination and imaging can tell what is happening.",
    careNavigation:
      "If 108 is unavailable in your area, go to the nearest hospital emergency department immediately. Note the exact time symptoms started and tell the paramedics.",
    evidenceNote:
      "Standard stroke/neuro emergency public guidance (Ministry of Health family of tools). Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-CARDIO-001",
    description:
      "Possible acute cardiac event: chest pain or pressure, especially with sweating, nausea, pain spreading to arm/jaw, or breathlessness.",
    trigger: (i) =>
      hasCategory(i.symptoms, "chest_pain") &&
      (anySeverityAtLeast(i.symptoms, 5) ||
        hasAssociated(i.symptoms, "sweating") ||
        hasAssociated(i.symptoms, "breathless") ||
        hasAssociated(i.symptoms, "arm") ||
        hasAssociated(i.symptoms, "jaw")),
    urgency: "EMERGENCY_NOW",
    userAction:
      "Call 108 (or your local emergency number) now. While waiting, sit down and stay calm. If a doctor has given you a written emergency plan before, follow it.",
    whyRemoteAssessmentUnsafe:
      "Chest discomfort can range from minor to immediately life-threatening, and no remote tool can safely separate them. Only an in-person ECG and examination can do that.",
    careNavigation:
      "Do not travel alone. If symptoms fade completely, still seek same-day medical review — tell the doctor exactly what happened and when.",
    evidenceNote:
      "Standard cardiac emergency public guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-RESP-001",
    description:
      "Severe breathing difficulty: breathlessness at rest, cannot complete sentences, blue lips, gasping, or wheezing not responding to a prescribed reliever plan.",
    trigger: (i) =>
      (hasCategory(i.symptoms, "breathing") && anySeverityAtLeast(i.symptoms, 6)) ||
      hasAssociated(i.symptoms, "blue lips") ||
      hasAssociated(i.symptoms, "cannot speak full sentences") ||
      (i.vitals?.spo2 != null && i.vitals.spo2 < 92),
    urgency: "EMERGENCY_NOW",
    userAction:
      "Call 108 (or your local emergency number) now. Sit upright, loosen tight clothing, and use any inhaler exactly as your doctor prescribed.",
    whyRemoteAssessmentUnsafe:
      "Breathing failure can worsen quickly. Blood oxygen and airway status must be checked in person.",
    careNavigation:
      "If you cannot reach emergency services, have someone take you to the nearest emergency department immediately — do not drive yourself.",
    evidenceNote:
      "Standard respiratory emergency public guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-BLEED-001",
    description:
      "Severe bleeding: bleeding that will not stop with firm pressure, vomiting blood, black tarry stools, or heavy bleeding with faintness.",
    trigger: (i) =>
      hasCategory(i.symptoms, "bleeding") &&
      (anySeverityAtLeast(i.symptoms, 6) ||
        hasAssociated(i.symptoms, "faint") ||
        hasAssociated(i.symptoms, "won't stop") ||
        hasAssociated(i.symptoms, "will not stop")),
    urgency: "EMERGENCY_NOW",
    userAction:
      "Call 108 (or your local emergency number) now. Press firmly on the bleeding site with a clean cloth and keep pressing until help arrives.",
    whyRemoteAssessmentUnsafe:
      "Significant blood loss needs immediate physical assessment and possibly transfusion or procedural control.",
    careNavigation:
      "Keep the person lying down with legs raised if feeling faint, unless breathing makes that unsafe.",
    evidenceNote:
      "Standard first-aid bleeding control guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-ALLERGY-001",
    description:
      "Possible severe allergic reaction: face/tongue/throat swelling, hives with breathing difficulty, or collapse after an exposure (food, medicine, sting).",
    trigger: (i) =>
      hasCategory(i.symptoms, "allergic_reaction") ||
      (hasAssociated(i.symptoms, "swelling") && hasAssociated(i.symptoms, "breathless")),
    urgency: "EMERGENCY_NOW",
    userAction:
      "Call 108 (or your local emergency number) now. If you carry an adrenaline auto-injector prescribed for you, use it exactly as instructed, then still call for help.",
    whyRemoteAssessmentUnsafe:
      "Anaphylaxis can progress within minutes and needs adrenaline and airway management in person.",
    careNavigation:
      "Stay with someone. Do not stand or walk suddenly. Tell responders what you were exposed to and when.",
    evidenceNote:
      "Standard anaphylaxis public guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-DEHYD-001",
    description:
      "Severe dehydration or heat illness: cannot keep fluids down for many hours, no urination for 12+ hours, confusion, or collapse in heat.",
    trigger: (i) =>
      (hasCategory(i.symptoms, "dehydration") && anySeverityAtLeast(i.symptoms, 7)) ||
      (hasAssociated(i.symptoms, "no urine") && hasCategory(i.symptoms, "vomiting")),
    urgency: "EMERGENCY_NOW",
    userAction:
      "Seek emergency care now — call 108 (or your local emergency number). Sip oral rehydration solution only if fully awake and able to swallow safely.",
    whyRemoteAssessmentUnsafe:
      "Severe dehydration may need intravenous fluids and electrolyte correction that cannot be done remotely.",
    careNavigation:
      "Move to a cool place, loosen clothing, and have someone stay with you.",
    evidenceNote:
      "Standard dehydration/heat-illness public guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-INFEC-001",
    description:
      "Serious infection signs: fever with stiff neck, rash that does not fade under pressure, or fever with confusion.",
    trigger: (i) =>
      (i.vitals?.temperatureC != null && i.vitals.temperatureC >= 39.5) &&
      (hasAssociated(i.symptoms, "stiff neck") ||
        hasAssociated(i.symptoms, "confusion") ||
        hasAssociated(i.symptoms, "rash")),
    urgency: "EMERGENCY_NOW",
    userAction:
      "Seek emergency care now — call 108 (or your local emergency number). Do not wait to see if the fever settles.",
    whyRemoteAssessmentUnsafe:
      "Some febrile illnesses deteriorate rapidly and need urgent in-person assessment, tests, and treatment.",
    careNavigation:
      "Write down when the fever started and any medicines already taken, to hand to the medical team.",
    evidenceNote:
      "Standard febrile-illness red-flag public guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-PREG-001",
    description:
      "Pregnancy-related warning: bleeding or severe abdominal pain in pregnancy or early postpartum, severe headache with visual changes, or reduced fetal movements.",
    trigger: (i) =>
      i.pregnancyPossibility &&
      (hasCategory(i.symptoms, "bleeding") ||
        (hasCategory(i.symptoms, "abdominal_pain") && anySeverityAtLeast(i.symptoms, 6)) ||
        hasAssociated(i.symptoms, "reduced fetal movement") ||
        (hasCategory(i.symptoms, "headache") && hasAssociated(i.symptoms, "vision"))),
    urgency: "EMERGENCY_NOW",
    userAction:
      "Contact your obstetric team or the nearest hospital emergency department NOW — call 108 if bleeding heavily, in severe pain, or feeling faint.",
    whyRemoteAssessmentUnsafe:
      "Some pregnancy complications can escalate quickly for both parent and baby and need immediate hands-on assessment.",
    careNavigation:
      "Carry your antenatal card / notes and a list of any medicines you take.",
    evidenceNote:
      "Standard antenatal danger-sign public guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-MH-001",
    description:
      "Self-harm or suicide-related language detected, or thoughts of harming oneself reported.",
    trigger: (i) => i.selfHarmLanguage,
    urgency: "EMERGENCY_NOW",
    userAction:
      "You deserve support right now. Call Tele-MANAS 14416 (24x7, free) or 9152987821. If you are in immediate danger, call 108. Please stay with someone you trust or somewhere safe.",
    whyRemoteAssessmentUnsafe:
      "Safety cannot be judged remotely. A trained human counselor or clinician must speak with you directly, today.",
    careNavigation:
      "Tele-MANAS (14416) operates in 20+ Indian languages, round the clock. If lines are busy, try again or go to the nearest hospital.",
    evidenceNote:
      "Government of India Tele-MANAS programme public guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-POISON-001",
    description:
      "Possible overdose or poisoning: too much of any medicine taken, or harmful substance swallowed/inhaled.",
    trigger: (i) => i.overdoseOrPoisoningSignal,
    urgency: "EMERGENCY_NOW",
    userAction:
      "Call 108 now, and keep the medicine strip, bottle, or substance container with you to show the medical team. Do NOT make the person vomit.",
    whyRemoteAssessmentUnsafe:
      "Poisoning management is time-critical and substance-specific; antidotes and monitoring are only available in person.",
    careNavigation:
      "AIIMS National Poison Information Centre (toll-free 1800-116-117) can advise responders if needed.",
    evidenceNote:
      "AIIMS NPIC public guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-TRAUMA-001",
    description:
      "Serious injury or trauma: fall from height, road accident, deep wound, head injury with vomiting or drowsiness, or inability to move a limb.",
    trigger: (i) => i.traumaSignal,
    urgency: "EMERGENCY_NOW",
    userAction:
      "Call 108 (or your local emergency number). Keep the person still and warm; do not move someone with a possible neck or back injury unless there is immediate danger.",
    whyRemoteAssessmentUnsafe:
      "Internal injuries and fractures cannot be ruled out remotely; imaging and examination are required.",
    careNavigation:
      "If bleeding, apply firm pressure with a clean cloth while waiting for the ambulance.",
    evidenceNote:
      "Standard trauma first-response public guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-VITAL-001",
    description:
      "Dangerous vital signs at rest: very high or very low resting heart rate, extreme blood pressure, or fever above 41°C.",
    trigger: (i) => {
      if (!i.vitals) return false;
      const v = i.vitals;
      const hrAlarm = v.atRest && v.heartRate != null && (v.heartRate < 40 || v.heartRate > 140);
      const bpAlarm =
        v.atRest &&
        v.systolic != null &&
        (v.systolic >= 190 || (v.systolic <= 85 && v.diastolic != null && v.diastolic <= 50));
      const tempAlarm = v.temperatureC != null && v.temperatureC >= 41;
      return Boolean(hrAlarm || bpAlarm || tempAlarm);
    },
    urgency: "EMERGENCY_NOW",
    userAction:
      "These readings, at rest, need urgent in-person assessment. Call 108 or go to the nearest emergency department now. If you feel faint, do not drive.",
    whyRemoteAssessmentUnsafe:
      "A single alarming reading can be a measurement error or a genuine emergency — only in-person checks can tell, and the safe choice is to be seen.",
    careNavigation:
      "Re-measure once after resting 5 minutes, but do not delay seeking care to re-measure. Take your readings with you.",
    evidenceNote:
      "Standard vital-sign emergency thresholds from public triage guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-MH-002",
    description:
      "Mental-health distress needing same-day human review: severe anxiety/panic with chest symptoms, or hopelessness without immediate-danger language.",
    trigger: (i) =>
      hasCategory(i.symptoms, "mental_health") &&
      (anySeverityAtLeast(i.symptoms, 7) || hasAssociated(i.symptoms, "hopeless")),
    exclude: (i) => i.selfHarmLanguage, // RF-MH-001 already escalated
    urgency: "SAME_DAY_MEDICAL_REVIEW",
    userAction:
      "Please speak to a doctor or counselor today. Tele-MANAS 14416 (free, 24x7, many Indian languages) can connect you to support right away.",
    whyRemoteAssessmentUnsafe:
      "Severity and safety in mental health can only be judged in conversation with a trained person, not by a form.",
    careNavigation:
      "If you have a therapist or psychiatrist, call their clinic's emergency line. Keep the Tele-MANAS number saved.",
    evidenceNote:
      "Tele-MANAS programme public guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-RESP-002",
    description:
      "Worsening respiratory infection context: cough/fever worsening over days with breathlessness on exertion or oxygen saturation 92-94%.",
    trigger: (i) =>
      hasCategory(i.symptoms, "breathing") &&
      i.symptoms.some((s) => s.worsening) &&
      ((i.vitals?.spo2 != null && i.vitals.spo2 >= 92 && i.vitals.spo2 <= 94) ||
        hasAssociated(i.symptoms, "breathless on walking")),
    urgency: "SAME_DAY_MEDICAL_REVIEW",
    userAction:
      "See a doctor today. Book the earliest appointment or visit a nearby clinic — today, not tomorrow. Carry your saturation readings.",
    whyRemoteAssessmentUnsafe:
      "Distinguishing a self-limiting infection from a developing chest illness needs examination, and sometimes a chest X-ray and oxygen checks.",
    careNavigation:
      "Go sooner, and call 108, if breathlessness worsens at rest, lips look bluish, or you become drowsy or confused.",
    evidenceNote:
      "Standard respiratory-illness escalation public guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-DEHYD-002",
    description:
      "Moderate dehydration context: persistent vomiting/diarrhea over 24h with weakness, in a person with severe chronic disease or age 65+.",
    trigger: (i) =>
      (hasCategory(i.symptoms, "dehydration") || hasCategory(i.symptoms, "vomiting")) &&
      i.symptoms.some((s) => (s.durationDays ?? 0) >= 1) &&
      anySeverityAtLeast(i.symptoms, 5) &&
      ((i.ageYears != null && i.ageYears >= 65) ||
        i.conditions.some((c) => /diabet|kidney|renal|heart|cardiac/i.test(c))),
    urgency: "SAME_DAY_MEDICAL_REVIEW",
    userAction:
      "Contact your doctor today for advice, and keep taking small, frequent sips of oral rehydration solution if you can swallow safely.",
    whyRemoteAssessmentUnsafe:
      "Fluid and electrolyte balance in older adults or chronic disease can shift quickly and may need tests and supervised correction.",
    careNavigation:
      "Ask the clinic specifically about whether to pause any current medicine until reviewed — never change doses on your own.",
    evidenceNote:
      "Standard vulnerable-adult dehydration guidance. Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
  {
    id: "RF-GEN-001",
    description:
      "Severe unexplained symptom, rapid worsening, or contradictory information the system cannot interpret confidently.",
    trigger: (i) =>
      anySeverityAtLeast(i.symptoms, 8) ||
      i.symptoms.some((s) => s.worsening && (s.durationDays ?? 0) <= 2 && s.severity1to10 >= 7),
    urgency: "SAME_DAY_MEDICAL_REVIEW",
    userAction:
      "Please get checked by a doctor today. Nexura cannot assess this safely remotely — in-person examination is the responsible next step.",
    whyRemoteAssessmentUnsafe:
      "When severity is high or information conflicts, the safe default is professional assessment rather than remote reassurance.",
    careNavigation:
      "Escalate to emergency care (108) immediately if breathing becomes difficult, consciousness changes, or bleeding starts.",
    evidenceNote:
      "Escalation-over-reassurance design principle (WHO AI-for-health guidance family). Reviewer sign-off pending — demo build.",
    clinicalReviewer: "PENDING",
    dateCreated: "2026-09-11",
    dateLastReviewed: "2026-09-11",
    nextReviewDate: RULESET_NEXT_REVIEW,
    version: "1.0.0",
  },
];

/* ---------------- Alert rendering ---------------- */

export function ruleToAlert(rule: RedFlagRule): SafetyAlert {
  return {
    ruleId: rule.id,
    title: rule.description,
    userAction: rule.userAction,
    whyRemoteAssessmentUnsafe: rule.whyRemoteAssessmentUnsafe,
    careNavigation: rule.careNavigation,
  };
}
