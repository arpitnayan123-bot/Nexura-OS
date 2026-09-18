import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { PROMPT_VERSIONS, modelVersion } from "@/lib/nx/ai-governance";

/* AI confidence thresholds per feature (governance config). */

const UpsertSchema = z.object({
  entries: z
    .array(
      z.object({
        feature: z.string().min(2).max(60),
        minConfidence: z.number().min(0.1).max(1),
        requireReview: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(10),
});

export const GET = withRoute("ai.thresholds", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "audit.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const rows = await db.nxAiThreshold.findMany({ where: { hospitalId } });
  return ok(
    {
      thresholds: rows,
      defaults: { minConfidence: 0.6, requireReview: true },
      supportedFeatures: Object.keys(PROMPT_VERSIONS),
      promptVersions: PROMPT_VERSIONS,
      modelVersion: modelVersion(),
    },
    { requestId },
  );
});

export const POST = withRoute("ai.thresholds.upsert", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "security.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, UpsertSchema);
  if ("response" in body) return body.response;
  const saved: { id: string; feature: string; minConfidence: number; requireReview: boolean }[] =
    [];
  for (const e of body.data.entries) {
    saved.push(
      await db.nxAiThreshold.upsert({
        where: { hospitalId_feature: { hospitalId, feature: e.feature } },
        create: {
          hospitalId,
          feature: e.feature,
          minConfidence: e.minConfidence,
          requireReview: e.requireReview ?? true,
        },
        update: { minConfidence: e.minConfidence, requireReview: e.requireReview ?? true },
      }),
    );
  }
  return ok(saved, { requestId });
});
