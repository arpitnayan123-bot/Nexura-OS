import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { runText, INDIA_PREAMBLE } from "@/lib/gemini";
import { aiGate } from "@/lib/nx/ai-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Input {
  bedtime: string; wakeTime: string; sleepLatencyMin: number; awakenings: number;
  totalAwakeMin: number; sleepQuality: number; mood: number; caffeineAfternoon: boolean;
  screenBeforeBed: boolean; notes: string; age: number;
}

function toMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
  if (!m) return null;
  let h = Number(m[1]); const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

// POST /api/know-your-health/sleep-quality
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Input>;
    const bedtime = String(body.bedtime || "");
    const wakeTime = String(body.wakeTime || "");
    const startM = toMinutes(bedtime);
    const wakeM = toMinutes(wakeTime);
    let totalSleepMin: number | null = null;
    let timeInBedMin: number | null = null;
    let sleepEfficiency: number | null = null;
    if (startM !== null && wakeM !== null) {
      let diff = wakeM - startM;
      if (diff < 0) diff += 24 * 60; // crossed midnight
      timeInBedMin = diff;
      const latency = Number(body.sleepLatencyMin) || 0;
      const awake = Number(body.totalAwakeMin) || 0;
      totalSleepMin = Math.max(0, diff - latency - awake);
      sleepEfficiency = Math.round((totalSleepMin / Math.max(1, timeInBedMin)) * 100);
    }

    const profile = {
      bedtime, wakeTime,
      sleepLatencyMin: Number(body.sleepLatencyMin) || 0,
      awakenings: Number(body.awakenings) || 0,
      totalAwakeMin: Number(body.totalAwakeMin) || 0,
      sleepQuality: Number(body.sleepQuality) || 3,
      mood: Number(body.mood) || 3,
      caffeineAfternoon: !!body.caffeineAfternoon,
      screenBeforeBed: !!body.screenBeforeBed,
      notes: String(body.notes || ""),
      age: Number(body.age) || null,
      computed: { totalSleepMin, sleepEfficiency },
    };

    const prompt = `Analyse this person's sleep quality with Indian lifestyle context (chai/coffee culture, late dinners, family routines, climate).
Profile:
${JSON.stringify(profile, null, 2)}

Return STRICT JSON only:
{
  "totalSleepHours": 0,
  "sleepEfficiencyPercent": 0,
  "sleepEfficiencyCategory": "Excellent" | "Good" | "Fair" | "Poor",
  "patternsDetected": [
    { "name": "pattern name (e.g. delayed sleep phase, fragmented sleep)", "severity": "low|moderate|high", "note": "1-sentence why" }
  ],
  "issues": ["specific sleep issue identified"],
  "recommendations": ["Indian-context actionable tip — avoid late chai, lighter dinner, etc."],
  "sleepHygieneTips": ["daily sleep hygiene habit"],
  "whenToSeeDoctor": "1-2 sentence guidance on when to consult (e.g. suspected apnea)"
}

Rules:
- Use computed values when present.
- patternsDetected max 4, issues max 4, recommendations max 6.
- No markdown. JSON only.`;

    const result = await runText<any>(prompt, INDIA_PREAMBLE, "kyh.sleep-quality");
    if (totalSleepMin !== null) result.totalSleepHours = Math.round((totalSleepMin / 60) * 10) / 10;
    if (sleepEfficiency !== null) result.sleepEfficiencyPercent = sleepEfficiency;
    if (!result?.sleepEfficiencyCategory) throw new Error("invalid_response");
    return NextResponse.json(result);
  } catch (err) {
    log.error("kyh", "sleep_analyze_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "sleep_analyze_failed", detail: "The sleep analysis could not be completed. Please retry." }, { status: 500 });
  }
}
