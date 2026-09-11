import "server-only";
import { db } from "@/lib/db";
import type {
  ProfileSnapshot,
  RecordSnapshot,
  TriagedSymptom,
  TriagedVitals,
  UrgencyLevel,
} from "./contracts";
import { normalizeAdultAge, normalizeSex } from "./normalize";

/* ============================================================
 * NEXURA PHI — SNAPSHOT BUILDER
 * Reads every intake bucket for a subject and projects it into
 * the engine-facing snapshots. Never exposes raw rows to engines.
 * ============================================================ */

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export async function buildSnapshots(subjectId: string): Promise<{
  profile: ProfileSnapshot;
  records: RecordSnapshot;
}> {
  const [profileRow, symptoms, conditions, medications, allergies, lifestyle, vitals, labs, assessments] =
    await Promise.all([
      db.phiHealthProfile.findUnique({ where: { subjectId } }),
      db.phiSymptomReport.findMany({ where: { subjectId }, orderBy: { createdAt: "desc" }, take: 50 }),
      db.phiConditionHistory.findMany({ where: { subjectId } }),
      db.phiMedicationRecord.findMany({ where: { subjectId } }),
      db.phiAllergyRecord.findMany({ where: { subjectId } }),
      db.phiLifestyleRecord.findMany({ where: { subjectId }, orderBy: { recordedAt: "desc" }, take: 30 }),
      db.phiVitalRecord.findMany({ where: { subjectId }, orderBy: { measuredAt: "desc" }, take: 60 }),
      db.phiLaboratoryRecord.findMany({ where: { subjectId }, orderBy: { createdAt: "desc" }, take: 50 }),
      db.phiAssessment.findMany({
        where: { subjectId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { createdAt: true, urgency: true },
      }),
    ]);

  const latestLifestyle = lifestyle[0];

  const profile: ProfileSnapshot = {
    ageYears: normalizeAdultAge(profileRow?.ageYears ?? null),
    sexAtBirth: normalizeSex(profileRow?.sexAtBirth ?? null),
    pregnancyPossibility: profileRow?.pregnancyPossibility ?? false,
    heightCm: profileRow?.heightCm ?? null,
    weightKg: profileRow?.weightKg ?? null,
    waistCm: profileRow?.waistCm ?? null,
    conditions: conditions.map((c) => ({
      name: c.name,
      source: c.source === "clinician_confirmed" ? "clinician_confirmed" : "user_reported",
      status: c.status,
    })),
    medications: medications.map((m) => ({ name: m.name, strength: m.strength, frequency: m.frequency })),
    allergies: allergies.map((a) => ({ substance: a.substance, reaction: a.reaction })),
    lifestyle: latestLifestyle
      ? {
          sleepHours: latestLifestyle.sleepHours,
          sleepQuality: latestLifestyle.sleepQuality,
          activityMinutesWeek: latestLifestyle.activityMinutesWeek,
          sedentaryHours: latestLifestyle.sedentaryHours,
          fruitsVegFrequency: latestLifestyle.fruitsVegFrequency,
          proteinSources: latestLifestyle.proteinSources,
          waterGlasses: latestLifestyle.waterGlasses,
          tobacco: latestLifestyle.tobacco,
          alcohol: latestLifestyle.alcohol,
          stressLevel: latestLifestyle.stressLevel,
          shiftWork: profileRow?.shiftWork ?? false,
        }
      : null,
    dietaryPref: profileRow?.dietaryPref ?? null,
    languagePref: profileRow?.languagePref ?? "en",
  };

  const triagedSymptoms: TriagedSymptom[] = symptoms.map((s) => ({
    category: s.category,
    severity1to10: s.severity1to10,
    suddenOnset: s.isNew,
    worsening: s.isWorsening,
    durationDays: s.durationDays,
    associated: parseJsonArray(s.associated),
  }));

  const triagedVitals: (TriagedVitals & { measuredAt: string })[] = vitals.map((v) => ({
    systolic: v.systolic,
    diastolic: v.diastolic,
    heartRate: v.heartRate,
    temperatureC: v.temperatureC,
    spo2: v.spo2,
    glucoseMgDl: v.glucoseMgDl,
    weightKg: v.weightKg,
    atRest: v.atRest,
    confidence: v.confidence,
    measuredAt: v.measuredAt.toISOString(),
  }));

  const records: RecordSnapshot = {
    symptoms: triagedSymptoms,
    vitals: triagedVitals,
    labs: labs.map((l) => ({
      testName: l.testName,
      value: l.resultValue,
      unit: l.unit,
      collectedAt: l.collectedAt ? l.collectedAt.toISOString() : null,
    })),
    lifestyleEntries: lifestyle.map((l) => ({
      sleepHours: l.sleepHours,
      sleepQuality: l.sleepQuality,
      activityMinutesWeek: l.activityMinutesWeek,
      sedentaryHours: l.sedentaryHours,
      fruitsVegFrequency: l.fruitsVegFrequency,
      proteinSources: l.proteinSources,
      waterGlasses: l.waterGlasses,
      tobacco: l.tobacco,
      alcohol: l.alcohol,
      stressLevel: l.stressLevel,
      shiftWork: profileRow?.shiftWork ?? false,
    })),
    assessmentHistory: assessments.map((a) => ({
      createdAt: a.createdAt.toISOString(),
      urgency: a.urgency as UrgencyLevel,
    })),
  };

  return { profile, records };
}
