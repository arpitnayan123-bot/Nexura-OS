/** Consent self-service domain logic — shared by the portal consent API,
 *  the AI governance check, and the unit tests.
 *
 *  Semantics (latest-event-wins): for each consent type, the MOST RECENT
 *  consent row decides the current state. This is what makes revocation
 *  real: the historical "latest granted wins" read ignored withdrawn/denied
 *  rows entirely, so a withdrawn consent still authorized AI processing —
 *  a no-op revocation that no self-service UI could survive. */

export interface ConsentTypeMeta {
  type: string;
  label: string;
  purpose: string;
}

/** Types a patient may self-manage in the portal. Clinical/financial types
 *  (treatment, financial, dhir, genomics) stay staff-recorded — they are
 *  captured in person with evidence, not self-served. */
export const SELF_SERVICE_CONSENT_TYPES: ConsentTypeMeta[] = [
  {
    type: "ai_assist",
    label: "AI assistance in your care",
    purpose:
      "Let hospital staff use AI to help with your care — reading reports, drafting visit summaries, scanning prescriptions. Every AI output is reviewed by your care team; AI never acts on its own.",
  },
  {
    type: "data_share",
    label: "Care coordination",
    purpose:
      "Let your records be processed digitally so the doctors treating you see the same information — lab results, prescriptions, visit history.",
  },
  {
    type: "telemedicine",
    label: "Telemedicine",
    purpose:
      "Allow remote video or phone consultations with your doctors, including e-prescriptions where legally valid.",
  },
  {
    type: "research",
    label: "Research (de-identified)",
    purpose:
      "Allow your de-identified data to be used for medical research. Your name, phone and identifiers are never shared, and you can withdraw at any time.",
  },
];

export const SELF_SERVICE_TYPE_IDS = SELF_SERVICE_CONSENT_TYPES.map((t) => t.type);

/** Minimal row shape the resolver needs (subset of the NxConsent model). */
export interface ConsentRowLike {
  type: string;
  status: string; // granted | denied | withdrawn | expired
  grantedAt: Date;
  withdrawnAt: Date | null;
  expiresAt: Date | null;
}

export type ConsentState = "granted" | "not_granted" | "withdrawn" | "expired";

export interface ResolvedConsent {
  type: string;
  state: ConsentState;
  /** When the latest consent event for this type happened (null = never). */
  lastEventAt: Date | null;
  expiresAt: Date | null;
}

/** Resolve the current consent state for ONE type — latest event wins.
 *  Rows may come in any order; ties on grantedAt keep the caller's order
 *  (stable sort), so pass newest-first when it matters. */
export function resolveConsentState(
  rows: ConsentRowLike[],
  type: string,
  now: Date = new Date()
): ResolvedConsent {
  const relevant = rows
    .filter((r) => r.type === type)
    .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime());
  const latest = relevant[0];
  if (!latest) return { type, state: "not_granted", lastEventAt: null, expiresAt: null };
  const base = { type, lastEventAt: latest.grantedAt, expiresAt: latest.expiresAt };
  if (latest.status === "withdrawn") return { ...base, state: "withdrawn" };
  if (latest.status !== "granted") return { ...base, state: "not_granted" }; // denied or unknown
  if (latest.withdrawnAt) return { ...base, state: "withdrawn" }; // belt-and-braces: staff may edit rows in place
  if (latest.expiresAt && latest.expiresAt.getTime() <= now.getTime())
    return { ...base, state: "expired" };
  return { ...base, state: "granted" };
}

/** Resolve every self-service type at once, keyed by type. */
export function resolveAllConsentStates(
  rows: ConsentRowLike[],
  now: Date = new Date()
): Record<string, ResolvedConsent> {
  const out: Record<string, ResolvedConsent> = {};
  for (const meta of SELF_SERVICE_CONSENT_TYPES) {
    out[meta.type] = resolveConsentState(rows, meta.type, now);
  }
  return out;
}
