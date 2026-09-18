import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { runText, runVision, isValidImageBase64, INDIA_PREAMBLE } from "@/lib/gemini";
import { aiGate } from "@/lib/nx/ai-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BASE64_LEN = Math.ceil((8 * 1024 * 1024 * 4) / 3) + 1024; // matches 8MB client cap
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

// POST /api/know-your-health/lab-analyzer
// body: { tests: [{ name, value, unit }] }  — manual entry path
//      | { image: { base64, mimeType } }   — photo-of-report path (vision OCR)
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = await req.json().catch(() => ({}));
    const tests = Array.isArray(body?.tests) ? body.tests : [];
    const clean = tests
      .filter(
        (t: any) =>
          t &&
          typeof t.name === "string" &&
          t.name.trim() &&
          t.value !== undefined &&
          t.value !== null &&
          String(t.value).trim() !== "",
      )
      .map((t: any) => ({
        name: String(t.name).trim(),
        value: String(t.value).trim(),
        unit: String(t.unit || "").trim(),
      }));

    // ---- Path 2: photo of a lab report → vision extraction ----
    let extractedFromImage = false;
    let sourceTests = clean;
    const image = body?.image;
    const base64 = typeof image?.base64 === "string" ? image.base64.trim() : "";
    const mimeType = typeof image?.mimeType === "string" ? image.mimeType.trim() : "";

    if (clean.length === 0) {
      if (!base64 || !mimeType) {
        return NextResponse.json(
          {
            error: "no_tests",
            detail: "Add at least one lab test value, or upload a photo of your lab report.",
          },
          { status: 400 },
        );
      }
      if (!isValidImageBase64(base64)) {
        return NextResponse.json(
          {
            error: "invalid_image",
            detail: "That image could not be read. Try a clearer photo (JPG or PNG).",
          },
          { status: 415 },
        );
      }
      if (!ALLOWED_MIME.has(mimeType.toLowerCase())) {
        return NextResponse.json(
          { error: "unsupported_type", detail: "Upload a JPG, PNG or WebP photo of the report." },
          { status: 415 },
        );
      }
      if (base64.length > MAX_BASE64_LEN) {
        return NextResponse.json(
          { error: "image_too_large", detail: "Photo is too large (max 8MB)." },
          { status: 413 },
        );
      }
      const extractPrompt = `This is a photo of a medical lab report from India. Read EVERY test result visible in the image.
Return STRICT JSON only:
{
  "tests": [
    { "name": "Hemoglobin", "value": "11.2", "unit": "g/dL" }
  ]
}
Rules:
- Extract test name, numeric value and unit exactly as printed (value may keep arrows like "+" if printed).
- Include all visible tests (CBC, LFT, KFT, thyroid, lipids, glucose, HbA1c, vitamins, urine, etc.).
- If a value is unreadable, skip that test. No markdown. JSON only.`;
      const extracted = await runVision<any>(base64, mimeType, extractPrompt, "kyh.lab-analyzer");
      if (!extracted || !Array.isArray(extracted.tests) || extracted.tests.length === 0) {
        return NextResponse.json(
          {
            error: "extraction_failed",
            detail:
              "We couldn't read any test values from that photo. Try better lighting, or enter the values manually.",
          },
          { status: 422 },
        );
      }
      sourceTests = extracted.tests
        .filter(
          (t: any) =>
            t &&
            typeof t.name === "string" &&
            t.name.trim() &&
            t.value !== undefined &&
            t.value !== null &&
            String(t.value).trim() !== "",
        )
        .slice(0, 40)
        .map((t: any) => ({
          name: String(t.name).trim(),
          value: String(t.value).trim(),
          unit: String(t.unit || "").trim(),
        }));
      if (sourceTests.length === 0) {
        return NextResponse.json(
          {
            error: "extraction_failed",
            detail: "Couldn't read the values clearly — please enter them manually.",
          },
          { status: 422 },
        );
      }
      extractedFromImage = true;
    }

    const prompt = `A person in India uploaded these lab test results${extractedFromImage ? " (auto-extracted from a photo of their report)" : " (parsed as text)"}:
${JSON.stringify(sourceTests, null, 2)}

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

    const result = await runText<any>(prompt, INDIA_PREAMBLE, "kyh.lab-analyzer");
    if (!result || !Array.isArray(result.tests)) throw new Error("invalid_response");
    if (extractedFromImage) result.extractedFromImage = true;
    return NextResponse.json(result);
  } catch (err) {
    log.error("kyh", "lab_analyze_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error: "lab_analyze_failed",
        detail: "The lab report could not be analyzed. Please retry.",
      },
      { status: 500 },
    );
  }
}
