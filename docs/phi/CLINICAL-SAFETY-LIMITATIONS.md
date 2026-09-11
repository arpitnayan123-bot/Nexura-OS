# Nexura PHI — Clinical Safety & Limitations

> **Demo build.** No rule in this system has been reviewed by a qualified clinician
> (`clinicalReviewer: "PENDING"` on all 16 rules). This document is the honest
> boundary statement for the feature as built. Nothing here is clinical advice.

## 1. Intended use (as built)

- **Population:** adults **18 years and older**. Ages under 18 are rejected at the
  schema layer (`adultAge` min 18 in `schemas.ts`) and routed out by the triage
  engine (`MINOR_ROUTED_OUT` notice; rules are not even evaluated for minors).
- **Purpose:** general health-risk **screening** and **preventive guidance** in an
  **India context** — Indian diet/cuisine framing (katori portions, South-Indian
  protein sources), Indian emergency numbers (108), Tele-MANAS 14416, AIIMS National
  Poison Information Centre 1800-116-117, and the tobacco-cessation quitline
  1800-11-2356 in recommendations.
- **Inputs:** self-reported profile, symptoms, conditions, medications, allergies,
  lifestyle entries, home-measured vitals, and self-entered lab values. Nothing is
  verified against any clinical record system.
- **Output class:** a screening summary — signals, possible patterns, missing
  information, next steps, clinician questions, trends — stamped with engine,
  ruleset, and content versions and an explicit disclaimer.

## 2. Excluded populations and routing cautions

| Population | Behavior implemented | Where |
|---|---|---|
| **Children / adolescents (<18)** | Hard routed out. Schema rejects age <18; triage returns `MINOR_ROUTED_OUT` and skips all rule evaluation; UI shows a dedicated `minor` view directing to a pediatrician. | `schemas.ts`, `triage/engine.ts routeMinors()` |
| **Pregnancy (possible)** | Non-blocking caution: `PREGNANCY_ROUTING` notice; pregnancy-specific red flags (RF-PREG-001) always escalate bleeding / severe abdominal pain / severe headache with visual changes / reduced fetal movement to `EMERGENCY_NOW`. | `triage/engine.ts routePregnancy()`, `ruleset.ts` |
| **Severe chronic disease** | Non-blocking caution: `SPECIAL_POPULATION_ROUTING` notice when conditions match `active cancer / chemotherapy / immunocompromised / transplant / dialysis / severe * / advanced heart / COPD / kidney failure / renal failure`; RF-DEHYD-002 escalates same-day for 65+ or diabetes/kidney/cardiac conditions. | `triage/engine.ts routeSevereChronic()`, `ruleset.ts` |

The special-routing notices are **advisory text** on the assessment
(`routingNotice`), not clinical safeguards by themselves.

## 3. What the system explicitly does NOT do

1. **No diagnosis.** No output names a disease. Patterns carry `notADiagnosis: true`
   as a type-level invariant; a unit test greps recommendation/content text for
   `diagnos*` wording and dose language.
2. **No probabilities in v0.1.** Confidence is a 4-value category enum
   (`INSUFFICIENT_INFORMATION`, `LOW_CONFIDENCE`, `MODERATE_CONFIDENCE`,
   `HIGHER_CONFIDENCE_WITHIN_SCREENING_SCOPE`). A test asserts risk-signal objects
   contain **no probability field**. No risk scores, no percentages, ever.
3. **No medication doses.** Recommendations never contain mg/dose instructions; a
   test pins zero dose language across recommendations. Clinician questions ask a
   professional for follow-up instead of suggesting any change.
4. **No emergency service.** The system cannot summon help, cannot contact anyone,
   and cannot receive callbacks. On `EMERGENCY_NOW` it displays instructions to call
   108 / Tele-MANAS / poison control and stops analysis (`triageOnly`).
5. **No diagnosis-grade triage.** Thresholds are conservative public-guidance-style
   heuristics, not validated clinical algorithms.
6. **No child, pregnancy-dose, or drug-interaction logic.** Absent by design, not
   "coming soon" in v0.1.
7. **No free-text understanding.** Symptom categories are structured picks; the
   clinician summary generator never touches the user's free-text wording.

## 4. Escalation-over-reassurance design

The governing bias of the triage layer:

- **Uncertainty escalates, never reassures.** A severe symptom (severity ≥ 8/10) that
  matches no red-flag rule still fires the engine-level `RF-UNCERTAINTY-001` alert and
  lifts urgency to at least `SAME_DAY_MEDICAL_REVIEW`
  (`triage/engine.ts`, `escalatedOnUncertainty: true`).
- **A crashing rule never passes silently.** Rule evaluation is wrapped in
  try/catch; a throwing rule records `<ruleId>:EVAL_ERROR` and escalates urgency to
  `SAME_DAY_MEDICAL_REVIEW`.
- **Merging is monotonic.** Multiple rule outcomes merge via `maxUrgency()` against
  the ordered `URGENCY_RANK`; urgency can only go up.
- **Emergency short-circuit.** `EMERGENCY_NOW` skips the entire analysis layer so the
  safety message cannot compete with signals or patterns (`run.ts`, position lock).
- **Empty data is not reassurance.** The quality engine treats "no data" as missing
  information, never as a healthy value ("missing is never normal").

## 5. Red-flag ruleset coverage (`nexura-redflag` 1.0.0)

16 rules in `src/modules/phi/triage/ruleset.ts`. All are combination rules (symptom
pattern + vitals + context); all carry full governance metadata with
`clinicalReviewer: "PENDING"`.

| Rule ID | One-line trigger | Urgency |
|---|---|---|
| `RF-NEURO-001` | Possible acute neurological event: sudden severe headache, facial droop, one-sided weakness, slurred speech, confusion, or seizure without prior history | `EMERGENCY_NOW` |
| `RF-CARDIO-001` | Chest pain/pressure with severity ≥5 or associated sweating, breathlessness, arm/jaw radiation | `EMERGENCY_NOW` |
| `RF-RESP-001` | Severe breathing difficulty (severity ≥6), blue lips, cannot complete sentences, or SpO2 < 92% | `EMERGENCY_NOW` |
| `RF-BLEED-001` | Severe bleeding: severity ≥6, faintness, or bleeding that will not stop | `EMERGENCY_NOW` |
| `RF-ALLERGY-001` | Possible anaphylaxis: allergic-reaction category, or swelling + breathlessness together | `EMERGENCY_NOW` |
| `RF-DEHYD-001` | Severe dehydration/heat illness: cannot keep fluids down, no urination 12+ hours, confusion, collapse in heat | `EMERGENCY_NOW` |
| `RF-INFEC-001` | Fever ≥ 39.5 °C with stiff neck, confusion, or non-blanching rash | `EMERGENCY_NOW` |
| `RF-PREG-001` | Pregnancy danger signs: bleeding, severe abdominal pain, severe headache with vision changes, reduced fetal movement | `EMERGENCY_NOW` |
| `RF-MH-001` | Self-harm or suicide-related language detected | `EMERGENCY_NOW` (Tele-MANAS 14416 / 9152987821) |
| `RF-POISON-001` | Overdose or poisoning signal | `EMERGENCY_NOW` (keep container; AIIMS NPIC 1800-116-117) |
| `RF-TRAUMA-001` | Serious injury/trauma: fall from height, road accident, deep wound, head injury with vomiting/drowsiness, unable to move a limb | `EMERGENCY_NOW` |
| `RF-VITAL-001` | Dangerous resting vitals: HR <40 or >140; SBP ≥190 or ≤85 with DBP ≤50; temperature ≥41 °C | `EMERGENCY_NOW` |
| `RF-MH-002` | Severe anxiety/panic with chest symptoms or hopelessness, without immediate-danger language (excluded when RF-MH-001 already fired) | `SAME_DAY_MEDICAL_REVIEW` |
| `RF-RESP-002` | Worsening cough/fever over days with exertional breathlessness or SpO2 92–94% | `SAME_DAY_MEDICAL_REVIEW` |
| `RF-DEHYD-002` | Persistent vomiting/diarrhea ≥24 h with weakness, in age 65+ or severe chronic disease | `SAME_DAY_MEDICAL_REVIEW` |
| `RF-GEN-001` | Severe unexplained symptom (severity ≥8) or rapid worsening — the escalation-over-reassurance catch-all | `SAME_DAY_MEDICAL_REVIEW` |

Plus one **engine-level** synthetic alert, not part of the versioned ruleset file:
`RF-UNCERTAINTY-001` (severe symptom with no matched rule → escalate to
`SAME_DAY_MEDICAL_REVIEW`).

**Known coverage gaps (honest list):** no obstetric rule outside pregnancy flags, no
pediatric thresholds (children are excluded), no region-specific endemic-condition
rules (e.g., dengue/malaria warning signs), no ECG-adjacent rules beyond symptom
proxies, and RF-VITAL-001 evaluates only the most recent vital snapshot passed to
triage. These are items for the clinical review described below, not omissions to
fix silently.

## 6. What MUST happen before any real-world release

Non-negotiable gates. The demo build satisfies none of them yet.

1. **Named clinical reviewer per rule.** Every `RedFlagRule` requires a named,
   qualified clinician with `dateLastReviewed` and `nextReviewDate` filled, and
   `assertRulesetReviewable()` flipped from warn to `throw()` so an unreviewed
   ruleset cannot boot. Same standard for every content item (`reviewedBy`).
2. **Clinical validation study.** Retrospective/prospective evaluation of rule
   sensitivity/specificity and of the deterministic signal layer against real
   data, with pre-registered endpoints and ethics approval. No model or rule goes
   live on unvalidated thresholds.
3. **DPDP legal review.** Independent legal review against the Digital Personal Data
   Protection Act 2023 and the DPDP Rules 2025 (India) — consent artifact wording,
   withdrawal propagation, data-deletion SLAs, children's-data provisions (the
   18+ gate must be validated against the statutory definition of a child),
   breach-notification duties. *(Consult the acts themselves; this document does
   not cite clause numbers.)*
4. **CDSCO SaMD pathway assessment.** Formal classification assessment under the
   Central Drugs Standard Control Organisation's medical-device (Software as a
   Medical Device) framework to determine whether this feature is a regulated
   device in its release form and what registration/quality-system obligations
   follow. If classification is ambiguous, treat it as regulated until told
   otherwise.
5. **Security/privacy hardening** per `THREAT-MODEL.md` "open items" (encryption at
   rest, real authentication, monitoring).
6. **Operational readiness:** on-call ownership for the kill switch, a clinical
   incident-review process for every `EMERGENCY_NOW` false-negative/positive
   complaint, and a ruleset rollback procedure tied to `VERSIONING.md`.

## 7. Kill-switch semantics

- Single DB flag (`PhiSystemFlag`, id `phi_kill_switch`, value `"on" | "off"`),
  checked at pipeline step 2 in `run.ts` **and** surfaced via `GET /session` and
  public `GET /status`.
- **When ON:** producing **new** predictive results is blocked for all subjects
  (403 `kill_switch`, audited `assessment.blocked`). The UI shows an amber banner.
  Profile, intake, consent, trend storage, feedback, export/delete, and
  clinician-summary of **past** assessments remain available — the feature degrades
  to a passive record-keeper, it does not lock users out of their data.
- **When OFF (default):** normal operation.
- Intended use: incident response (bad ruleset version, harmful output report,
  provider outage) and ruleset rollback windows. In production this must map to a
  documented on-call runbook with authorization rules for who may flip it.

## 8. Review sources to consult (references only)

The demo content and rule text reference the *families* of guidance below as review
starting points. This repository does not reproduce or verify them, and this document
intentionally cites no specific clause numbers:

- ICMR-NIN *Dietary Guidelines for Indians 2024* (content catalog demo posture
  cites it as `"ICMR-NIN Dietary Guidelines for Indians 2024 (demo posture)"`).
- WHO *Ethics and governance of artificial intelligence for health* guiding
  principles (2021) — the escalation-over-reassurance bias is consistent with its
  emphasis on human oversight; the RF-GEN-001 evidence note references this family.
- DPDP Act 2023 and DPDP Rules 2025 (India) — privacy/legal gate for any real
  release (Section 6 above).
- Government of India public guidance families referenced by rule evidence notes:
  Tele-MANAS programme, AIIMS National Poison Information Centre, Ministry of
  Health emergency public guidance. Each rule's `evidenceNote` field records which
  family it drew on; **all require reviewer verification before production.**
