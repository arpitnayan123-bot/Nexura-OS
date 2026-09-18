import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { runText, INDIA_PREAMBLE } from "@/lib/gemini";
import { aiGate } from "@/lib/nx/ai-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Input {
  goal: string;
  dietaryPreference: string;
  calorieTarget: number;
  age: number;
  gender: string;
  weightKg: number;
  heightCm: number;
  activityLevel: string;
  allergies: string;
  medicalConditions: string;
}

// POST /api/know-your-health/diet-planner
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Input>;
    const age = Number(body.age);
    const heightCm = Number(body.heightCm);
    const weightKg = Number(body.weightKg);
    const calorieTarget = Number(body.calorieTarget);
    if (!age || !heightCm || !weightKg || !calorieTarget)
      return NextResponse.json(
        {
          error: "missing_required",
          detail: "Age, height, weight and calorie target are all required.",
        },
        { status: 400 },
      );

    const profile: Input = {
      goal: String(body.goal || "maintain"),
      dietaryPreference: String(body.dietaryPreference || "vegetarian"),
      calorieTarget,
      age,
      gender: String(body.gender || "male"),
      weightKg,
      heightCm,
      activityLevel: String(body.activityLevel || "moderate"),
      allergies: String(body.allergies || ""),
      medicalConditions: String(body.medicalConditions || ""),
    };

    const prompt = `Create a personalised 7-day Indian meal plan for this person.
Profile:
${JSON.stringify(profile, null, 2)}

Use Indian dishes (roti, dal, sabzi, idli, dosa, poha, upma, khichdi, paneer, etc.).
Return STRICT JSON only:
{
  "bmi": 0,
  "calorieTarget": 0,
  "macroSplit": { "protein": 0, "carbs": 0, "fat": 0 },
  "mealPlan": [
    {
      "day": "Monday",
      "breakfast": { "meal": "name + brief description", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "recipe": "1-line how to make" },
      "lunch":    { "meal": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "recipe": "..." },
      "dinner":   { "meal": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "recipe": "..." },
      "snacks":   { "meal": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "recipe": "..." }
    }
  ],
  "groceryList": [
    { "category": "Grains & Pulses", "items": ["item", "item"] },
    { "category": "Vegetables", "items": ["item"] },
    { "category": "Dairy & Protein", "items": ["item"] },
    { "category": "Spices & Condiments", "items": ["item"] }
  ],
  "hydrationTarget": "3 L water/day",
  "tips": ["Indian-context healthy-eating tip"]
}

Rules:
- 7 entries in mealPlan (Monday-Sunday).
- macroSplit values are grams per day.
- honour dietaryPreference (vegetarian / non-veg / vegan / eggetarian) and allergies strictly.
- avoid foods that conflict with medicalConditions.
- No markdown. JSON only.`;

    const result = await runText<any>(prompt, INDIA_PREAMBLE, "kyh.diet-planner");
    if (!result?.mealPlan) throw new Error("invalid_response");
    return NextResponse.json(result);
  } catch (err) {
    log.error("kyh", "diet_plan_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "diet_plan_failed", detail: "The diet plan could not be generated. Please retry." },
      { status: 500 },
    );
  }
}
