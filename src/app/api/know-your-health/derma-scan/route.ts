import { NextRequest, NextResponse } from "next/server";
import { runVision, INDIA_PREAMBLE, isValidImageBase64 } from "@/lib/gemini";
import { aiGate } from "@/lib/nx/ai-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB original file
const MAX_BASE64_LEN = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 1024;

// POST /api/know-your-health/derma-scan
// body: { image:{base64,mimeType}, concern?:string }
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = await req.json().catch(() => ({}));
    const image = body?.image;
    const base64 = typeof image?.base64 === "string" ? image.base64.trim() : "";
    const mimeType = typeof image?.mimeType === "string" ? image.mimeType.trim() : "";
    if (!base64 || !mimeType) return NextResponse.json({ error: "no_image" }, { status: 400 });
    if (!isValidImageBase64(base64)) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    if (base64.length > MAX_BASE64_LEN) return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(mimeType)) return NextResponse.json({ error: "unsupported_mime" }, { status: 415 });

    const concern = typeof body?.concern === "string" ? body.concern.trim().slice(0, 500) : "";
    const concernLine = concern ? `\nThe user mentions this concern: "${concern}".\nTake it into account, but the image is the primary source.` : "";

    const prompt = `${INDIA_PREAMBLE}

You are analyzing a close-up photo of a person's skin concern. Describe what is VISIBLE in the image objectively — colour, texture, distribution, pattern, location. Do NOT make a definitive diagnosis.

${concernLine}

Return STRICT JSON only with this exact shape:
{
  "description": "2-4 sentence objective description of visible skin features (colour, pattern, area, morphology). Avoid diagnostic labels here.",
  "possibleConditions": [
    {
      "name": "Common condition name in plain English",
      "confidence": "Likely" | "Possible" | "Less likely",
      "description": "1-2 sentence explanation of why this could match what is visible, and what differentiates it."
    }
  ],
  "urgency": "low" | "moderate" | "high",
  "recommendedActions": ["practical, non-prescriptive next step"],
  "redFlags": ["specific warning sign that warrants immediate medical attention"],
  "whenToSeeDermatologist": "1-2 sentence clear guidance on when this should prompt an in-person dermatology review",
  "disclaimer": "Short reminder that this is not a diagnosis and not a substitute for a dermatologist."
}

Rules:
- urgency "high" only for red-flag features: rapidly spreading, severe pain, blistering on large area, signs of infection (pus, warmth), involvement of eyes/mouth/genitals, or pigment changes suggestive of melanoma (ABCDE signs).
- Max 4 possibleConditions. Order by confidence descending.
- Max 5 recommendedActions, max 5 redFlags.
- If image is not a skin photo or quality is too poor, return empty possibleConditions and set urgency "low" with a description explaining the issue.
- Use plain English; avoid rare or alarming diagnoses when a common explanation fits.
- No markdown. JSON only.`;

    const result = await runVision<any>(base64, mimeType, prompt);
    if (!result || !Array.isArray(result.possibleConditions) || !result.urgency) {
      throw new Error("invalid_response");
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "derma_scan_failed", detail: message }, { status: 500 });
  }
}
