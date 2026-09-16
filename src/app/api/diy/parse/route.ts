/* /api/diy/parse — chat intake parser.
   EMERGENCY short-circuits everything: DIY_041 + in-chat urgent
   card (112/108) — no goals parsed, nothing stored as a goal. */

import { NextRequest, NextResponse } from "next/server";
import { guard, zodBody } from "../_lib";
import { withRoute } from "@/lib/nx/api";
import { parseRequestSchema } from "@/lib/diy/schemas";
import { parseTranscript } from "@/lib/diy/compiler";
import { evaluateSafety, recordSafetyEvent } from "@/lib/diy/safety/engine";
import { normalizeHinglish } from "@/lib/diy/language";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withRoute("diy.parse.post", async (req: NextRequest) => {
  const g = await guard(req, {
    body: zodBody(parseRequestSchema),
    consent: "PARSE",
    rate: { max: 20, windowMs: 60_000 },
  });
  if (g instanceof NextResponse) return g;

  const { text } = g.body as { text: string; source: string };

  // safety FIRST — always the deterministic engine, never a model
  const verdict = evaluateSafety(text);
  await recordSafetyEvent({ userId: g.userId, text, verdict, surface: "parse" });

  if (verdict.action === "EMERGENCY" || verdict.action === "STOP_AND_REFER") {
    return NextResponse.json({
      safety: {
        action: verdict.action,
        message: verdict.message,
        matched: verdict.matched,
      },
      goals: [],
      language: null,
    });
  }

  const result = parseTranscript(text);

  return NextResponse.json({
    safety: { action: result.safety.action, message: result.safety.message, matched: result.safety.matched },
    language: result.language,
    goals: result.goals,
    detectedTextSample: normalizeHinglish(text).slice(0, 120),
  });
});
