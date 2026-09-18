import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, guard, ok, parseBody, requireHospitalContext, withRoute } from "@/lib/nx/api";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { generateDeviceSecret, hashDeviceSecret } from "@/lib/nx/device-keys";

/* POST /api/nx/wearables/pair — backend device pairing (p2-hardening-1)
   Staff with `security.manage` pair or rotate a wearable device's
   ingest secret. The plaintext secret is returned EXACTLY ONCE in
   this response and shown once in the admin UI; only sha256(secret)
   is stored (NxWearableDevice.secretHash). The ingest route then
   requires `x-nx-signature: HMAC-SHA256(key=storedHash, deviceId +
   "." + rawBody)` on every batch. Nothing secret is ever logged. */

const PairSchema = z.object({
  deviceId: z.string().min(6).max(64),
  action: z.enum(["pair", "rotate"]).default("pair"),
});

export const POST = withRoute("nx.wearables.pair", async (req: NextRequest, ctx) => {
  const g = await guard(req, "security.manage");
  if ("response" in g) return g.response;
  // Hospital boundary: pairing/rotation is scoped to the caller's hospital —
  // no session hospital claim → fail closed (demo keeps its single-hospital
  // fallback via the canonical helper).
  const hctx = await requireHospitalContext(g.session);
  if ("response" in hctx) return hctx.response;
  const body = await parseBody(req, PairSchema);
  if ("response" in body) return body.response;

  const device = await db.nxWearableDevice.findUnique({ where: { id: body.data.deviceId } });
  // Ownership check: a device of ANOTHER hospital is indistinguishable from a
  // nonexistent one — rotating its secret would be a cross-tenant takeover.
  if (!device || device.hospitalId !== hctx.hospitalId) {
    return fail("unknown_device", 404, "No such device id.", ctx.requestId);
  }
  if (device.secretHash && body.data.action === "pair") {
    return fail(
      "already_paired",
      409,
      "Device already has a secret — use action:'rotate' to replace it.",
      ctx.requestId,
    );
  }

  const secret = generateDeviceSecret();
  await db.nxWearableDevice.update({
    where: { id: device.id },
    data: { secretHash: hashDeviceSecret(secret), pairedAt: new Date(), active: true },
  });

  // Tamper-evident audit trail — the secret itself is NEVER included.
  await audit({
    hospitalId: device.hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: body.data.action === "rotate" ? "device.rotate" : "device.pair",
    entityType: "NxWearableDevice",
    entityId: device.id,
    patientId: device.patientId,
    detail: { pairedBy: g.session.userId },
  }).catch(() => {});

  return ok(
    {
      deviceId: device.id,
      secret,
      note: "Shown once — store it in the device now. Only its SHA-256 hash is kept server-side.",
      protocol:
        "x-nx-signature: hex(HMAC-SHA256(key=sha256(secret), data=deviceId + '.' + rawBody))",
    },
    { requestId: ctx.requestId },
  );
});

export const GET = withRoute("nx.wearables.pair.describe", async (_req: NextRequest, ctx) => {
  return ok(
    {
      protocol: "POST { deviceId, action: 'pair' | 'rotate' } — requires security.manage",
      returns: "the device secret exactly once; only its hash is stored",
      ingest: "POST /api/nx/bio/[deviceId] with x-nx-signature per batch",
    },
    { requestId: ctx.requestId },
  );
});
