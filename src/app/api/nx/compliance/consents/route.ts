import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";

/* Consent dashboard (DPDP/GDPR article): capture, list, summarize. */

const CaptureSchema = z.object({
  patientId: z.string().min(4),
  type: z.string().min(2).max(60), // treatment|data_share|research|telemedicine|dhir|financial|ai_assist|genomics
  granted: z.boolean(),
  scope: z.string().max(300).optional(),
  channel: z.enum(["in_person", "portal", "whatsapp", "verbal_witnessed"]).optional(),
});

export const GET = withRoute("compliance.consents", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "consent.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const [recent, byType] = await Promise.all([
    db.nxConsent.findMany({
      where: { hospitalId },
      orderBy: { grantedAt: "desc" },
      take: 50,
    }),
    db.nxConsent
      .groupBy({
        by: ["type"],
        where: { hospitalId },
        _count: { _all: true },
      })
      .catch(() => [] as { type: string; _count: { _all: number } }[]),
  ]);
  const grantedCount = await db.nxConsent.count({ where: { hospitalId, status: "granted" } });
  const totalAll = await db.nxConsent.count({ where: { hospitalId } });
  return ok(
    {
      recent,
      summary: byType.map((t) => ({
        type: t.type,
        total: t._count._all,
      })),
      total: totalAll,
      grantedPct: totalAll ? Math.round((grantedCount / totalAll) * 100) : 0,
    },
    { requestId },
  );
});

export const POST = withRoute(
  "compliance.consents.capture",
  async (req: NextRequest, { requestId }) => {
    const g = await guard(req, "consent.manage");
    if ("response" in g) return g.response;
    const hospitalId = g.session.hospitalId;
    if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
    const body = await parseBody(req, CaptureSchema);
    if ("response" in body) return body.response;
    const patient = await db.hospitalPatient.findFirst({
      where: { id: body.data.patientId, hospitalId },
    });
    if (!patient) return fail("unknown_patient", 404, undefined, requestId);
    const consent = await db.nxConsent.create({
      data: {
        hospitalId,
        patientId: patient.id,
        patientUhid: patient.uhid,
        type: body.data.type,
        status: body.data.granted ? "granted" : "denied",
        scope: body.data.scope,
        note: body.data.channel ? `channel: ${body.data.channel}` : undefined,
        recordedBy: g.session.name,
      },
    });
    await audit({
      hospitalId,
      actorName: g.session.name,
      actorRole: g.session.role,
      action: "consent.capture",
      entityType: "nx_consent",
      entityId: consent.id,
      patientId: patient.id,
      detail: { type: body.data.type, granted: body.data.granted },
    });
    return ok(consent, { requestId, status: 201 });
  },
);
