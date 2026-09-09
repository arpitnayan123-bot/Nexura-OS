import { NextRequest, NextResponse } from "next/server";
import { aiGate } from "@/lib/nx/ai-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/pharmacy/ai-query { query }
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    if (!query) return NextResponse.json({ error: "no_query" }, { status: 400 });

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: "You are a pharmacy BI assistant. The pharmacist asks natural language questions about their pharmacy. Answer concisely (2-3 sentences). If about expiring medicines, say 'Check the Expiry Management section in Settings'. If about outstanding dues, say 'Check the Customers section'. For sales/revenue, give a brief insight." },
        { role: "user", content: query },
      ],
      thinking: { type: "disabled" },
    });
    const text = completion.choices?.[0]?.message?.content?.trim() || "No data found";
    return NextResponse.json({ text, query });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "ai_query_failed", detail: message }, { status: 500 });
  }
}
