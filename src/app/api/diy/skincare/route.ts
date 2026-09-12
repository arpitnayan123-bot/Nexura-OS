/* /api/diy/skincare — level-based routine center.
   Levels: minimal / core / full. Patch-test gates are part of
   the routine itself; irritation events can PAUSE the routine
   (escalation-pause) — that is a safety behavior, not a bug.
   Pregnancy/breastfeeding scrubs retinoids & strong actives. */

import { NextRequest, NextResponse } from "next/server";
import { guard, zodBody } from "../_lib";
import { skincareStartSchema, skincareEventSchema } from "@/lib/diy/schemas";
import { db } from "@/lib/db";
import { validateContent } from "@/lib/diy/safety/content-validator";
import { packFor } from "@/lib/diy/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTINES: Record<string, { name: string; steps: { slot: string; title: string; detail: string }[] }> = {
  minimal: {
    name: "Minimal — barrier only",
    steps: [
      { slot: "AM", title: "Gentle cleanse", detail: "Lukewarm water or a mild face wash. No scrubbing." },
      { slot: "AM", title: "Moisturizer", detail: "A coin-sized layer while skin is still damp." },
      { slot: "AM", title: "Sunscreen SPF 30+", detail: "Every morning, even indoors near windows. Reapply at noon." },
      { slot: "PM", title: "Cleanse + moisturize", detail: "Wash the day off; seal with moisturizer." },
    ],
  },
  core: {
    name: "Core — barrier + one active",
    steps: [
      { slot: "AM", title: "Gentle cleanse", detail: "Mild face wash, lukewarm water." },
      { slot: "AM", title: "Moisturizer", detail: "Lightweight, non-comedogenic." },
      { slot: "AM", title: "Sunscreen SPF 30+", detail: "Two-finger length for face and neck." },
      { slot: "PM", title: "Cleanse", detail: "Remove sunscreen and grime fully." },
      { slot: "PM", title: "Niacinamide 5% (after patch test)", detail: "3 nights behind the ear first. If calm, alternate nights on face." },
      { slot: "PM", title: "Moisturizer", detail: "Slightly richer at night." },
    ],
  },
  full: {
    name: "Full — structured ladder",
    steps: [
      { slot: "AM", title: "Gentle cleanse", detail: "Mild face wash." },
      { slot: "AM", title: "Vitamin C (optional)", detail: "A few drops after patch testing; skip if stinging." },
      { slot: "AM", title: "Moisturizer", detail: "Barrier first." },
      { slot: "AM", title: "Sunscreen SPF 30+", detail: "Non-negotiable." },
      { slot: "PM", title: "Cleanse", detail: "Double cleanse only on heavy-sun/makeup days." },
      { slot: "PM", title: "Niacinamide 5% (patch-tested)", detail: "Alternate nights." },
      { slot: "PM", title: "Azelaic acid 10% (patch-tested)", detail: "The other nights. Never stack two new actives the same week." },
      { slot: "PM", title: "Moisturizer", detail: "Rich layer to finish." },
    ],
  },
};

export async function POST(req: NextRequest) {
  const g = await guard(req, {
    body: zodBody(skincareStartSchema),
    consent: "SKINCARE",
    rate: { max: 10, windowMs: 60_000 },
  });
  if (g instanceof NextResponse) return g;

  const { level, sensitiveSkin, pregnantOrBreastfeeding } = g.body as { level: string; sensitiveSkin: boolean; pregnantOrBreastfeeding: boolean };

  let steps = ROUTINES[level].steps;
  if (pregnantOrBreastfeeding) {
    // scrub actives entirely — obstetrician-guided only
    steps = steps.filter((s) => !/niacinamide|azelaic|vitamin c/i.test(s.title));
  }

  // content-validate every step (defense in depth)
  const flat = steps.map((s) => `${s.title} ${s.detail}`).join("\n");
  const v = validateContent(flat);
  if (!v.ok) return NextResponse.json({ error: { code: "DIY_030", message: "Routine content failed validation." } }, { status: 500 });

  const pack = packFor("SKINCARE_ROUTINE");
  return NextResponse.json({
    ok: true,
    routine: {
      name: pregnantOrBreastfeeding ? `${ROUTINES[level].name} (pregnancy-safe variant)` : ROUTINES[level].name,
      level,
      steps,
      patchTestRule: "Every new product: 3 nights behind the ear before the face.",
      stopRule: "Burning, peeling or spreading redness → pause everything (irritation pause) and simplify back to cleanser + moisturizer.",
      sources: pack.sources,
    },
    sensitiveSkin,
  });
}

/* irritation + reactions: recorded, and moderate/severe PAUSES the plan */
export async function PUT(req: NextRequest) {
  const g = await guard(req, {
    body: zodBody(skincareEventSchema),
    consent: "SKINCARE",
    rate: { max: 20, windowMs: 60_000 },
  });
  if (g instanceof NextResponse) return g;

  const { eventType, detail, severity } = g.body as { eventType: string; detail?: string; severity: string };

  const escalate = eventType === "irritation" || eventType === "patch_reaction" ? severity !== "mild" : severity === "severe";
  if (escalate) {
    await db.diyTask.updateMany({
      where: { category: "SKIN_ACNE", active: true, plan: { userId: g.userId, status: "ACTIVE" } },
      data: { active: false },
    });
  }

  await db.diySafetyEvent.create({
    data: {
      userId: g.userId,
      kind: `skincare_${eventType}`,
      severity,
      matchedPattern: eventType,
      sourceSnippet: (detail ?? "").slice(0, 240),
      action: escalate ? "PAUSED_SKINCARE" : "LOGGED",
    },
  });

  return NextResponse.json({
    ok: true,
    paused: escalate,
    message: escalate
      ? "Your skincare tasks are paused. Return to a plain cleanser + moisturizer until skin calms, then restart at the minimal level."
      : "Logged. Keep watching the patch area for another day.",
  });
}
