import { NextRequest, NextResponse } from "next/server";
import { runText, INDIA_PREAMBLE } from "@/lib/gemini";
import { aiGate } from "@/lib/nx/ai-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/know-your-health/diabetes-care
// body: { fastingSugar, postMealSugar, hba1c, lastMeal, medications, activity, notes }
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = await req.json().catch(() => ({}));
    const fasting = Number(body?.fastingSugar);
    const postMeal = Number(body?.postMealSugar);
    const hba1c = body?.hba1c ? Number(body.hba1c) : undefined;
    if (!fasting && !postMeal && !hba1c) return NextResponse.json({ error: "no_values" }, { status: 400 });

    const profile = {
      fastingSugar: fasting || null,
      postMealSugar: postMeal || null,
      hba1c: hba1c || null,
      lastMeal: String(body?.lastMeal || ""),
      medications: String(body?.medications || ""),
      activity: String(body?.activity || ""),
      notes: String(body?.notes || ""),
    };

    const prompt = `Act as a Type 2 diabetes care coach for an Indian patient. Interpret these values against ICMR-INDIAB targets (fasting 80-130 mg/dL, post-meal <180 mg/dL, HbA1c <7%).
Profile:
${JSON.stringify(profile, null, 2)}

Return STRICT JSON only:
{
  "status": "controlled" | "borderline" | "uncontrolled",
  "fastingAssessment": "1-2 sentence interpretation of fasting sugar",
  "postMealAssessment": "1-2 sentence interpretation of post-meal sugar",
  "hba1cAssessment": "1-2 sentence interpretation of HbA1c (or 'No HbA1c provided')",
  "trendAnalysis": "1-2 sentence on likely trend & what it suggests",
  "recommendations": ["practical Indian-context actions"],
  "alertFlags": ["concerning pattern that needs doctor attention"],
  "indianDietTips": ["specific Indian food tips - roti, dal, sabzi, ragi, etc."]
}

Rules:
- status "uncontrolled" when fasting >180 or post-meal >250 or HbA1c >9.
- status "borderline" when fasting 130-180 or post-meal 180-250 or HbA1c 7-9.
- status "controlled" otherwise.
- No insulin or drug dose changes — recommend speaking to endocrinologist.
- max 6 recommendations, 4 alertFlags, 5 dietTips.
- No markdown. JSON only.`;

    const result = await runText<any>(prompt, INDIA_PREAMBLE);
    if (!result?.status) throw new Error("invalid_response");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "diabetes_care_failed", detail: message }, { status: 500 });
  }
}
