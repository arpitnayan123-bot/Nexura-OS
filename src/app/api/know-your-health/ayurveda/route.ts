import { NextRequest, NextResponse } from "next/server";
import { runText, INDIA_PREAMBLE } from "@/lib/gemini";
import { aiGate } from "@/lib/nx/ai-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/know-your-health/ayurveda
// body: { answers: string[] }  // 20 answers, each from {a,b,c} mapped to V/P/K
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = await req.json().catch(() => ({}));
    const answers = Array.isArray(body?.answers) ? body.answers : [];
    if (answers.length !== 20) return NextResponse.json({ error: "needs_20_answers", detail: `Expected 20 answers, got ${answers.length}` }, { status: 400 });

    const prompt = `Determine the Ayurvedic Prakriti (constitution) of an Indian user who answered 20 questions.
Answers (each option a/b/c corresponds to Vata/Pitta/Kappa-leaning trait):
${JSON.stringify(answers, null, 2)}

Return STRICT JSON only:
{
  "dominantDosha": "Vata" | "Pitta" | "Kapha",
  "secondaryDosha": "Vata" | "Pitta" | "Kapha",
  "scores": { "vata": 0, "pitta": 0, "kapha": 0 },
  "bodyType": "1-2 sentence description of body frame / build",
  "digestionType": "1-2 sentence description of digestion tendencies",
  "personalityTraits": ["trait 1", "trait 2", "trait 3"],
  "recommendedFoods": ["Indian foods good for this dosha"],
  "foodsToAvoid": ["Indian foods that aggravate this dosha"],
  "lifestyleRecommendations": ["daily lifestyle tip"],
  "dinacharya": ["Ayurvedic daily routine suggestion"]
}

Rules:
- scores sum should roughly equal 20.
- Use Indian food vocabulary (roti, moong dal, ghee, khichdi, almonds, etc.).
- Be warm and respectful of Ayurvedic tradition.
- No markdown. JSON only.`;

    const result = await runText<any>(prompt, INDIA_PREAMBLE);
    if (!result?.dominantDosha) throw new Error("invalid_response");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "ayurveda_failed", detail: message }, { status: 500 });
  }
}
