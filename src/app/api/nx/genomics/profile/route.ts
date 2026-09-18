import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";

/* Genomic vault integration: raw genotype stays in the partner vault;
   Nexura stores only the vault pointer + derived variant annotations.
   Risk profiling = deterministic scoring over variant classes. */

const ComputeSchema = z.object({
  patientId: z.string().min(4),
  variants: z
    .array(
      z.object({
        gene: z.string().min(1).max(20),
        variant: z.string().max(60),
        zygosity: z.enum(["heterozygous", "homozygous", "-"]),
        classpath: z.enum(["pharmacogenomics", "carrier", "pathogenic", "negative", "risk-allele"]),
      }),
    )
    .min(1)
    .max(60),
  familyHistory: z
    .array(z.enum(["cardiac", "diabetes", "cancer", "mental_health", "none"]))
    .max(6)
    .default([]),
});

const CLASS_WEIGHT: Record<string, number> = {
  pathogenic: 0.35,
  "risk-allele": 0.15,
  carrier: 0.1,
  pharmacogenomics: 0.05,
  negative: 0,
};
const FH_WEIGHT: Record<string, number> = {
  cardiac: 0.15,
  diabetes: 0.12,
  cancer: 0.15,
  mental_health: 0.08,
  none: 0,
};

export const GET = withRoute("genomics.profile.get", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.restricted.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return fail("missing_patient", 400, undefined, requestId);
  const profile = await db.nxGenomicProfile.findFirst({
    where: { hospitalId, patientId },
    orderBy: { createdAt: "desc" },
  });
  return ok(
    {
      profile,
      governance: {
        vaultOnly: "raw genotype never leaves the partner vault",
        consentRequired: "genomics consent must be granted before computation",
        standards: "GDPR art.9 / DPDP sensitive-personal-data / HIPAA GINA",
      },
    },
    { requestId },
  );
});

export const POST = withRoute(
  "genomics.profile.compute",
  async (req: NextRequest, { requestId }) => {
    const g = await guard(req, "patient.restricted.view");
    if ("response" in g) return g.response;
    const hospitalId = g.session.hospitalId;
    if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
    const body = await parseBody(req, ComputeSchema);
    if ("response" in body) return body.response;
    const patient = await db.hospitalPatient.findFirst({
      where: { id: body.data.patientId, hospitalId },
    });
    if (!patient) return fail("unknown_patient", 404, undefined, requestId);
    const consent = await db.nxConsent.findFirst({
      where: {
        hospitalId,
        patientId: patient.id,
        type: { in: ["genomics", "data_share"] },
        status: "granted",
      },
    });
    if (!consent) {
      return fail(
        "consent_required",
        403,
        "Genomic computation requires explicit patient consent (capture via /api/nx/compliance/consents).",
        requestId,
      );
    }
    const pathogenic = body.data.variants.filter((v) => v.classpath === "pathogenic").length;
    const carriers = body.data.variants.filter((v) => v.classpath === "carrier").length;
    const riskAlleles = body.data.variants.filter((v) => v.classpath === "risk-allele").length;
    const fhScore = body.data.familyHistory.reduce((s, h) => s + (FH_WEIGHT[h] ?? 0), 0);
    const risk = {
      monogenic: Number(Math.min(1, pathogenic * 0.4).toFixed(2)),
      carrierStatus: carriers > 0,
      polygenicProxy: Number(Math.min(1, riskAlleles * 0.12 + fhScore).toFixed(2)),
      pharmacogenomics: body.data.variants
        .filter((v) => v.classpath === "pharmacogenomics")
        .map((v) => `${v.gene} ${v.variant}`),
    };
    const vaultRef = `vault://genomics/${patient.id.slice(0, 12)}-${Date.now().toString(36)}`;
    const profile = await db.nxGenomicProfile.create({
      data: {
        hospitalId,
        patientId: patient.id,
        vaultRef,
        variantsJson: JSON.stringify(body.data.variants),
        riskJson: JSON.stringify(risk),
        consentId: consent.id,
      },
    });
    await audit({
      hospitalId,
      actorName: g.session.name,
      actorRole: g.session.role,
      action: "genomics.risk.compute",
      entityType: "nx_genomic_profile",
      entityId: profile.id,
      patientId: patient.id,
      detail: { vaultRef },
    });
    return ok(
      {
        profileId: profile.id,
        vaultRef,
        risk,
        disclaimer:
          "Derived risk signals require clinical genetics interpretation before any patient communication.",
      },
      { requestId, status: 201 },
    );
  },
);
