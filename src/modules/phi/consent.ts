import "server-only";
import { db } from "@/lib/db";
import {
  CONSENT_SCOPES,
  REQUIRED_FOR_ASSESSMENT,
  type ConsentScope,
  type ConsentState,
} from "./contracts";
import { phiAudit } from "./audit";

/* ============================================================
   NEXURA PHI — CONSENT SERVICE
   Consent is OPT-IN per scope. A missing consent row means NOT
   granted. Withdrawal propagates immediately: once a scope is
   revoked, dependent endpoints refuse to serve or process data.
   ============================================================ */

export async function getConsentState(subjectId: string): Promise<ConsentState> {
  const rows = await db.phiConsent.findMany({ where: { subjectId } });
  const scopes = Object.fromEntries(CONSENT_SCOPES.map((s) => [s, false])) as Record<ConsentScope, boolean>;
  for (const row of rows) {
    if ((CONSENT_SCOPES as readonly string[]).includes(row.scope)) {
      scopes[row.scope as ConsentScope] = row.granted;
    }
  }
  const latest = rows.reduce<string | null>((acc, r) => {
    const t = r.updatedAt.toISOString();
    return !acc || t > acc ? t : acc;
  }, null);
  return { scopes, updatedAt: latest ?? new Date().toISOString() };
}

export async function setConsent(
  subjectId: string,
  scope: ConsentScope,
  granted: boolean
): Promise<ConsentState> {
  await db.phiConsent.upsert({
    where: { subjectId_scope: { subjectId, scope } },
    create: { subjectId, scope, granted },
    update: { granted },
  });

  await phiAudit.record({
    subjectId,
    action: granted ? "consent.granted" : "consent.withdrawn",
    resource: `consent:${scope}`,
    outcome: "ok",
  });

  // Revocation propagation: withdrawing a dependent scope cascades.
  if (!granted) await propagateWithdrawal(subjectId, scope);

  return getConsentState(subjectId);
}

async function propagateWithdrawal(subjectId: string, scope: ConsentScope): Promise<void> {
  // health_profile or assessment withdrawn -> assessments can no longer run;
  // trends withdrawn -> trend analysis suppressed on next run.
  // Stored data is retained until the user explicitly requests deletion
  // (separate /api/nx/phi/data DELETE flow) — withdrawal only stops processing.
  if (scope === "health_profile" || scope === "assessment") {
    await phiAudit.record({
      subjectId,
      action: "consent.propagation",
      resource: "assessment_blocked",
      outcome: "ok",
      meta: { reason: scope },
    });
  }
}

export function hasRequiredConsent(state: ConsentState): boolean {
  return REQUIRED_FOR_ASSESSMENT.every((s) => state.scopes[s]);
}

/** Route-guard helper: returns an error string when the scope is not granted. */
export async function requireScope(subjectId: string, scope: ConsentScope): Promise<string | null> {
  const state = await getConsentState(subjectId);
  if (!state.scopes[scope]) {
    await phiAudit.record({
      subjectId,
      action: "consent.denied",
      resource: `scope:${scope}`,
      outcome: "denied",
    });
    return `consent_scope_not_granted:${scope}`;
  }
  return null;
}
