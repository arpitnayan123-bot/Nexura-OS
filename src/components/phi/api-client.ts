/* ============================================================
 * PHI — typed API client (browser side)
 * Codes against the fixed /api/nx/phi contract:
 *   { ok: true, data: T } | { ok: false, error: string, code: string }
 * Every failure becomes a PhiApiError{code, error} — the UI can
 * branch on `code` (consent_required, kill_switch, minor_not_supported,
 * network, unavailable…) and always renders calm retry states.
 * ============================================================ */

"use client";

import type {
  ClinicianSummary,
  ConsentState,
  IntakeBucket,
  PredictiveHealthAssessment,
  SessionPayload,
  TrendObservation,
} from "@/modules/phi/contracts";

/* ---------------- Errors ---------------- */

export class PhiApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "PhiApiError";
    this.code = code;
    this.status = status;
  }
}

type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string; code: string };

async function phiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new PhiApiError("Network unreachable", "network", 0);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null; // non-JSON (HTML error page, empty body, proxy notice…)
  }

  if (
    body !== null &&
    typeof body === "object" &&
    "ok" in (body as Record<string, unknown>)
  ) {
    const env = body as ApiEnvelope<T>;
    if (env.ok === true) return env.data;
    throw new PhiApiError(
      (env as { error?: string }).error || "Request failed",
      (env as { code?: string }).code || "error",
      res.status
    );
  }

  if (res.status === 404) {
    throw new PhiApiError("Health service not available", "unavailable", 404);
  }
  if (!res.ok) {
    throw new PhiApiError(`Request failed (${res.status})`, "http_error", res.status);
  }
  throw new PhiApiError("Unexpected response shape", "unavailable", res.status);
}

function jsonBody(payload: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(payload) };
}

/**
 * The API validates strict optionals: absent keys are fine, explicit
 * nulls are rejected. Strip null/undefined/blank values before sending.
 */
function stripNullable(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    out[key] = value;
  }
  return out;
}

/** GET/PUT /profile wrap the row as { profile: {...} } — unwrap tolerantly. */
function unwrapProfile(data: unknown): PhiProfile {
  if (data !== null && typeof data === "object" && "profile" in (data as object)) {
    const inner = (data as { profile?: unknown }).profile;
    if (inner !== null && typeof inner === "object") return inner as PhiProfile;
  }
  if (data === null || typeof data !== "object") return { ...EMPTY_PROFILE };
  return data as PhiProfile;
}

/* ---------------- Domain types (client view) ---------------- */

export type PhiSexAtBirth = "male" | "female" | "intersex" | "undisclosed";

export type PhiProfile = {
  ageYears: number | null;
  sexAtBirth: PhiSexAtBirth | null;
  pregnancyPossibility: boolean;
  heightCm: number | null;
  weightKg: number | null;
  waistCm: number | null;
  languagePref: "en" | "hi";
  dietaryPref: string | null;
  cuisine: string | null;
  activityLevel: string | null;
  occupation: string | null;
  shiftWork: boolean;
  accessibilityNotes: string | null;
};

export const EMPTY_PROFILE: PhiProfile = {
  ageYears: null,
  sexAtBirth: null,
  pregnancyPossibility: false,
  heightCm: null,
  weightKg: null,
  waistCm: null,
  languagePref: "en",
  dietaryPref: null,
  cuisine: null,
  activityLevel: null,
  occupation: null,
  shiftWork: false,
  accessibilityNotes: null,
};

/** Any saved intake row — kept loose; every accessor must be defensive. */
export type PhiIntakeRecord = {
  id: string;
  bucket?: string;
  savedAt?: string;
  createdAt?: string;
} & Record<string, unknown>;

export type PhiHistoryItem = {
  id: string;
  urgency: string;
  triageOnly: boolean;
  dataCompleteness: number;
  createdAt: string;
};

export type PhiAuditEntry = {
  id?: string;
  action: string;
  resource?: string;
  outcome?: string;
  createdAt?: string;
};

export type PhiShareResult = { token: string; expiresAt: string };

export type PhiStatusPayload = {
  killSwitch: boolean;
  engineVersion: string;
  rulesetVersion: string;
  contentVersion: string;
  demo: true;
};

/* ---------------- Session ---------------- */

export async function createSession(): Promise<SessionPayload> {
  return phiFetch<SessionPayload>("/api/nx/phi/session", jsonBody({}));
}

export async function getSession(): Promise<SessionPayload> {
  return phiFetch<SessionPayload>("/api/nx/phi/session");
}

/* ---------------- Consent ---------------- */

export async function getConsent(): Promise<ConsentState> {
  return phiFetch<ConsentState>("/api/nx/phi/consent");
}

export async function putConsent(
  scope: string,
  granted: boolean
): Promise<ConsentState> {
  return phiFetch<ConsentState>("/api/nx/phi/consent", {
    method: "PUT",
    body: JSON.stringify({ scope, granted }),
  });
}

/* ---------------- Profile ---------------- */

export async function getProfile(): Promise<PhiProfile> {
  return unwrapProfile(await phiFetch<unknown>("/api/nx/phi/profile"));
}

export async function putProfile(
  partial: Partial<PhiProfile>
): Promise<PhiProfile> {
  return unwrapProfile(
    await phiFetch<unknown>("/api/nx/phi/profile", {
      method: "PUT",
      body: JSON.stringify(stripNullable(partial as Record<string, unknown>)),
    })
  );
}

/* ---------------- Intake buckets ----------------
 * GET is written tolerantly: data may be an array or { items: [...] }.
 * ---------------- */

function coerceItems(data: unknown): PhiIntakeRecord[] {
  if (Array.isArray(data)) return data as PhiIntakeRecord[];
  if (data && typeof data === "object") {
    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) return items as PhiIntakeRecord[];
  }
  return [];
}

export async function getIntake(bucket: IntakeBucket): Promise<PhiIntakeRecord[]> {
  try {
    return coerceItems(await phiFetch<unknown>(`/api/nx/phi/intake/${bucket}`));
  } catch (err) {
    // A missing/empty bucket is normal for a fresh subject — treat as empty.
    if (err instanceof PhiApiError && (err.code === "unavailable" || err.status === 404)) {
      return [];
    }
    throw err;
  }
}

export async function postIntake(
  bucket: IntakeBucket,
  payload: Record<string, unknown>
): Promise<{ id: string; bucket: string; savedAt: string }> {
  return phiFetch(`/api/nx/phi/intake/${bucket}`, jsonBody(stripNullable(payload)));
}

/** DELETE /intake/:bucket?id=… — removes one saved row (ownership enforced server-side). */
export async function deleteIntake(bucket: IntakeBucket, id: string): Promise<void> {
  await phiFetch<unknown>(
    `/api/nx/phi/intake/${bucket}?id=${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

/* ---------------- Assessment ---------------- */

export async function runAssessment(): Promise<PredictiveHealthAssessment> {
  const data = await phiFetch<{ assessment: PredictiveHealthAssessment }>(
    "/api/nx/phi/assessment/run",
    jsonBody({})
  );
  return data.assessment;
}

export async function getAssessmentHistory(): Promise<PhiHistoryItem[]> {
  const data = await phiFetch<{ items?: PhiHistoryItem[] }>("/api/nx/phi/assessment");
  return Array.isArray(data) ? data : (data?.items ?? []);
}

export async function getAssessment(
  id: string
): Promise<PredictiveHealthAssessment> {
  const data = await phiFetch<{ assessment: PredictiveHealthAssessment }>(
    `/api/nx/phi/assessment/${id}`
  );
  return data.assessment;
}

/* ---------------- Trends ---------------- */

export async function getTrends(): Promise<TrendObservation[]> {
  const data = await phiFetch<{ trends?: TrendObservation[] }>("/api/nx/phi/trends");
  return Array.isArray(data) ? data : (data?.trends ?? []);
}

/* ---------------- Clinician summary & sharing ---------------- */

export async function createSummary(assessmentId: string): Promise<ClinicianSummary> {
  return phiFetch<ClinicianSummary>("/api/nx/phi/summary", jsonBody({ assessmentId }));
}

export async function createShareLink(payload: {
  includes: string[];
  dateFrom?: string;
  dateTo?: string;
  expiresInDays: number;
}): Promise<PhiShareResult> {
  return phiFetch<PhiShareResult>("/api/nx/phi/share", jsonBody(payload));
}

export async function revokeShareLink(token: string): Promise<void> {
  await phiFetch<unknown>(`/api/nx/phi/share?token=${encodeURIComponent(token)}`, {
    method: "DELETE",
  });
}

/* ---------------- Feedback, export, data rights ---------------- */

export async function postFeedback(payload: {
  kind: string;
  message?: string;
}): Promise<void> {
  await phiFetch<unknown>("/api/nx/phi/feedback", jsonBody(payload));
}

/** Browser download — navigated directly (the route streams a file). */
export const PHI_EXPORT_URL = "/api/nx/phi/export";
export const PHI_DATA_DELETE_URL = "/api/nx/phi/data";

export async function deleteAllData(): Promise<void> {
  await phiFetch<unknown>(PHI_DATA_DELETE_URL, { method: "DELETE" });
}

/* ---------------- Status & audit ---------------- */

export async function getStatus(): Promise<PhiStatusPayload> {
  return phiFetch<PhiStatusPayload>("/api/nx/phi/status");
}

export async function getAudit(): Promise<PhiAuditEntry[]> {
  try {
    const data = await phiFetch<unknown>("/api/nx/phi/audit");
    return coerceItems(data) as PhiAuditEntry[];
  } catch (err) {
    if (err instanceof PhiApiError && (err.code === "unavailable" || err.status === 404)) {
      return [];
    }
    throw err;
  }
}
