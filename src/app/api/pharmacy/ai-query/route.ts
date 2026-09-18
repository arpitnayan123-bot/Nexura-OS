import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { aiGate } from "@/lib/nx/ai-guard";
import { withProductAuth } from "@/lib/nx/product-auth";
import { runTextRaw } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT =
  "You are a pharmacy BI assistant. The pharmacist asks natural language questions about their pharmacy. Answer concisely (2-3 sentences). If about expiring medicines, say 'Check the Expiry Management section in Settings'. If about outstanding dues, say 'Check the Customers section'. For sales/revenue, give a brief insight.";

// POST /api/pharmacy/ai-query { query }
async function POST_impl(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    if (!query) return NextResponse.json({ error: "no_query" }, { status: 400 });

    // Canonical AI client. runText (JSON-parsed) is deliberately NOT used
    // here: this route returns free-text prose and the client renders
    // `text` as a string, so a JSON parse would corrupt every answer —
    // runTextRaw keeps the { text, query } contract byte-identical.
    const text =
      (await runTextRaw(query, SYSTEM_PROMPT, "pharmacy.ai-query")).trim() || "No data found";
    return NextResponse.json({ text, query });
  } catch (err) {
    log.error("pharmacy", "ai_query_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "ai_query_failed", detail: "The AI query could not be processed. Please retry." },
      { status: 500 },
    );
  }
}

export const POST = withProductAuth("pharmacy.ai-query.POST", POST_impl);
