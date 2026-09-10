import { NextRequest } from "next/server";
import { z } from "zod";
import { guard, ok, parseBody, withRoute } from "@/lib/nx/api";
import { db } from "@/lib/db";
import { federatedAverage, sanitizeOutgoingDelta, validateDeltaPrivacy } from "@/modules/pi-engine/federation/federated";

/* GET  /api/nx/predict/federation — global model versions + stats.
   POST — tenant submits a privacy-sanitized weight delta; when ≥2
   unaggregated deltas exist for a model, the Nexus aggregates
   (FedAvg) and bumps the global version. No patient data ever
   crosses the tenant boundary — deltas only, DP-clipped. */

const DeltaSchema = z.object({
  tenantId: z.string().min(1).max(64),
  modelId: z.enum(["sepsis_early_warning", "readmission_trajectory", "chronic_organ_decay"]),
  versionBase: z.string().max(24),
  weights: z.record(z.string(), z.number().finite()),
  samples: z.number().int().positive().max(10_000_000),
  loss: z.number().finite().optional(),
});

export const GET = withRoute("pie.federation.get", async (req: NextRequest) => {
  const g = await guard(req, "settings.manage");
  if ("response" in g) return g.response;
  const pending = await db.pieFederatedUpdate.findMany({ where: { aggregated: false }, take: 50, orderBy: { uploadedAt: "desc" } });
  const recent = await db.pieFederatedUpdate.findMany({ where: { aggregated: true }, take: 20, orderBy: { uploadedAt: "desc" } });
  return ok(
    {
      pendingDeltas: pending.length,
      recentAggregations: recent.map((r) => ({ modelId: r.modelId, versionNew: r.versionNew, samples: r.samples, uploadedAt: r.uploadedAt })),
    },
    { requestId: g.requestId }
  );
});

export const POST = withRoute("pie.federation.submit", async (req: NextRequest) => {
  const g = await guard(req, "settings.manage");
  if ("response" in g) return g.response;
  const body = await parseBody(req, DeltaSchema);
  if ("response" in body) return body.response;
  const d = body.data;

  const privacy = validateDeltaPrivacy({ ...d, versionNew: d.versionBase });
  if (!privacy.ok) return ok({ rejected: true, reason: privacy.reason }, { requestId: g.requestId, status: 422 });

  const sanitized = sanitizeOutgoingDelta(d.weights);
  await db.pieFederatedUpdate.create({
    data: {
      tenantId: d.tenantId,
      modelId: d.modelId,
      versionBase: d.versionBase,
      versionNew: d.versionBase,
      deltaJson: JSON.stringify(sanitized),
      samples: d.samples,
      loss: d.loss ?? null,
    },
  });

  const unaggregated = await db.pieFederatedUpdate.findMany({ where: { modelId: d.modelId, aggregated: false } });
  if (unaggregated.length >= 2) {
    const deltas = unaggregated.map((r) => ({
      tenantId: r.tenantId,
      modelId: r.modelId,
      versionBase: r.versionBase,
      versionNew: r.versionBase,
      weights: JSON.parse(r.deltaJson || "{}") as Record<string, number>,
      samples: r.samples,
    }));
    const global = federatedAverage(d.modelId, deltas, d.versionBase);
    if (global) {
      await db.pieFederatedUpdate.updateMany({ where: { modelId: d.modelId, aggregated: false }, data: { aggregated: true } });
      return ok({ accepted: true, aggregated: true, global }, { requestId: g.requestId });
    }
  }
  return ok({ accepted: true, aggregated: false, waitingFor: 2 - unaggregated.length }, { requestId: g.requestId });
});
