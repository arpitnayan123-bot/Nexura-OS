import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getPortalUser } from "@/lib/portal-session";
import { withRoute, ok, fail, parseBody } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";
import {
  SELF_SERVICE_CONSENT_TYPES,
  SELF_SERVICE_TYPE_IDS,
  resolveAllConsentStates,
} from "@/lib/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   PORTAL CONSENT SELF-SERVICE (DPDP 2023) — patients manage their
   own consents: view current state, grant, withdraw.
   - Scoped to the signed portal session; the caller can only ever
     touch the hospital patient linked to THEIR portal user (UHID).
   - Append-only ledger: every grant/withdraw inserts a new NxConsent
     row (recordedBy marks it as portal self-service) — nothing is
     ever mutated, so the compliance view keeps the full story.
   - Withdrawal is EFFECTIVE immediately: checkAiConsent resolves
     latest-event-wins, so the newest row decides.
   - Only SELF_SERVICE_CONSENT_TYPES are self-serviceable; clinical/
     financial consent types stay staff-recorded with evidence.
   ============================================================ */

const SelfServiceSchema = z.object({
  type: z.enum(SELF_SERVICE_TYPE_IDS as [string, ...string[]]),
  action: z.enum(["grant", "withdraw"]),
  /** Optional patient-entered scope note (what they think they are allowing). */
  note: z.string().max(300).optional(),
});

async function resolveLinkedPatient(uhid: string | null) {
  if (!uhid) return null;
  return db.hospitalPatient.findFirst({
    where: { uhid },
    select: { id: true, hospitalId: true, uhid: true, fullName: true },
  });
}

export const GET = withRoute("portal.consent.list", async () => {
  const user = await getPortalUser({ id: true, fullName: true, hospitalPatientUhid: true });
  if (!user) return fail("unauthenticated", 401, "Sign in to manage your consents.");

  const patient = await resolveLinkedPatient(user.hospitalPatientUhid);
  if (!patient) {
    return ok({
      linked: false,
      types: SELF_SERVICE_CONSENT_TYPES.map((t) => ({ ...t, state: "not_granted" as const, lastEventAt: null, expiresAt: null })),
      history: [],
      detail: "Self-service consent needs a linked hospital record. Visit the front desk to link your UHID.",
    });
  }

  const rows = await db.nxConsent.findMany({
    where: { patientId: patient.id },
    orderBy: { grantedAt: "desc" },
    take: 100,
  });
  const states = resolveAllConsentStates(rows);

  return ok({
    linked: true,
    patient: { uhid: patient.uhid, fullName: patient.fullName },
    types: SELF_SERVICE_CONSENT_TYPES.map((t) => ({
      ...t,
      state: states[t.type]?.state ?? "not_granted",
      lastEventAt: states[t.type]?.lastEventAt ?? null,
      expiresAt: states[t.type]?.expiresAt ?? null,
    })),
    history: rows.slice(0, 15).map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      recordedBy: r.recordedBy,
      grantedAt: r.grantedAt,
      withdrawnAt: r.withdrawnAt,
      expiresAt: r.expiresAt,
    })),
  });
});

export const POST = withRoute("portal.consent.update", async (req: NextRequest) => {
  const user = await getPortalUser({ id: true, fullName: true, hospitalPatientUhid: true });
  if (!user) return fail("unauthenticated", 401, "Sign in to manage your consents.");

  const body = await parseBody(req, SelfServiceSchema);
  if ("response" in body) return body.response;
  const { type, action, note } = body.data;

  const patient = await resolveLinkedPatient(user.hospitalPatientUhid);
  if (!patient) {
    return fail("not_linked", 409, "Self-service consent needs a linked hospital record. Visit the front desk to link your UHID.");
  }

  const consent = await db.nxConsent.create({
    data: {
      hospitalId: patient.hospitalId,
      patientId: patient.id,
      patientUhid: patient.uhid,
      type,
      status: action === "grant" ? "granted" : "withdrawn",
      scope: note,
      note: "channel: portal self-service",
      recordedBy: `self-service:portal (${user.fullName})`,
      withdrawnAt: action === "withdraw" ? new Date() : null,
    },
  });

  await audit({
    hospitalId: patient.hospitalId,
    actorName: `portal:${user.fullName}`,
    actorRole: "patient",
    action: "consent.self_service",
    entityType: "nx_consent",
    entityId: consent.id,
    patientId: patient.id,
    detail: { type, action, channel: "portal" },
  }).catch(() => null);

  return ok({
    id: consent.id,
    type,
    action,
    state: action === "grant" ? "granted" : "withdrawn",
    at: consent.grantedAt,
  }, { status: 201 });
});
