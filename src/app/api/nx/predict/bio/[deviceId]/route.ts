import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, parseBody, withRoute } from "@/lib/nx/api";
import { db } from "@/lib/db";
import { storeBioBatch } from "@/modules/pi-engine/db";

/* POST /api/nx/bio/[deviceId] — BioSignalIngestionEngine endpoint.
   Receives wearable JSON streams (HR, HRV, SpO2, sleep stages,
   glucose) from field devices. Device-keyed auth: the deviceId must
   exist as an NxWearableDevice; metrics are validated + cleansed
   before persistence. Returns the ingest report per metric. */

const SampleSchema = z.object({
  metric: z.enum(["heart_rate", "hrv", "spo2", "resp_rate", "temp", "glucose", "systolic", "diastolic", "sleep_stage", "steps", "weight"]),
  value: z.number().finite(),
  unit: z.string().max(16).optional(),
  quality: z.number().min(0).max(1).optional(),
  capturedAt: z.string().datetime().optional(),
});

const BatchSchema = z.object({
  patientId: z.string().max(64).optional(),
  samples: z.array(SampleSchema).min(1).max(500),
});

export const POST = withRoute<{ deviceId: string }>(
  "pie.bio.ingest",
  async (req: NextRequest, ctx) => {
    const { deviceId } = await ctx.params;
    const device = await db.nxWearableDevice.findUnique({ where: { id: deviceId } }).catch(() => null);
    if (!device) return ok({ error: "unknown_device" }, { status: 404 });
    const body = await parseBody(req, BatchSchema);
    if ("response" in body) return body.response;
    const report = await storeBioBatch({
      deviceId,
      patientId: body.data.patientId ?? (device as unknown as { patientId?: string }).patientId,
      samples: body.data.samples.map((s) => ({ ...s, capturedAt: s.capturedAt ?? new Date().toISOString() })),
    });
    return ok({ accepted: true, report }, { requestId: ctx.requestId });
  }
);

export const GET = withRoute<{ deviceId: string }>(
  "pie.bio.describe",
  async (_req: NextRequest, ctx) => {
    const { deviceId } = await ctx.params;
    return ok(
      {
        deviceId,
        protocol: "POST JSON { patientId?, samples: [{ metric, value, unit?, quality?, capturedAt? }] }",
        metrics: ["heart_rate", "hrv", "spo2", "resp_rate", "temp", "glucose", "systolic", "diastolic", "sleep_stage", "steps", "weight"],
        maxBatch: 500,
      },
      { requestId: ctx.requestId }
    );
  }
);
