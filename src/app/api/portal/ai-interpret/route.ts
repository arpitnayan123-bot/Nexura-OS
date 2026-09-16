import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { aiGate } from "@/lib/nx/ai-guard";
import { getPortalCaller } from "@/lib/portal-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT =
  "You are Nexa AI, a clinical lab report interpreter for Indian patients. Analyze the lab values, identify abnormal results, explain in plain language, suggest next steps. Always include disclaimer. Use markdown. Under 300 words.";

interface LabTest {
  name: string;
  value: string;
  unit: string;
  refRange: string;
  flag: string;
  category: string;
}

/**
 * POST /api/portal/ai-interpret
 *   { bookingId }
 * Reads booking.reportJson, calls LLM (glm-4-plus via z-ai-web-dev-sdk).
 * Caching: if booking.aiInterpretation already exists, returns cached.
 * Fallback: rule-based summary if LLM fails.
 */
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const caller = await getPortalCaller();
    if (!caller) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const bookingId = body.bookingId;
    if (!bookingId) return NextResponse.json({ error: "bookingId is required" }, { status: 400 });

    const booking = await db.bloodBooking.findFirst({ where: { id: bookingId, userId: caller.id } });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (!booking.reportJson) return NextResponse.json({ error: "No report available for this booking yet" }, { status: 400 });

    // ---- Caching: return cached AI interpretation if exists ----
    if (booking.aiInterpretation) {
      return NextResponse.json({
        ok: true,
        interpretation: booking.aiInterpretation,
        cached: true,
        source: "cache",
      });
    }

    // parse report
    const report = JSON.parse(booking.reportJson) as { tests: LabTest[]; panelName: string; collectedAt?: string; reportedAt?: string };
    const tests = report.tests ?? [];

    // ---- Build user prompt with lab values ----
    const abnormals = tests.filter((t) => t.flag !== "normal");
    const testsBlock = tests
      .map(
        (t) =>
          `- ${t.name}: ${t.value} ${t.unit} (ref: ${t.refRange}) [${t.flag.toUpperCase()}] · ${t.category}`
      )
      .join("\n");

    const userPrompt = `Patient: 35-year-old Indian male
Panel: ${report.panelName}
Tests:
${testsBlock}

Abnormal results (${abnormals.length}):
${abnormals.length > 0 ? abnormals.map((t) => `- ${t.name}: ${t.value} ${t.unit} (ref: ${t.refRange}) — ${t.flag.toUpperCase()}`).join("\n") : "None — all values within normal range."}

Provide a clear, empathetic clinical interpretation in markdown. Under 300 words. End with a disclaimer line starting with "> ⚠️ Disclaimer:".`;

    // ---- Call GLM-4-Plus via z-ai-web-dev-sdk (server-side dynamic import) ----
    let interpretation = "";
    let source: "llm" | "rule-based" = "llm";
    try {
      const ZAIModule = await import("z-ai-web-dev-sdk");
      const ZAI = ZAIModule.default;
      const zai = await ZAI.create();

      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        // The SDK exposes glm-4-plus; if model param unsupported, it falls back
        model: "glm-4-plus",
        temperature: 0.4,
        max_tokens: 700,
      });

      interpretation =
        (completion as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content ??
        "";
    } catch (llmErr) {
      log.warn("portal", "ai_interpret_llm_fallback", { err: llmErr instanceof Error ? llmErr.message : String(llmErr) });
      source = "rule-based";
    }

    if (!interpretation || interpretation.trim().length < 20) {
      interpretation = buildRuleBased(report.panelName, tests);
      source = "rule-based";
    }

    // ---- Persist to booking.aiInterpretation ----
    await db.bloodBooking.update({
      where: { id: booking.id },
      data: { aiInterpretation: interpretation },
    });

    return NextResponse.json({ ok: true, interpretation, source, cached: false });
  } catch (err) {
    log.error("portal", "ai_interpret_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to generate AI interpretation" }, { status: 500 });
  }
}

/** Rule-based fallback used when LLM is unreachable. */
function buildRuleBased(panelName: string, tests: LabTest[]): string {
  const abnormals = tests.filter((t) => t.flag !== "normal");
  const summary: string[] = [];

  summary.push(`## 🩺 Nexa AI — Clinical Interpretation\n`);
  summary.push(`**Overall assessment:** ${abnormals.length === 0 ? "All values are within the normal range. No immediate clinical concerns." : `${abnormals.length} of ${tests.length} parameters are outside the reference range. Detailed findings below.`}\n`);

  if (abnormals.length > 0) {
    summary.push(`### ⚠️ Findings needing attention\n`);
    for (const a of abnormals) {
      const trend = a.flag === "high" ? "elevated" : a.flag === "low" ? "below normal" : a.flag;
      summary.push(`- **${a.name}** (${a.category}): ${a.value} ${a.unit} — ${trend}. Reference: ${a.refRange}.`);
    }
    summary.push("");
  }

  // category-grouped counts
  const byCat: Record<string, LabTest[]> = {};
  for (const t of tests) (byCat[t.category] ||= []).push(t);
  summary.push(`### 📋 Category summary\n`);
  for (const [cat, items] of Object.entries(byCat)) {
    const abnormalCount = items.filter((i) => i.flag !== "normal").length;
    summary.push(`- **${cat}** — ${items.length} tests, ${abnormalCount} abnormal.`);
  }

  summary.push(`\n### ✅ Recommended next steps`);
  summary.push(`1. Review this report with your physician within 7 days.`);
  summary.push(`2. Repeat abnormal tests in 4–6 weeks to confirm trends.`);
  summary.push(`3. Maintain hydration, regular sleep, and a balanced Indian diet.`);
  summary.push(`4. If symptoms persist (fever, fatigue, weight loss), seek in-person evaluation.`);

  summary.push(`\n> ⚠️ **Disclaimer:** This AI-generated summary is informational only and is **not a medical diagnosis**. Please consult a registered medical practitioner. Nexura AI does not replace clinical judgment. In an emergency, call 112.`);

  void panelName;
  return summary.join("\n");
}
