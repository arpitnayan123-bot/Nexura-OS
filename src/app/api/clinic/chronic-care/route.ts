import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { aiGate } from "@/lib/nx/ai-guard";
import { withProductAuth } from "@/lib/nx/product-auth";
import { runText } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   NEXURA CLINIC — CHRONIC CARE PLANS (backend-core-2)
   Was: a 2-disease ICMR dictionary. Two layers now:

   1. The ICMR plan library stays as the authoritative in-repo
      source for the conditions it covers (instant, deterministic).
   2. Any OTHER chronic condition is handled by AI, grounded with
      ICMR-style structure (monitoring tests, frequencies, red
      flags) and validated to the same shape. The UI joins the
      patient roster to whatever plan comes back.

   The response shape is identical for both sources; `source`
   states which one produced the plan.
   ============================================================ */

interface CarePlan {
  disease: string;
  checkups: { test: string; frequency: string; guideline: string }[];
  reminders: string[];
}

const PLANS: Record<string, CarePlan> = {
  "Diabetes Type 2": {
    disease: "Diabetes Type 2",
    checkups: [
      { test: "HbA1c", frequency: "Every 3 months", guideline: "ICMR target <7%" },
      { test: "Foot exam", frequency: "Annually", guideline: "ICMR diabetic foot protocol" },
      { test: "Eye exam (fundus)", frequency: "Annually", guideline: "ICMR retinopathy screening" },
      {
        test: "Urine microalbumin",
        frequency: "Annually",
        guideline: "ICMR nephropathy screening",
      },
    ],
    reminders: [
      "Take Metformin with meals",
      "Check blood sugar before meals",
      "Annual flu vaccine",
    ],
  },
  Hypertension: {
    disease: "Hypertension",
    checkups: [
      { test: "Blood pressure", frequency: "Weekly", guideline: "ICMR target <140/90" },
      { test: "ECG", frequency: "Annually", guideline: "ICMR cardiac screening" },
      { test: "Serum creatinine", frequency: "6 months", guideline: "ICMR renal monitoring" },
    ],
    reminders: ["Take BP medication morning", "Low salt diet <5g/day", "Exercise 30 min daily"],
  },
};

const SYSTEM_PROMPT = `You are the chronic-care plan assistant for Nexura Clinic (Indian setting), guided by ICMR / NPCDCS chronic-disease management structure.
Given a chronic condition, produce a monitoring plan: 3-5 checkups (test, frequency, one-line guideline) and 3-5 practical daily reminders for the patient.
Rules: evidence-aligned and conservative; frequencies concrete ("Every 3 months"); reminders actionable and medicine-specific only when standard of care ("Take Metformin with meals" style); never tailor to one specific patient.
Return STRICT JSON only:
{"disease":"clean condition name","checkups":[{"test":"...","frequency":"...","guideline":"..."}],"reminders":["...","..."]}
No prose outside JSON.`;

/** Validate an AI plan into the CarePlan shape; null when unusable. */
function sanitizePlan(raw: unknown, diagnosis: string): CarePlan | null {
  const p = raw as Partial<CarePlan> | null;
  if (!p || !Array.isArray(p.checkups) || p.checkups.length === 0) return null;
  const checkups = p.checkups
    .slice(0, 6)
    .map((c) => ({
      test: typeof c?.test === "string" ? c.test.trim().slice(0, 80) : "",
      frequency: typeof c?.frequency === "string" ? c.frequency.trim().slice(0, 60) : "",
      guideline: typeof c?.guideline === "string" ? c.guideline.trim().slice(0, 140) : "",
    }))
    .filter((c) => c.test && c.frequency);
  if (checkups.length === 0) return null;
  const reminders = Array.isArray(p.reminders)
    ? p.reminders
        .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
        .map((r) => r.trim().slice(0, 120))
        .slice(0, 6)
    : [];
  return {
    disease:
      typeof p.disease === "string" && p.disease.trim() ? p.disease.trim().slice(0, 80) : diagnosis,
    checkups,
    reminders,
  };
}

async function GET_impl(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dx = (searchParams.get("diagnosis") || "").trim();

  if (dx) {
    // 1. authoritative ICMR library first
    const key = Object.keys(PLANS).find(
      (k) =>
        k.toLowerCase().includes(dx.toLowerCase()) || dx.toLowerCase().includes(k.toLowerCase()),
    );
    if (key) {
      return NextResponse.json({ plan: PLANS[key], source: "icmr-plan-library" });
    }

    // 2. AI-generated plan for any other chronic condition
    const gate = aiGate(req);
    if (gate) return gate;
    try {
      const parsed = await runText<Partial<CarePlan>>(
        `Chronic condition: "${dx.slice(0, 120)}"`,
        SYSTEM_PROMPT,
        "clinic.chronic-care",
      );
      const plan = sanitizePlan(parsed, dx);
      if (plan) {
        return NextResponse.json({ plan, source: "ai-generated (ICMR/NPCDCS-guided)" });
      }
    } catch (e) {
      log.warn("clinic", "chronic_care_ai_fallback", {
        err: e instanceof Error ? e.message : String(e),
      });
    }

    return NextResponse.json({
      plan: null,
      message:
        "No ICMR library plan for this condition and the AI plan could not be generated. Try a standard condition name.",
      source: "none",
    });
  }

  // list mode: library keys + note that any condition can be generated
  return NextResponse.json({
    plans: Object.keys(PLANS),
    aiGenerated:
      "Any other chronic condition can be passed as ?diagnosis= — a plan is generated following the ICMR/NPCDCS structure.",
    source: "icmr-plan-library",
  });
}

export const GET = withProductAuth("clinic.chronic-care.GET", GET_impl);
