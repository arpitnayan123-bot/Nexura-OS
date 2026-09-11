/* ============================================================
 * NEXURA PHI — SHARE / SUMMARY UTILITIES (pure, testable)
 * No DB, no session, no logging. Routes own all I/O; this module
 * owns capability-token mechanics, grant expiry logic, the
 * section allow-list filter, and clinician-summary "extra"
 * composition from already-fetched rows.
 * ============================================================ */

import type { ClinicianSummary } from "./contracts";
import { SHARE_SECTIONS, type ShareSection } from "./schemas";

/* ---------------- capability tokens ---------------- */

/** URL-safe capability token: two concatenated UUIDv4s (72 chars). */
export function generateShareToken(): string {
  return `${globalThis.crypto.randomUUID()}${globalThis.crypto.randomUUID()}`;
}

export function shareExpiryFromNow(expiresInDays: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
}

export type GrantLike = {
  expiresAt: Date | string;
  revokedAt: Date | string | null;
};

/** A grant is usable only while un-revoked and un-expired. */
export function isGrantActive(grant: GrantLike, now: Date = new Date()): boolean {
  if (grant.revokedAt != null) return false;
  return new Date(grant.expiresAt).getTime() > now.getTime();
}

/* ---------------- section allow-list ---------------- */

export type GrantedSections = Partial<Record<ShareSection, string[]>>;

/**
 * Returns ONLY the granted sections of a summary. Sections not listed
 * in `includes` are never present in the output object at all — so a
 * consumer cannot accidentally render un-granted content.
 */
export function filterSummarySections(
  summary: Pick<ClinicianSummary, ShareSection> & { statement: string },
  includes: readonly string[]
): { statement: string; sections: GrantedSections } {
  const allowed = new Set<string>(SHARE_SECTIONS);
  const granted = new Set(includes.filter((s) => allowed.has(s)));
  const record = summary as unknown as Record<string, unknown>;
  const sections: GrantedSections = {};
  for (const key of SHARE_SECTIONS) {
    if (granted.has(key) && Array.isArray(record[key])) {
      sections[key] = record[key] as string[];
    }
  }
  return { statement: summary.statement, sections };
}

/* ---------------- clinician summary "extra" ---------------- */

export type SummaryExtra = {
  medications: string[];
  allergies: string[];
  recentVitals: string[];
  relevantLabs: string[];
  lifestyleContext: string[];
  conditions: string[];
};

export type SummarySourceRows = {
  medications: { name: string; strength: string | null; frequency: string | null }[];
  allergies: { substance: string; reaction: string | null; severity?: string | null }[];
  vitals: {
    systolic: number | null;
    diastolic: number | null;
    heartRate: number | null;
    temperatureC: number | null;
    spo2: number | null;
    glucoseMgDl: number | null;
    weightKg: number | null;
    measuredAt: Date | string;
  }[];
  labs: { testName: string; resultValue: number; unit: string; collectedAt: Date | string | null }[];
  lifestyle: {
    sleepHours: number | null;
    sleepQuality: string | null;
    activityMinutesWeek: number | null;
    tobacco: string | null;
    alcohol: string | null;
    stressLevel: string | null;
  } | null;
  conditions: { name: string; status?: string | null }[];
};

function toIso(v: Date | string): string {
  return (v instanceof Date ? v : new Date(v)).toISOString();
}

function toIsoDate(v: Date | string | null): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** "BP 138/88 mmHg, Pulse 76 bpm, SpO2 98% @ 2026-09-10T10:00:00.000Z" */
export function formatVitalRow(row: SummarySourceRows["vitals"][number]): string {
  const parts: string[] = [];
  if (row.systolic != null && row.diastolic != null) parts.push(`BP ${row.systolic}/${row.diastolic} mmHg`);
  else if (row.systolic != null) parts.push(`Systolic ${row.systolic} mmHg`);
  else if (row.diastolic != null) parts.push(`Diastolic ${row.diastolic} mmHg`);
  if (row.heartRate != null) parts.push(`Pulse ${row.heartRate} bpm`);
  if (row.temperatureC != null) parts.push(`Temp ${row.temperatureC} °C`);
  if (row.spo2 != null) parts.push(`SpO2 ${row.spo2}%`);
  if (row.glucoseMgDl != null) parts.push(`Glucose ${row.glucoseMgDl} mg/dL`);
  if (row.weightKg != null) parts.push(`Weight ${row.weightKg} kg`);
  if (parts.length === 0) return "";
  return `${parts.join(", ")} @ ${toIso(row.measuredAt)}`;
}

/** "HbA1c 6.2 % @ 2026-09-01" */
export function formatLabRow(row: SummarySourceRows["labs"][number]): string {
  const when = toIsoDate(row.collectedAt);
  return `${row.testName} ${row.resultValue} ${row.unit}${when ? ` @ ${when}` : ""}`;
}

function formatLifestyleLine(ls: NonNullable<SummarySourceRows["lifestyle"]>): string {
  const parts: string[] = [];
  if (ls.sleepHours != null) parts.push(`sleep ${ls.sleepHours} h${ls.sleepQuality ? ` (${ls.sleepQuality})` : ""}`);
  if (ls.activityMinutesWeek != null) parts.push(`activity ${ls.activityMinutesWeek} min/week`);
  if (ls.tobacco) parts.push(`tobacco ${ls.tobacco}`);
  if (ls.alcohol) parts.push(`alcohol ${ls.alcohol}`);
  if (ls.stressLevel) parts.push(`stress ${ls.stressLevel}`);
  return parts.length ? `Lifestyle context: ${parts.join("; ")}.` : "";
}

/**
 * Defensive merge for the PHI-E2 integration window: engines.ts currently
 * ships a 2-arg generate() whose summary leaves medications / allergies /
 * recentVitals / relevantLabs / lifestyleContext empty. When the generator
 * HAS filled a section, its output is preserved untouched; only sections
 * that are still empty are back-filled from the subject-owned extra. Once
 * E2's 3-arg implementation lands, this becomes an inert no-op.
 */
export function mergeSummaryExtra(summary: ClinicianSummary, extra: SummaryExtra): ClinicianSummary {
  return {
    ...summary,
    medications: summary.medications.length > 0 ? summary.medications : extra.medications,
    allergies: summary.allergies.length > 0 ? summary.allergies : extra.allergies,
    recentVitals: summary.recentVitals.length > 0 ? summary.recentVitals : extra.recentVitals,
    relevantLabs: summary.relevantLabs.length > 0 ? summary.relevantLabs : extra.relevantLabs,
    lifestyleContext: summary.lifestyleContext.length > 0 ? summary.lifestyleContext : extra.lifestyleContext,
  };
}

const VITALS_IN_EXTRA = 5;

/**
 * Composes the optional 3rd argument for clinicianSummaryGenerator.generate
 * from rows already fetched and owned by the subject. Pure: sorting and
 * formatting only, no I/O.
 */
export function buildSummaryExtra(rows: SummarySourceRows): SummaryExtra {
  const vitalsDesc = [...rows.vitals].sort(
    (a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime()
  );

  const lifestyleLine = rows.lifestyle ? formatLifestyleLine(rows.lifestyle) : "";

  return {
    medications: rows.medications.map((m) =>
      [m.name, m.strength, m.frequency].filter((p): p is string => p != null && p.length > 0).join(" ")
    ),
    allergies: rows.allergies.map((a) =>
      [a.substance, a.reaction ? `reaction: ${a.reaction}` : null, a.severity && a.severity !== "unknown" ? `severity: ${a.severity}` : null]
        .filter((p): p is string => p != null)
        .join(" — ")
    ),
    recentVitals: vitalsDesc
      .slice(0, VITALS_IN_EXTRA)
      .map(formatVitalRow)
      .filter((s) => s.length > 0),
    relevantLabs: rows.labs.map(formatLabRow),
    lifestyleContext: lifestyleLine ? [lifestyleLine] : [],
    conditions: rows.conditions.map((c) => c.name),
  };
}
