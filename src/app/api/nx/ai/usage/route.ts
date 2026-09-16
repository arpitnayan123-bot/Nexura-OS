import { NextRequest } from "next/server";
import { withRoute, ok, fail, guard } from "@/lib/nx/api";
import { aiUsageSummary } from "@/lib/ai-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   AI USAGE LEDGER — admin rollup over AiUsageLog.
   Who is allowed to see it: audit.view holders (auditor,
   hospital_admin+, super roles). Doctor/nurse roles are 403 —
   per-feature AI spend is operational/financial metadata.
   Honesty: cost numbers are ACCOUNTING ESTIMATES from the local
   price table unless the row's costSource is "provider"
   (OpenRouter usage.include reporting). Token counts follow the
   same rule via tokenSource. The response states this explicitly
   so nobody mistakes a rollup for a provider bill.
   ============================================================ */

export const GET = withRoute("nx.ai.usage", async (req: NextRequest) => {
  const g = await guard(req, "audit.view");
  if ("response" in g) return g.response;

  const daysRaw = Number(req.nextUrl.searchParams.get("days") || "30");
  const days = Number.isFinite(daysRaw) ? daysRaw : 30;

  try {
    const summary = await aiUsageSummary(days);
    return ok(summary, {
      requestId: g.requestId,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return fail("ai_usage_failed", 500, "Could not compute the AI usage rollup.", g.requestId);
  }
});
