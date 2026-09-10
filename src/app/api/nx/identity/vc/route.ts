import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { createHmac } from "crypto";
import { audit } from "@/lib/nx/audit";

/* ============================================================
   NEXURA OS v5 — DECENTRALIZED IDENTITY PoC (W3C VC-shaped)
   Patients own portable, verifiable health credentials. Signature
   is HMAC-SHA256 (PoC grade — production swaps in Ed25519/BBS+ via
   ABDM's issuer infrastructure without changing the envelope).
   Raw genotype/biometrics NEVER go into claims — minimal disclosure.
   ============================================================ */

function signClaims(claims: Record<string, unknown>): string {
  const secret = process.env.JWT_SECRET || "nexura-os-dev-secret-change-in-prod";
  return createHmac("sha256", secret).update(canonical(claims)).digest("hex");
}

function canonical(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

export const POST = withRoute("identity.vc.issue", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "consent.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, z.object({
    patientId: z.string().min(4),
    type: z.enum(["NexuraHealthID", "ImmunizationProof", "ConsentScope"]),
    extraClaims: z.record(z.string(), z.string().max(200)).optional(),
  }));
  if ("response" in body) return body.response;
  const patient = await db.hospitalPatient.findFirst({ where: { id: body.data.patientId, hospitalId } });
  if (!patient) return fail("unknown_patient", 404, undefined, requestId);
  const claims: Record<string, unknown> = {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    id: `did:nexura:${patient.uhid.toLowerCase()}`,
    type: body.data.type,
    issuer: `did:nexura:hospital:${hospitalId}`,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      name: patient.fullName,
      uhid: patient.uhid,
      bloodGroup: patient.bloodGroup,
      ...(body.data.extraClaims ?? {}),
    },
  };
  const vc = await db.nxVerifiableCredential.create({
    data: {
      hospitalId, patientId: patient.id, type: body.data.type,
      claimsJson: JSON.stringify(claims), issuerId: `did:nexura:hospital:${hospitalId}`,
      signature: signClaims(claims), holderHint: patient.phone?.slice(-4),
    },
  });
  await audit({ hospitalId, actorName: g.session.name, actorRole: g.session.role, action: "vc.issue", entityType: "nx_verifiable_credential", entityId: vc.id, patientId: patient.id });
  return ok({
    verifiableCredential: claims,
    proof: { type: "HmacSha256Proof2026", created: vc.issuedAt, verificationMethod: vc.issuerId, jws: vc.signature },
    note: "Patient-held credential — verify at any Nexura desk without central lookup.",
  }, { requestId, status: 201 });
});

export const GET = withRoute("identity.vc.verify", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const vcId = req.nextUrl.searchParams.get("id");
  if (!vcId) return fail("missing_id", 400, undefined, requestId);
  const vc = await db.nxVerifiableCredential.findUnique({ where: { id: vcId } });
  if (!vc) return fail("not_found", 404, undefined, requestId);
  if (vc.revokedAt) return ok({ valid: false, reason: "revoked", revokedAt: vc.revokedAt }, { requestId });
  const claims = JSON.parse(vc.claimsJson);
  const valid = signClaims(claims) === vc.signature;
  return ok({ valid, type: vc.type, issuer: vc.issuerId, issuedAt: vc.issuedAt, expiresAt: vc.expiresAt, subject: claims.credentialSubject }, { requestId });
});
