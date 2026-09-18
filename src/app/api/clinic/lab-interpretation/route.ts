import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { aiGate } from "@/lib/nx/ai-guard";
import { withProductAuth } from "@/lib/nx/product-auth";
import { runText } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   NEXURA CLINIC — LAB VALUE INTERPRETATION (backend-core-2)
   Two-layer design, deliberately:

   1. DETERMINISTIC layer (unchanged): the ICMR/NFHS-5 reference
      table decides LOW/NORMAL/HIGH. Flagging a lab value is a
      lookup, not an opinion — it must never depend on model
      availability or hallucinate a range.
   2. AI layer (new): with the flag and the reference range fixed,
      the LLM writes the patient-specific explanation and next
      steps in the Indian clinical context. On AI failure the
      table's meaning/advice serves as the labelled fallback.

   Response shape unchanged (the clinic UI renders these fields).
   ============================================================ */

const RANGES: Record<
  string,
  { low: number; high: number; unit: string; meaning: string; advice: string }
> = {
  Hemoglobin: {
    low: 12,
    high: 17,
    unit: "g/dL",
    meaning: "Low Hb indicates anemia — very common in India (NFHS-5: 57% women)",
    advice: "Iron supplements + iron-rich diet (green leafy veg, jaggery)",
  },
  "Fasting Blood Sugar": {
    low: 70,
    high: 100,
    unit: "mg/dL",
    meaning: ">126 = diabetes (ICMR-INDIAB criteria)",
    advice: ">126: consult doctor for diabetes management",
  },
  HbA1c: {
    low: 4,
    high: 5.7,
    unit: "%",
    meaning: "5.7-6.4 = prediabetes, ≥6.5 = diabetes (ICMR target <7%)",
    advice: ">6.5: diabetes treatment needed",
  },
  TSH: {
    low: 0.4,
    high: 4.0,
    unit: "mIU/L",
    meaning: ">4.0 = hypothyroidism, <0.4 = hyperthyroidism",
    advice: ">4.0: start Levothyroxine, recheck TSH in 6 weeks",
  },
  "Total Cholesterol": {
    low: 120,
    high: 200,
    unit: "mg/dL",
    meaning: ">200 = dyslipidemia",
    advice: ">200: statin therapy + diet modification",
  },
  Creatinine: {
    low: 0.6,
    high: 1.2,
    unit: "mg/dL",
    meaning: ">1.2 = possible kidney impairment",
    advice: ">1.5: nephrology referral",
  },
};

const SYSTEM_PROMPT = `You are the lab-interpretation assistant for Nexura Clinic (Indian outpatient setting).
You receive: a test name, the measured value, the DETERMINED status (LOW/NORMAL/HIGH — computed from the reference range; do not re-litigate it), and the reference range.
Explain the result for the patient's care team in 2-3 sentences: what the value means at THIS level, likely common causes in the Indian context, and one concrete next step.
Rules: never invent a different flag; never prescribe a specific prescription drug — say "discuss with the treating doctor"; keep it under 80 words.
Return STRICT JSON only: {"meaning":"...","advice":"..."}. No prose outside JSON.`;

async function POST_impl(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const b = await req.json().catch(() => ({}));
    const test = typeof b?.test === "string" ? b.test.trim() : "";
    const value = Number(b?.value);
    if (!test || !Number.isFinite(value))
      return NextResponse.json({ error: "missing" }, { status: 400 });

    const range = RANGES[test];
    if (!range)
      return NextResponse.json({
        interpretation: null,
        message: "No reference range available for this test",
      });

    // deterministic flag — never model-dependent
    const status = value < range.low ? "LOW" : value > range.high ? "HIGH" : "NORMAL";

    let meaning = range.meaning;
    let advice = range.advice;
    let source = "ICMR + NFHS-5 Indian reference ranges (deterministic flag)";

    try {
      const parsed = await runText<{ meaning?: string; advice?: string }>(
        `Test: ${test}\nValue: ${value} ${range.unit}\nDetermined status: ${status}\nReference range: ${range.low}-${range.high} ${range.unit}`,
        SYSTEM_PROMPT,
        "clinic.lab-interpretation",
      );
      if (typeof parsed.meaning === "string" && parsed.meaning.trim())
        meaning = parsed.meaning.trim().slice(0, 500);
      if (typeof parsed.advice === "string" && parsed.advice.trim())
        advice = parsed.advice.trim().slice(0, 500);
      source = "deterministic ICMR/NFHS-5 flag + AI interpretation";
    } catch (e) {
      log.warn("clinic", "lab_interpretation_ai_fallback", {
        err: e instanceof Error ? e.message : String(e),
      });
      source = "ICMR + NFHS-5 Indian reference ranges (AI unavailable — table guidance)";
    }

    return NextResponse.json({
      test,
      value,
      status,
      unit: range.unit,
      range: `${range.low}-${range.high}`,
      meaning,
      advice,
      indianContext: true,
      source,
    });
  } catch (e) {
    log.error("clinic", "lab_interpretation_failed", {
      err: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export const POST = withProductAuth("clinic.lab-interpretation.POST", POST_impl);
