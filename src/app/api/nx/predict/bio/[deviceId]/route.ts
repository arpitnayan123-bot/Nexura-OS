import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, withRoute } from "@/lib/nx/api";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/env";
import { storeBioBatch } from "@/modules/pi-engine/db";
import { DEVICE_SIGNATURE_HEADER, verifyDeviceSignature } from "@/lib/nx/device-keys";

/* POST /api/nx/bio/[deviceId] — BioSignalIngestionEngine endpoint.
   Receives wearable JSON streams (HR, HRV, SpO2, sleep stages,
   glucose) from field devices.

   Device auth (backend-core-1): every batch must carry
   `x-nx-signature: hex(HMAC-SHA256(key: stored secretHash,
   data: deviceId + "." + rawBody))`. Devices paired with a
   secret are ALWAYS signature-verified (timing-safe). Legacy
   devices without a stored hash are accepted only in DEMO_MODE
   and rejected in production until re-paired. */

const SampleSchema = z.object({
  metric: z.enum([
    "heart_rate",
    "hrv",
    "spo2",
    "resp_rate",
    "temp",
    "glucose",
    "systolic",
    "diastolic",
    "sleep_stage",
    "steps",
    "weight",
  ]),
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
    // NOTE: signature covers the RAW body bytes — read text first,
    // then parse/validate. (parseBody would consume the stream.)
    const raw = await req.text();
    const device = await db.nxWearableDevice
      .findUnique({ where: { id: deviceId } })
      .catch(() => null);
    if (!device || !device.active) return fail("unknown_device", 404, undefined, ctx.requestId);

    if (device.secretHash) {
      const sig = req.headers.get(DEVICE_SIGNATURE_HEADER);
      if (!verifyDeviceSignature(device.secretHash, deviceId, raw, sig)) {
        return fail(
          "invalid_device_signature",
          401,
          "Missing or invalid x-nx-signature.",
          ctx.requestId,
        );
      }
    } else if (!isDemoMode()) {
      // Legacy unpaired device: tolerated in demo, never in production.
      return fail(
        "device_not_paired",
        401,
        "Device has no paired secret — re-pair to ingest.",
        ctx.requestId,
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return fail("invalid_json", 400, undefined, ctx.requestId);
    }
    const body = BatchSchema.safeParse(parsedJson);
    if (!body.success) {
      return fail("invalid_payload", 400, "Batch does not match the sample schema.", ctx.requestId);
    }

    const report = await storeBioBatch({
      deviceId,
      patientId: body.data.patientId ?? device.patientId,
      samples: body.data.samples.map((s) => ({
        ...s,
        capturedAt: s.capturedAt ?? new Date().toISOString(),
      })),
    });
    return ok({ accepted: true, report }, { requestId: ctx.requestId });
  },
);

export const GET = withRoute<{ deviceId: string }>(
  "pie.bio.describe",
  async (_req: NextRequest, ctx) => {
    const { deviceId } = await ctx.params;
    return ok(
      {
        deviceId,
        protocol:
          "POST JSON { patientId?, samples: [{ metric, value, unit?, quality?, capturedAt? }] }",
        auth: `x-nx-signature: hex(HMAC-SHA256(key=sha256(deviceSecret), data=deviceId + "." + rawBody))`,
        metrics: [
          "heart_rate",
          "hrv",
          "spo2",
          "resp_rate",
          "temp",
          "glucose",
          "systolic",
          "diastolic",
          "sleep_stage",
          "steps",
          "weight",
        ],
        maxBatch: 500,
      },
      { requestId: ctx.requestId },
    );
  },
);
