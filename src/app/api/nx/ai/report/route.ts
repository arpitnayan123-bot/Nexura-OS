import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { guard, ok, withRoute } from "@/lib/nx/api";

/* Daily AI performance report: accuracy proxy (feedback verdicts), override
   rate, confidence distribution, fail-safe activations — per feature. */

export const GET = withRoute("ai.report", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "audit.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  const since = new Date(Date.now() - 24 * 3600_000);
  const interactions = await db.nxAIInteraction.findMany({
    where: { hospitalId: hospitalId ?? undefined, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const feedback = await db.nxAiFeedback.findMany({
    where: { hospitalId: hospitalId ?? undefined, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const byFeature = new Map<string, { total: number; confSum: number; confN: number; fallbacks: number; blocked: number; failed: number }>();
  for (const i of interactions) {
    const f = byFeature.get(i.feature) ?? { total: 0, confSum: 0, confN: 0, fallbacks: 0, blocked: 0, failed: 0 };
    f.total += 1;
    if (typeof i.confidence === "number") { f.confSum += i.confidence; f.confN += 1; }
    if (i.thresholdAction === "human_fallback") f.fallbacks += 1;
    if (i.thresholdAction === "blocked") f.blocked += 1;
    if (i.status === "failed") f.failed += 1;
    byFeature.set(i.feature, f);
  }
  const verdictByInteraction = new Map<string, string>();
  for (const fb of feedback) verdictByInteraction.set(fb.interactionId, fb.verdict);
  const verdicts = { accepted: 0, corrected: 0, rejected: 0 };
  for (const v of verdictByInteraction.values()) {
    if (v === "accepted") verdicts.accepted += 1;
    else if (v === "corrected") verdicts.corrected += 1;
    else if (v === "rejected") verdicts.rejected += 1;
  }
  const reviewed = verdicts.accepted + verdicts.corrected + verdicts.rejected;
  const report = [...byFeature.entries()].map(([feature, f]) => ({
    feature,
    calls: f.total,
    avgConfidence: f.confN ? Number((f.confSum / f.confN).toFixed(2)) : null,
    humanFallbacks: f.fallbacks,
    blocked: f.blocked,
    failures: f.failed,
    overrideRatePct: reviewed ? Math.round(((verdicts.corrected + verdicts.rejected) / reviewed) * 100) : 0,
  }));
  return ok({
    windowHours: 24,
    totalCalls: interactions.length,
    reviewed,
    verdicts,
    reviewRatePct: interactions.length ? Math.round((reviewed / interactions.length) * 100) : 0,
    perFeature: report,
    governance: {
      confidenceHeuristic: "structured-output completeness (deterministic)",
      failSafe: "blocked below 0.7×threshold; human fallback below threshold",
      versionsTracked: true,
      consentGated: "patient-facing features check NxConsent (ai_assist/data_share)",
    },
    generatedAt: new Date().toISOString(),
  }, { requestId });
});
