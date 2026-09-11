/* ============================================================
 * NEXURA PHI — DATA QUALITY ENGINE
 * Completeness scoring + plausibility/contradiction checks.
 * Core invariant: MISSING IS NEVER NORMAL. Absence of data is
 * surfaced as missing information, never treated as a healthy
 * value. No diagnosis meaning is assigned here.
 * ============================================================ */

import type { DataQualityEngine, ProfileSnapshot, QualityWarning, RecordSnapshot } from "../contracts";
import { isPlausible, isPlausibleBp } from "../normalize";

/** Weights reflect how much each block can support screening signal. */
const BLOCK_WEIGHTS = {
  profile: 30,
  symptoms: 20,
  conditionsMeds: 12,
  lifestyle: 13,
  vitals: 15,
  labs: 10,
} as const;

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

export const dataQualityEngine: DataQualityEngine = {
  version: "0.1.0",

  assess(profile: ProfileSnapshot, records: RecordSnapshot) {
    const warnings: QualityWarning[] = [];
    const missingInformation: string[] = [];

    /* ---- profile block (30) ---- */
    let profileScore = 0;
    if (profile.ageYears != null) profileScore += 10;
    else missingInformation.push("Age — needed to route guidance safely (adults only).");
    if (profile.sexAtBirth != null && profile.sexAtBirth !== "undisclosed") profileScore += 8;
    else missingInformation.push("Sex at birth — affects how some signals are interpreted.");
    if (profile.heightCm != null && profile.weightKg != null) profileScore += 8;
    else missingInformation.push("Height and weight — support general context (never used alone to judge health).");
    if (profile.lifestyle != null) profileScore += 4;
    else missingInformation.push("Lifestyle basics (sleep, activity, meals) — optional but improves pattern detection.");

    /* ---- symptoms block (20) ---- */
    const symptomScore = records.symptoms.length > 0 ? 20 : 0;
    if (records.symptoms.length === 0) {
      missingInformation.push("Current symptoms — none reported this cycle. If something has changed, add it.");
    }

    /* ---- conditions & meds (12) ---- */
    const cmScore = Math.min(12, (profile.conditions.length > 0 ? 6 : 0) + (profile.medications.length > 0 ? 6 : 0));
    if (profile.conditions.length === 0) {
      missingInformation.push("Existing conditions — 'none recorded' is treated as unknown, not as confirmed none. Adding known conditions improves accuracy.");
    }
    if (profile.medications.length === 0) {
      missingInformation.push("Current medicines or supplements — optional; helps avoid conflicting suggestions.");
    }

    /* ---- lifestyle (13) ---- */
    let lifestyleScore = 0;
    const ls = profile.lifestyle;
    if (ls) {
      if (ls.sleepHours != null) lifestyleScore += 4;
      else missingInformation.push("Typical sleep hours — a single most-common value is enough.");
      if (ls.activityMinutesWeek != null) lifestyleScore += 4;
      if (ls.tobacco != null) lifestyleScore += 2;
      if (ls.stressLevel != null) lifestyleScore += 3;
    }

    /* ---- vitals (15) ---- */
    const vitalsScore = records.vitals.length > 0 ? 15 : 0;
    if (records.vitals.length === 0) {
      missingInformation.push("Recent readings (BP, pulse, temperature, SpO2, glucose) — completely optional, but they make signals more specific.");
    }

    /* ---- labs (10) ---- */
    const labsScore = records.labs.length > 0 ? 10 : 0;
    if (records.labs.length === 0) {
      missingInformation.push("Recent lab results — optional. Only add results you have reports for.");
    }

    const completeness = Math.min(
      100,
      pct(profileScore, BLOCK_WEIGHTS.profile) * 0.3 +
        pct(symptomScore, BLOCK_WEIGHTS.symptoms) * 0.2 +
        pct(cmScore, BLOCK_WEIGHTS.conditionsMeds) * 0.12 +
        pct(lifestyleScore, BLOCK_WEIGHTS.lifestyle) * 0.13 +
        pct(vitalsScore, BLOCK_WEIGHTS.vitals) * 0.15 +
        pct(labsScore, BLOCK_WEIGHTS.labs) * 0.1
    );

    /* ---- plausibility + contradiction checks ---- */
    for (const v of records.vitals) {
      if (v.systolic != null && v.diastolic != null && !isPlausibleBp(v.systolic, v.diastolic)) {
        warnings.push({
          field: "vitals.blood_pressure",
          issue: "implausible",
          message: "A blood pressure entry looks unusual (for example systolic lower than diastolic). Please re-check it.",
        });
      }
      if (v.heartRate != null && !isPlausible("heartRate", v.heartRate)) {
        warnings.push({ field: "vitals.heart_rate", issue: "implausible", message: "A heart-rate entry is outside measurable range and was ignored for analysis." });
      }
      if (v.temperatureC != null && !isPlausible("temperatureC", v.temperatureC)) {
        warnings.push({ field: "vitals.temperature", issue: "implausible", message: "A temperature entry is outside human range. If it was entered in Fahrenheit, please use the °F option." });
      }
      if (v.glucoseMgDl != null && !isPlausible("glucoseMgDl", v.glucoseMgDl)) {
        warnings.push({ field: "vitals.glucose", issue: "implausible", message: "A glucose entry is outside measurable range. Check whether the meter was set to mg/dL or mmol/L." });
      }
      if (v.confidence === "unsure") {
        warnings.push({ field: "vitals", issue: "low_confidence", message: "Some readings were marked 'not sure'. They are included but weighted with more caution." });
      }
    }

    // Contradiction: same-day rest vitals with widely differing values
    const byDay = new Map<string, { sys: number[]; hr: number[] }>();
    for (const v of records.vitals) {
      const day = (v.measuredAt ?? "").slice(0, 10);
      const acc = byDay.get(day) ?? { sys: [], hr: [] };
      if (v.atRest && v.systolic != null) acc.sys.push(v.systolic);
      if (v.atRest && v.heartRate != null) acc.hr.push(v.heartRate);
      byDay.set(day, acc);
    }
    for (const [day, acc] of byDay) {
      const spread = (arr: number[]) => (arr.length >= 2 ? Math.max(...arr) - Math.min(...arr) : 0);
      if (spread(acc.sys) >= 40) {
        warnings.push({ field: `vitals.blood_pressure:${day}`, issue: "contradictory", message: "Two same-day resting blood-pressure readings differ by 40+ points — please re-measure when you can." });
      }
      if (spread(acc.hr) >= 30) {
        warnings.push({ field: `vitals.heart_rate:${day}`, issue: "contradictory", message: "Two same-day resting pulse readings differ by 30+ beats — please re-measure when you can." });
      }
    }

    // Staleness: vitals older than 90 days add a gentle note
    if (records.vitals.length > 0) {
      const newest = Math.max(...records.vitals.map((v) => new Date(v.measuredAt).getTime() || 0));
      if (newest > 0 && Date.now() - newest > 90 * 24 * 3600 * 1000) {
        warnings.push({ field: "vitals", issue: "stale", message: "Your most recent readings are over three months old — newer values would sharpen the picture." });
      }
    }

    return { completeness, warnings, missingInformation };
  },
};
