import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { publish } from "@/lib/nx/bus";

/* Consumer wearable ingestion (Apple Health / WHOOP / Fitbit exports). */

const IngestSchema = z.object({
  patientId: z.string().min(4),
  source: z.enum(["apple_health", "whoop", "fitbit", "manual"]),
  model: z.string().max(60).optional(),
  samples: z.array(z.object({
    metric: z.enum(["hrv", "resting_hr", "spo2", "steps", "sleep_minutes"]),
    value: z.number().min(0).max(100000),
    unit: z.string().max(12).optional(),
    capturedAt: z.string().datetime(),
  })).min(1).max(200),
});

export const POST = withRoute("wearables.ingest", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, IngestSchema);
  if ("response" in body) return body.response;
  const patient = await db.hospitalPatient.findFirst({ where: { id: body.data.patientId, hospitalId } });
  if (!patient) return fail("unknown_patient", 404, undefined, requestId);
  let device = await db.nxWearableDevice.findFirst({ where: { hospitalId, patientId: patient.id, source: body.data.source, active: true } });
  if (!device) {
    device = await db.nxWearableDevice.create({ data: { hospitalId, patientId: patient.id, source: body.data.source, model: body.data.model } });
  }
  await db.nxWearableSample.createMany({
    data: body.data.samples.map((s) => ({ deviceId: device.id, metric: s.metric, value: s.value, unit: s.unit, capturedAt: new Date(s.capturedAt) })),
  });
  publish({ event: "wearable.ingested", hospitalId, toUsers: [g.session.userId], data: { patientId: patient.id, count: body.data.samples.length } });
  return ok({ accepted: body.data.samples.length, deviceId: device.id }, { requestId, status: 202 });
});
