import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { runText, INDIA_PREAMBLE } from "@/lib/gemini";
import { aiGate } from "@/lib/nx/ai-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Reading { systolic: number; diastolic: number; date?: string; time?: string; arm?: string; position?: string; }
interface Input { readings: Reading[]; age: number; gender: string; }

// POST /api/know-your-health/bp-analyzer
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Input>;
    const readings = Array.isArray(body?.readings) ? body.readings : [];
    const clean = readings
      .filter((r) => r && Number(r.systolic) > 50 && Number(r.systolic) < 300 && Number(r.diastolic) > 30 && Number(r.diastolic) < 200)
      .map((r) => ({ systolic: Number(r.systolic), diastolic: Number(r.diastolic), date: String(r.date || ""), time: String(r.time || ""), arm: String(r.arm || ""), position: String(r.position || "") }));
    if (clean.length === 0) return NextResponse.json({ error: "no_valid_readings", detail: "Enter at least one blood-pressure reading (systolic 50–300, diastolic 30–200)." }, { status: 400 });

    const avgSys = Math.round(clean.reduce((a, r) => a + r.systolic, 0) / clean.length);
    const avgDia = Math.round(clean.reduce((a, r) => a + r.diastolic, 0) / clean.length);
    const pulse = avgSys - avgDia;

    const profile = {
      readings: clean,
      averageSystolic: avgSys,
      averageDiastolic: avgDia,
      pulsePressure: pulse,
      age: Number(body.age) || null,
      gender: String(body.gender || ""),
    };

    const prompt = `Analyse BP readings per ACC/AHA 2017 + ICMR guidelines.
Profile:
${JSON.stringify(profile, null, 2)}

Return STRICT JSON only:
{
  "classification": "Normal" | "Elevated" | "Stage 1 Hypertension" | "Stage 2 Hypertension" | "Hypertensive Crisis",
  "averageSystolic": 0,
  "averageDiastolic": 0,
  "pulsePressure": 0,
  "trend": "stable" | "increasing" | "decreasing" | "fluctuating",
  "pattern": "1-2 sentence pattern note (white-coat vs sustained vs masked)",
  "whiteCoatSuspected": true | false,
  "targetRange": "e.g. <130/80 mmHg for adults <60, <140/90 for elderly",
  "recommendations": ["Indian-context lifestyle action — salt reduction, DASH-Indian diet, yoga, etc."],
  "whenToSeeDoctor": "1-2 sentence guidance"
}

Rules:
- classification based on AVERAGE of readings.
- whiteCoatSuspected true if first reading is notably higher than rest.
- recommendations max 6.
- No markdown. JSON only.`;

    const result = await runText<any>(prompt, INDIA_PREAMBLE);
    // override with computed values for reliability
    result.averageSystolic = avgSys;
    result.averageDiastolic = avgDia;
    result.pulsePressure = pulse;
    if (!result?.classification) throw new Error("invalid_response");
    return NextResponse.json(result);
  } catch (err) {
    log.error("kyh", "bp_analyze_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "bp_analyze_failed", detail: "The blood pressure reading could not be analyzed. Please retry." }, { status: 500 });
  }
}
