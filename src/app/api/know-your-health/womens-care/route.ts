import { NextRequest, NextResponse } from "next/server";
import { runText, INDIA_PREAMBLE } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/know-your-health/womens-care
// body: { concern, age, cycleInfo, symptoms, pregnancyStatus }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const concern = typeof body?.concern === "string" ? body.concern.trim() : "";
    const symptoms = typeof body?.symptoms === "string" ? body.symptoms.trim() : "";
    if (!concern && !symptoms) return NextResponse.json({ error: "no_input" }, { status: 400 });

    const profile = {
      concern, age: Number(body?.age) || null,
      cycleInfo: String(body?.cycleInfo || ""),
      symptoms,
      pregnancyStatus: String(body?.pregnancyStatus || ""),
    };

    const prompt = `You are a warm, evidence-based women's health assistant for an Indian user. Provide informational guidance (not a diagnosis). Always consider Indian context.
Profile:
${JSON.stringify(profile, null, 2)}

Return STRICT JSON only:
{
  "assessment": "2-3 sentence careful summary of what might be happening",
  "possibleConditions": [
    { "name": "condition name", "note": "1 sentence why it could match" }
  ],
  "recommendations": ["practical action or lifestyle step"],
  "lifestyleTips": ["Indian-context lifestyle tip"],
  "whenToSeeDoctor": "1-2 sentence guidance on when to consult a gynaecologist",
  "pcosRiskScore": 0
}

Rules:
- pcosRiskScore 0-100 (only set when cycle / skin / weight symptoms are mentioned; otherwise 0).
- possibleConditions max 4.
- Be warm, non-alarmist, and respectful.
- For pregnancy-related concerns, always recommend antenatal care.
- No markdown. JSON only.`;

    const result = await runText<any>(prompt, INDIA_PREAMBLE);
    if (!result?.assessment) throw new Error("invalid_response");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "womens_care_failed", detail: message }, { status: 500 });
  }
}
