/* ============================================================
 * NEXURA PHI — RISK SIGNAL PROVIDER (deterministic, v0.1)
 * Rules-based screening signals. NO disease probabilities.
 * Every signal carries: contributing inputs, what is unknown,
 * what could clarify, a next step, and not-a-diagnosis=true.
 * A clinically validated model provider can replace this later
 * via the RiskModelProvider interface.
 * ============================================================ */

import type { AssessmentContext, RiskModelProvider, RiskSignal } from "../contracts";

function signal(s: Omit<RiskSignal, "notADiagnosis">): RiskSignal {
  return { ...s, notADiagnosis: true };
}

export const riskSignalProvider: RiskModelProvider = {
  id: "nexura-deterministic-signals",
  version: "0.1.0",

  generateSignals(ctx: AssessmentContext): RiskSignal[] {
    const out: RiskSignal[] = [];
    const { profile, records, bmi } = ctx;
    const ls = profile.lifestyle;

    /* ---- vitals ---- */
    const restVitals = records.vitals.filter((v) => v.atRest);
    const latest = restVitals[0];
    if (latest?.systolic != null && latest.systolic >= 140) {
      out.push(
        signal({
          id: "vs-bp-elevated",
          label: "Resting blood pressure reading in the raised range",
          category: "vitals",
          severity: latest.systolic >= 160 ? "elevated" : "watch",
          confidence: restVitals.length >= 2 ? "MODERATE_CONFIDENCE" : "LOW_CONFIDENCE",
          contributingInputs: ["vitals.systolic", "vitals.at_rest"],
          observation: `Your resting reading of ${latest.systolic}/${latest.diastolic ?? "?"} mmHg is in the range doctors usually call high. A single reading is not a conclusion — patterns matter.`,
          whatIsUnknown: "Whether this is your usual level or a one-off (stress, caffeine, recent activity, cuff size can all shift a reading).",
          whatCouldClarify: "A few more readings on different days, ideally seated and rested for 5 minutes first.",
          recommendedNextStep: "Re-measure on 2-3 different days and share the log with a doctor if readings stay raised.",
        })
      );
    }

    if (latest?.glucoseMgDl != null && latest.glucoseMgDl >= 140) {
      out.push(
        signal({
          id: "vs-glucose-raised",
          label: "Glucose reading in the raised range",
          category: "vitals",
          severity: latest.glucoseMgDl >= 200 ? "elevated" : "watch",
          confidence: "LOW_CONFIDENCE",
          contributingInputs: ["vitals.glucose"],
          observation:
            "A glucose value of this level is worth discussing with a doctor, especially if it was not a fasting sample or you had just eaten.",
          whatIsUnknown: "When you last ate, whether the meter is calibrated, and whether this is a repeated pattern.",
          whatCouldClarify: "Whether you already have a diabetes diagnosis, and a lab test (fasting glucose or HbA1c) if your doctor agrees.",
          recommendedNextStep: "Note when you last ate before the reading and mention this value at your next clinical review.",
        })
      );
    }

    if (bmi != null && bmi >= 27.5) {
      out.push(
        signal({
          id: "gen-weight-context",
          label: "Weight context worth reviewing",
          category: "general",
          severity: "informational",
          confidence: "LOW_CONFIDENCE",
          contributingInputs: ["profile.height", "profile.weight"],
          observation:
            "Your weight-for-height sits in the range often associated with long-term metabolic load. This is general context only — bodies vary, and weight alone says nothing about fitness or health habits.",
          whatIsUnknown: "Waist circumference, activity level, and family history change the picture substantially.",
          whatCouldClarify: "An optional waist measurement and your activity pattern.",
          recommendedNextStep: "If comfortable, add a waist measurement and keep activity regular — small consistent changes matter most.",
        })
      );
    }

    /* ---- lifestyle ---- */
    if (ls) {
      if (ls.sleepHours != null && ls.sleepHours < 6) {
        out.push(
          signal({
            id: "ls-sleep-short",
            label: "Sleep running short of the usual 7-9 hour range",
            category: "sleep",
            severity: "watch",
            confidence: ls.sleepQuality ? "MODERATE_CONFIDENCE" : "LOW_CONFIDENCE",
            contributingInputs: ["lifestyle.sleep_hours"],
            observation: "Regular short sleep is one of the most common reversible load factors on energy, mood, appetite, and blood pressure.",
            whatIsUnknown: "Whether this is shift-driven, stress-driven, or a sleep disorder pattern (snoring, waking unrefreshed).",
            whatCouldClarify: "Your typical bedtime/wake time across a week, and whether you snore or wake gasping.",
            recommendedNextStep: "Aim for a consistent sleep window for two weeks and notice whether energy and appetite shift.",
          })
        );
      }
      if (ls.activityMinutesWeek != null && ls.activityMinutesWeek < 75) {
        out.push(
          signal({
            id: "ls-activity-low",
            label: "Weekly movement below the commonly recommended floor",
            category: "activity",
            severity: "watch",
            confidence: "MODERATE_CONFIDENCE",
            contributingInputs: ["lifestyle.activity_minutes_week"],
            observation: "Under 75 minutes of intentional movement a week is where most guidelines agree there is clear headroom — every extra 10 minutes counts.",
            whatIsUnknown: "Whether work already involves physical effort that the number misses.",
            whatCouldClarify: "A realistic week including commuting, household work, and any sport.",
            recommendedNextStep: "Pick one repeatable 15-20 minute walk slot (mornings suit Indian heat best) and build from there.",
          })
        );
      }
      if (ls.tobacco === "current") {
        out.push(
          signal({
            id: "ls-tobacco-current",
            label: "Current tobacco use — the single most modifiable factor",
            category: "substance",
            severity: "elevated",
            confidence: "HIGHER_CONFIDENCE_WITHIN_SCREENING_SCOPE",
            contributingInputs: ["lifestyle.tobacco"],
            observation:
              "Any form of tobacco — cigarettes, bidi, gutkha, khaini — raises risk across many systems. Quitting pays back quickly at any age. This is not a judgment; support works.",
            whatIsUnknown: "How long and how much — which affects the best quitting strategy for you.",
            whatCouldClarify: "Your readiness to consider change, and whether past attempts happened.",
            recommendedNextStep: "Call the national quit line 1800-11-2356 or ask a doctor about quitting aids; even planning a quit date helps.",
          })
        );
      }
      if (ls.stressLevel === "high") {
        out.push(
          signal({
            id: "ls-stress-high",
            label: "Stress reported as high",
            category: "mental_wellbeing",
            severity: "watch",
            confidence: "MODERATE_CONFIDENCE",
            contributingInputs: ["lifestyle.stress_level"],
            observation: "Persistent high stress affects sleep, blood pressure, appetite, and concentration — and it is addressable, not a personal failing.",
            whatIsUnknown: "The sources of stress (work, finances, family, health) and how much they feel controllable.",
            whatCouldClarify: "A week of noting stress peaks and what preceded them.",
            recommendedNextStep: "Try one daily 10-minute reset (walk, breathing, or calling someone) and consider Tele-MANAS 14416 if stress feels unmanageable.",
          })
        );
      }
    }

    /* ---- labs ---- */
    for (const lab of records.labs) {
      const t = lab.testName.toLowerCase();
      if (t.includes("hba1c") && lab.value >= 5.7 && lab.unit.includes("%")) {
        out.push(
          signal({
            id: "lab-hba1c-raised",
            label: "HbA1c in the prediabetes range or above",
            category: "labs",
            severity: lab.value >= 6.5 ? "elevated" : "watch",
            confidence: "HIGHER_CONFIDENCE_WITHIN_SCREENING_SCOPE",
            contributingInputs: ["labs.hba1c"],
            observation: `An HbA1c of ${lab.value}% is above the usual <5.7% range. This is a lab fact worth a clinical conversation — it is not a diagnosis.`,
            whatIsUnknown: "Whether the value is recent, and whether your doctor has already acted on it.",
            whatCouldClarify: "The report date and any follow-up tests your doctor ordered.",
            recommendedNextStep: "Share this result with a doctor and ask what repeat testing schedule makes sense for you.",
          })
        );
      }
      if (t.includes("ldl") && lab.value >= 130 && lab.unit.toLowerCase().includes("mg")) {
        out.push(
          signal({
            id: "lab-ldl-raised",
            label: "LDL cholesterol above the common screening threshold",
            category: "labs",
            severity: "watch",
            confidence: "MODERATE_CONFIDENCE",
            contributingInputs: ["labs.ldl"],
            observation: `An LDL of ${lab.value} ${lab.unit} is above the level many guidelines use for general screening follow-up.`,
            whatIsUnknown: "Your overall lipid panel, family history, and whether targets differ for you due to other conditions.",
            whatCouldClarify: "The full lipid report and your doctor's target for you specifically.",
            recommendedNextStep: "Discuss the full report at your next appointment rather than focusing on one line.",
          })
        );
      }
    }

    /* ---- repeated symptom pattern ---- */
    const cats = new Map<string, number>();
    for (const s of records.symptoms) cats.set(s.category, (cats.get(s.category) ?? 0) + 1);
    for (const [cat, count] of cats) {
      if (count >= 2) {
        out.push(
          signal({
            id: `sym-repeat-${cat}`,
            label: `Repeated reports in the same category (${cat.replace(/_/g, " ")})`,
            category: "general",
            severity: "watch",
            confidence: "MODERATE_CONFIDENCE",
            contributingInputs: ["symptoms.category", "symptoms.frequency"],
            observation: "The same category of complaint has appeared more than once. Repetition is often the most useful clue that a pattern exists.",
            whatIsUnknown: "Whether the reports share a trigger, timing, or a single underlying cause.",
            whatCouldClarify: "Noting timing and context for the next two occurrences.",
            recommendedNextStep: "Add timing details to the next report — patterns with timing are far easier for a clinician to interpret.",
          })
        );
      }
    }

    // Sort: elevated first, then watch, then informational — deterministic tiebreak by id.
    const sevRank = { elevated: 0, watch: 1, informational: 2 } as const;
    return out.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || a.id.localeCompare(b.id));
  },
};
