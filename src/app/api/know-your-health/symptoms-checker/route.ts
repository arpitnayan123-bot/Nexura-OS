import { NextRequest, NextResponse } from "next/server";
import { runText, INDIA_PREAMBLE } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/know-your-health/symptoms-checker
// body: { symptoms: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const symptoms = typeof body?.symptoms === "string" ? body.symptoms.trim() : "";
    if (!symptoms) return NextResponse.json({ error: "no_symptoms" }, { status: 400 });
    if (symptoms.length < 3) return NextResponse.json({ error: "symptoms_too_short" }, { status: 400 });

    const prompt = `A person in India describes these symptoms:
"""
${symptoms}
"""

Act as a careful, conservative triage assistant. Return STRICT JSON only with this shape:
{
  "summary": "2-3 sentence plain-language summary of what the person may be experiencing",
  "urgency": "low" | "moderate" | "high" | "emergency",
  "possibleCauses": [
    { "condition": "name", "likelihood": "low|moderate|high", "note": "why this could match, 1 sentence" }
  ],
  "recommendedActions": ["practical next step 1", "next step 2"],
  "redFlags": ["warning sign that needs immediate care"],
  "specialty": "which Indian medical specialty to consult (e.g. General Physician, Cardiologist, ENT)",
  "disclaimer": "short reminder that this is not a diagnosis"
}

Rules:
- urgency "emergency" only when red-flag symptoms (chest pain, difficulty breathing, severe bleeding, stroke signs, suicidal ideation) are present.
- Use Indian English and Indian healthcare context.
- Max 5 possibleCauses, 5 redFlags, 6 recommendedActions.
- Do not invent diagnoses; if uncertain say so in summary.
- No markdown. JSON only.`;

    const result = await runText<any>(prompt, INDIA_PREAMBLE);
    if (!result || !result.urgency) throw new Error("invalid_response");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "symptoms_check_failed", detail: message }, { status: 500 });
  }
}
