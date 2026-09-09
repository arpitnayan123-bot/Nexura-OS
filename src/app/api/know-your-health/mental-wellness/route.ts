import { NextRequest, NextResponse } from "next/server";
import { runText, INDIA_PREAMBLE } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Input {
  phq9: number[]; // 9 items 0-3
  gad7: number[]; // 7 items 0-3
  notes?: string;
}

// POST /api/know-your-health/mental-wellness
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Input>;
    const phq9 = Array.isArray(body?.phq9) ? body.phq9 : [];
    const gad7 = Array.isArray(body?.gad7) ? body.gad7 : [];
    if (phq9.length !== 9 || gad7.length !== 7) return NextResponse.json({ error: "invalid_input", detail: "phq9 needs 9 items, gad7 needs 7 items" }, { status: 400 });

    // clinical scoring done server-side for reliability
    const phq9Score = phq9.reduce((a, b) => a + (Number(b) || 0), 0);
    const gad7Score = gad7.reduce((a, b) => a + (Number(b) || 0), 0);

    const phq9Level = phq9Score >= 20 ? "severe" : phq9Score >= 15 ? "moderately severe" : phq9Score >= 10 ? "moderate" : phq9Score >= 5 ? "mild" : "minimal";
    const gad7Level = gad7Score >= 15 ? "severe" : gad7Score >= 10 ? "moderate" : gad7Score >= 5 ? "mild" : "minimal";

    const prompt = `A person in India completed mental health screenings.
PHQ-9 score: ${phq9Score}/27 → ${phq9Level} depression severity.
GAD-7 score: ${gad7Score}/21 → ${gad7Level} anxiety severity.
Notes from user: "${(body?.notes || "").trim()}"

Provide a warm, non-alarmist reflection. Return STRICT JSON only:
{
  "phq9": { "score": 0, "level": "minimal|mild|moderate|moderately severe|severe", "interpretation": "1-2 sentence careful interpretation" },
  "gad7": { "score": 0, "level": "minimal|mild|moderate|severe", "interpretation": "1-2 sentence careful interpretation" },
  "summary": "2-3 sentence warm, supportive reflection (not a diagnosis)",
  "groundingExercises": ["specific grounding exercise — 5-4-3-2-1, box breathing, body scan, etc."],
  "recommendations": ["Indian-context lifestyle step — yoga, walk, talk to friend, journaling, etc."],
  "crisisResources": [
    { "name": "iCall", "phone": "9152987821", "hours": "Mon-Sat 8am-10pm" },
    { "name": "Vandrevala Foundation", "phone": "1860-2662-345", "hours": "24x7" },
    { "name": "AASRA", "phone": "9820466726", "hours": "24x7" }
  ],
  "whenToSeekHelp": "1-2 sentence guidance on when to seek professional help"
}

Rules:
- Never use phrases like "you are depressed" — speak probabilistically.
- Always include all 3 crisisResources as listed above.
- groundingExercises max 4, recommendations max 6.
- Be culturally appropriate and respectful.
- No markdown. JSON only.`;

    const result = await runText<any>(prompt, INDIA_PREAMBLE);
    // ensure crisis resources are always present even if model omits
    if (!result?.crisisResources || !Array.isArray(result.crisisResources) || result.crisisResources.length === 0) {
      result.crisisResources = [
        { name: "iCall", phone: "9152987821", hours: "Mon-Sat 8am-10pm" },
        { name: "Vandrevala Foundation", phone: "1860-2662-345", hours: "24x7" },
        { name: "AASRA", phone: "9820466726", hours: "24x7" },
      ];
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "mental_wellness_failed", detail: message }, { status: 500 });
  }
}
