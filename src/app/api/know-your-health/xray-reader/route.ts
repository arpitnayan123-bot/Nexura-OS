import { NextRequest, NextResponse } from "next/server";
import { runVision, INDIA_PREAMBLE, isValidImageBase64 } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB original file
const MAX_BASE64_LEN = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 1024;

const BODY_PARTS = ["Chest", "Hand/Wrist", "Knee", "Spine", "Skull", "Abdomen"] as const;
type BodyPart = typeof BODY_PARTS[number];

// POST /api/know-your-health/xray-reader
// body: { image:{base64,mimeType}, bodyPart:string, clinicalContext?:string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const image = body?.image;
    const base64 = typeof image?.base64 === "string" ? image.base64.trim() : "";
    const mimeType = typeof image?.mimeType === "string" ? image.mimeType.trim() : "";
    if (!base64 || !mimeType) return NextResponse.json({ error: "no_image" }, { status: 400 });
    if (!isValidImageBase64(base64)) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    if (base64.length > MAX_BASE64_LEN) return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(mimeType)) return NextResponse.json({ error: "unsupported_mime" }, { status: 415 });

    const rawPart = typeof body?.bodyPart === "string" ? body.bodyPart.trim() : "";
    const bodyPart = BODY_PARTS.find((p) => p.toLowerCase() === rawPart.toLowerCase());
    if (!bodyPart) return NextResponse.json({ error: "invalid_body_part", allowed: BODY_PARTS }, { status: 400 });

    const clinicalContext = typeof body?.clinicalContext === "string" ? body.clinicalContext.trim().slice(0, 600) : "";
    const ctxLine = clinicalContext ? `\nClinical context provided by the user: "${clinicalContext}".` : "";

    const prompt = `${INDIA_PREAMBLE}

You are performing an EDUCATIONAL analysis of an X-ray image of the ${bodyPart}. You are not a substitute for a radiologist's report. Describe visible anatomy and observations in plain language.

${ctxLine}

Return STRICT JSON only with this exact shape:
{
  "bodyPart": "${bodyPart}",
  "imageQuality": "good" | "adequate" | "poor",
  "findings": [
    {
      "region": "anatomical region visible (e.g. 'Right lung field', 'Cardiac silhouette', 'Bones of the hand')",
      "observation": "1-2 sentence plain-English description of what is visible here",
      "abnormality": true | false,
      "severity": "low" | "moderate" | "high"
    }
  ],
  "possibleAbnormalities": [
    {
      "finding": "Possible abnormality name",
      "likelihood": "Unlikely" | "Possible" | "Likely",
      "note": "1 sentence on what visual feature suggests this"
    }
  ],
  "summary": "2-3 sentence overall educational summary",
  "recommendations": ["general, non-prescriptive next step"],
  "requiresRadiologistReview": true | false,
  "disclaimer": "Short reminder that this is not a radiologist's report."
}

Rules:
- imageQuality "poor" if the image is rotated, over/under-exposed, or has obstruction; still describe what is visible.
- Always include findings for the major anatomical regions expected in a ${bodyPart} X-ray.
- abnormality=true only when there is a clearly visible departure from normal.
- severity is required only when abnormality=true; otherwise omit the field.
- requiresRadiologistReview=true if any finding has abnormality=true OR imageQuality is "poor".
- If the image is not an X-ray or not of ${bodyPart}, return empty findings and set imageQuality "poor".
- Max 6 findings, 5 possibleAbnormalities, 5 recommendations.
- Use Indian English. No markdown. JSON only.`;

    const result = await runVision<any>(base64, mimeType, prompt);
    if (!result || !Array.isArray(result.findings) || !result.imageQuality) {
      throw new Error("invalid_response");
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "xray_reader_failed", detail: message }, { status: 500 });
  }
}
