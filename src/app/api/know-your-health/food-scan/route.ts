import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { runVision, INDIA_PREAMBLE, isValidImageBase64 } from "@/lib/gemini";
import { aiGate } from "@/lib/nx/ai-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB original file
const MAX_BASE64_LEN = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 1024;

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
type MealType = typeof MEAL_TYPES[number];

// POST /api/know-your-health/food-scan
// body: { image:{base64,mimeType}, mealType:string }
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = await req.json().catch(() => ({}));
    const image = body?.image;
    const base64 = typeof image?.base64 === "string" ? image.base64.trim() : "";
    const mimeType = typeof image?.mimeType === "string" ? image.mimeType.trim() : "";
    if (!base64 || !mimeType) return NextResponse.json({ error: "no_image", detail: "Upload a photo first (JPG, PNG or WebP, max 8MB)." }, { status: 400 });
    if (!isValidImageBase64(base64)) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
    if (base64.length > MAX_BASE64_LEN) return NextResponse.json({ error: "image_too_large" }, { status: 413 });
    if (!/^image\/(jpeg|png|webp)$/i.test(mimeType)) return NextResponse.json({ error: "unsupported_mime" }, { status: 415 });

    const rawMeal = typeof body?.mealType === "string" ? body.mealType.trim() : "";
    const mealType = MEAL_TYPES.find((m) => m.toLowerCase() === rawMeal.toLowerCase()) || "Snack";

    const prompt = `${INDIA_PREAMBLE}

You are analyzing a photo of a meal. Identify the dish(es) — paying special attention to common Indian dishes (roti, dal, sabzi, rice, idli, dosa, paratha, paneer, biryani, sambar, chutney, chai, etc.) — estimate the portion, and break down approximate nutrition.

The user indicates this is their: ${mealType}.

Return STRICT JSON only with this exact shape:
{
  "identifiedFood": "Name of the dish(es) in plain English. Use the Indian name with English transliteration if relevant (e.g. 'Masala Dosa', 'Chole Bhature').",
  "mealType": "${mealType}",
  "portionEstimate": "1-line description of the portion size (e.g. '2 medium pieces + 1 small bowl of gravy')",
  "calories": 450,
  "macros": {
    "protein_g": 12,
    "carbs_g": 55,
    "fat_g": 18,
    "fiber_g": 6,
    "sugar_g": 4
  },
  "ingredients": [
    { "name": "Ingredient name", "estimated_amount": "approximate amount (e.g. '1 cup cooked rice', '30 g paneer')" }
  ],
  "healthScore": 7,
  "healthNotes": ["1-line positive or cautionary note about the dish's nutrition profile"],
  "healthierSwaps": ["practical Indian-context swap to make the meal healthier"],
  "indianDish": true | false,
  "disclaimer": "Short reminder that nutrition values are estimates."
}

Rules:
- calories and macros are whole numbers, realistic for the identified portion.
- healthScore is an integer 1-10 where 10 is most balanced; consider protein, fibre, oil, sugar, processing level.
- If multiple dishes are present, list each in identifiedFood and aggregate the macros; list each in ingredients.
- If the image is not food, set identifiedFood to "Not a food image", calories/macros to 0, healthScore 1, and explain in healthNotes.
- Max 8 ingredients, 5 healthNotes, 4 healthierSwaps.
- Use Indian English and Indian dietary context.
- No markdown. JSON only.`;

    const result = await runVision<any>(base64, mimeType, prompt);
    if (!result || typeof result.calories !== "number" || !result.macros) {
      throw new Error("invalid_response");
    }
    return NextResponse.json(result);
  } catch (err) {
    log.error("kyh", "food_scan_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "food_scan_failed", detail: "The food could not be analyzed. Please retry with a clearer photo." }, { status: 500 });
  }
}
