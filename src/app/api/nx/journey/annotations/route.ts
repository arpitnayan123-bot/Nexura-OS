import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";

/* Collaborative annotations & decision logs on the visual care journey. */

const CreateSchema = z.object({
  patientId: z.string().min(4),
  eventRef: z.string().max(80).optional(),
  body: z.string().min(2).max(2000),
  decisionLog: z.boolean().optional(),
});

export const GET = withRoute("journey.annotations", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return fail("missing_patient", 400, undefined, requestId);
  const rows = await db.nxJourneyAnnotation.findMany({
    where: { hospitalId, patientId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return ok(rows, { requestId });
});

export const POST = withRoute("journey.annotations.create", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, CreateSchema);
  if ("response" in body) return body.response;
  const patient = await db.hospitalPatient.findFirst({ where: { id: body.data.patientId, hospitalId } });
  if (!patient) return fail("unknown_patient", 404, undefined, requestId);
  const row = await db.nxJourneyAnnotation.create({
    data: {
      hospitalId,
      patientId: patient.id,
      eventRef: body.data.eventRef,
      body: body.data.body,
      decisionLog: body.data.decisionLog ?? false,
      authorName: g.session.name,
      authorRole: g.session.role,
    },
  });
  return ok(row, { requestId, status: 201 });
});
