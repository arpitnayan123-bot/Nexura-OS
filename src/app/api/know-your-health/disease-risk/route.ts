import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { runText, INDIA_PREAMBLE } from "@/lib/gemini";
import { aiGate } from "@/lib/nx/ai-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Input {
  age: number; gender: string; heightCm: number; weightKg: number; waistCm: number;
  familyHistoryDiabetes: boolean; familyHistoryHeart: boolean; smoker: boolean;
  alcohol: string; physicalActivity: string; diet: string; sleep: string;
  stress: string; bpSystolic: number; bpDiastolic: number; cholesterol?: number;
  fastingSugar?: number;
}

// POST /api/know-your-health/disease-risk
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Input>;
    const age = Number(body.age); const heightCm = Number(body.heightCm); const weightKg = Number(body.weightKg);
    if (!age || !heightCm || !weightKg) return NextResponse.json({ error: "missing_required", detail: "Age, height and weight are all required." }, { status: 400 });

    const profile: Input = {
      age, gender: String(body.gender || "male"), heightCm, weightKg,
      waistCm: Number(body.waistCm || 0),
      familyHistoryDiabetes: !!body.familyHistoryDiabetes,
      familyHistoryHeart: !!body.familyHistoryHeart,
      smoker: !!body.smoker,
      alcohol: String(body.alcohol || ""), physicalActivity: String(body.physicalActivity || ""),
      diet: String(body.diet || ""), sleep: String(body.sleep || ""), stress: String(body.stress || ""),
      bpSystolic: Number(body.bpSystolic || 0), bpDiastolic: Number(body.bpDiastolic || 0),
      cholesterol: body.cholesterol ? Number(body.cholesterol) : undefined,
      fastingSugar: body.fastingSugar ? Number(body.fastingSugar) : undefined,
    };

    const prompt = `Estimate 10-year disease risk for this Indian adult. Use ICMR-INDIAB diabetes risk score, ASCVD-style CVD risk, and KFRE-style CKD risk (with Indian context).
Profile:
${JSON.stringify(profile, null, 2)}

Return STRICT JSON only:
{
  "diabetesRisk": { "score": 0, "level": "low"|"moderate"|"high", "explanation": "1-2 sentence why", "recommendations": ["practical step"] },
  "cvdRisk":      { "score": 0, "level": "low"|"moderate"|"high", "explanation": "1-2 sentence why", "recommendations": ["practical step"] },
  "ckdRisk":      { "score": 0, "level": "low"|"moderate"|"high", "explanation": "1-2 sentence why", "recommendations": ["practical step"] },
  "overallSummary": "2-3 sentence overall risk picture",
  "topRecommendations": ["the 3-5 most impactful actions, prioritised"]
}

Rules:
- Score on 0-100 scale (probability-style percentage for diabetes/CVD; CKD as risk score).
- level thresholds: low < 10, moderate 10-20, high > 20.
- Recommendations should be Indian-context (roti, dal, walking, yoga, etc.).
- Do not diagnose; speak probabilistically.
- No markdown. JSON only.`;

    const result = await runText<any>(prompt, INDIA_PREAMBLE);
    if (!result?.diabetesRisk) throw new Error("invalid_response");
    return NextResponse.json(result);
  } catch (err) {
    log.error("kyh", "disease_risk_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "disease_risk_failed", detail: "The risk assessment could not be generated. Please retry." }, { status: 500 });
  }
}
