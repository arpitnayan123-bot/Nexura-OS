import { NextRequest, NextResponse } from "next/server";
import { runText, INDIA_PREAMBLE } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/know-your-health/lab-analyzer
// body: { tests: [{ name, value, unit }] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tests = Array.isArray(body?.tests) ? body.tests : [];
    const clean = tests
      .filter((t: any) => t && typeof t.name === "string" && t.name.trim() && (t.value !== undefined && t.value !== null && String(t.value).trim() !== ""))
      .map((t: any) => ({ name: String(t.name).trim(), value: String(t.value).trim(), unit: String(t.unit || "").trim() }));
    if (clean.length === 0) return NextResponse.json({ error: "no_tests" }, { status: 400 });

    const prompt = `A person in India uploaded these lab test results (parsed as text):
${JSON.stringify(clean, null, 2)}

Interpret each test against ICMR / Indian reference ranges. Return STRICT JSON only:
{
  "tests": [
    {
      "name": "Hemoglobin",
      "value": "13.2",
      "unit": "g/dL",
      "status": "LOW" | "HIGH" | "NORMAL",
      "referenceRange": "13.0-17.0 g/dL (male), 12.0-15.5 g/dL (female)",
      "meaning": "1-2 sentence plain-English explanation",
      "severity": "low" | "moderate" | "high" | "normal"
    }
  ],
  "overallSummary": "2-3 sentence summary of overall picture",
  "abnormalCount": 0,
  "recommendations": ["actionable next step"],
  "requiresDoctorFollowUp": true | false
}

Rules:
- Use Indian reference ranges (ICMR, NACB India).
- status HIGH/LOW only when value falls clearly outside range; borderline goes to NORMAL with note.
- severity reflects clinical importance.
- recommendations max 6. requiresDoctorFollowUp true if any "high" severity or 2+ abnormal.
- No markdown. JSON only.`;

    const result = await runText<any>(prompt, INDIA_PREAMBLE);
    if (!result || !Array.isArray(result.tests)) throw new Error("invalid_response");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "lab_analyze_failed", detail: message }, { status: 500 });
  }
}
