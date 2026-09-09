import { NextRequest, NextResponse } from "next/server";
import { runText, INDIA_PREAMBLE } from "@/lib/gemini";
import { aiGate } from "@/lib/nx/ai-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Input {
  medications: string[]; conditions: string[]; age: number | null; gender: string;
  kidneyFunction: string; liverFunction: string;
}

// POST /api/know-your-health/med-interaction
export async function POST(req: NextRequest) {
  const __ai = aiGate(req);
  if (__ai) return __ai;
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Input>;
    const meds = Array.isArray(body?.medications) ? body.medications.map((m) => String(m || "").trim()).filter(Boolean) : [];
    if (meds.length < 2) return NextResponse.json({ error: "need_at_least_2_meds", detail: "Add at least 2 medications to check interactions" }, { status: 400 });

    const profile: Input = {
      medications: meds,
      conditions: Array.isArray(body?.conditions) ? body.conditions.map((c) => String(c || "").trim()).filter(Boolean) : [],
      age: Number(body.age) || null,
      gender: String(body.gender || ""),
      kidneyFunction: String(body.kidneyFunction || "Normal"),
      liverFunction: String(body.liverFunction || "Normal"),
    };

    const prompt = `Check for drug-drug interactions and drug-condition warnings. Consider Indian brand-name medicines (Crocin, Dolo, Glycomet, Amlong, Telma, Cardace, Ecosprin, Azithral, Augmentin, Pan, Cetzine, Rosuvas, Shelcal, Becosules, Brufen) and their generics.
Profile:
${JSON.stringify(profile, null, 2)}

Return STRICT JSON only:
{
  "interactions": [
    {
      "drug1": "name",
      "drug2": "name",
      "severity": "mild" | "moderate" | "severe" | "contraindicated",
      "mechanism": "1-sentence pharmacological mechanism",
      "clinicalEffect": "what the patient may experience",
      "recommendation": "actionable next step (e.g. consult doctor, monitor, space doses)"
    }
  ],
  "conditionWarnings": ["warning about a med + condition combination"],
  "safeSummary": "1-2 sentence summary — overall safety picture",
  "topRisks": ["highest-priority risk"],
  "alternatives": ["safer alternative suggestion (only generic / class level)"],
  "requiresPharmacistConsult": true | false,
  "disclaimer": "reminder that this is informational only"
}

Rules:
- Only flag clinically meaningful interactions (skip trivial ones).
- Consider kidney/liver function in recommendations.
- Never recommend stopping prescribed medication without consulting doctor.
- max 8 interactions, 5 conditionWarnings, 4 alternatives.
- If no interactions found, return empty arrays and safeSummary saying so.
- No markdown. JSON only.`;

    const result = await runText<any>(prompt, INDIA_PREAMBLE);
    if (!result || !Array.isArray(result.interactions)) throw new Error("invalid_response");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "med_interaction_failed", detail: message }, { status: 500 });
  }
}
