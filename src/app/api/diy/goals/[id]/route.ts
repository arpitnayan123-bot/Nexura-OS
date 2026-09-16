/* /api/diy/goals/[id] — single-goal state machine actions.
   Every transition validated server-side (canTransition);
   reparse re-runs safety + classification. */

import { NextRequest, NextResponse } from "next/server";
import { guard, zodBody, guardFail } from "../../_lib";
import { withRoute } from "@/lib/nx/api";
import { goalActionSchema } from "@/lib/diy/schemas";
import { db } from "@/lib/db";
import { evaluateSafety, classifyCategory, recordSafetyEvent } from "@/lib/diy/safety/engine";
import { applyPacingFloor } from "@/lib/diy/safety/timeframe";
import { normalizeHinglish, extractTimeframeDays } from "@/lib/diy/language";
import { canTransition, type GoalState, type DiyCategory } from "@/lib/diy/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_FOR_ACTION: Record<string, GoalState> = {
  confirm: "CONFIRMED",
  clarify: "CLARIFYING",
  pause: "PAUSED",
  resume: "ACTIVE",
  complete: "COMPLETED",
  archive: "ARCHIVED",
  not_feasible: "NOT_FEASIBLE",
};

export const POST = withRoute<{ id: string }>("diy.goal.action", async (req: NextRequest, ctx) => {
  const g = await guard(req, {
    body: zodBody(goalActionSchema),
    consent: "GOALS_WRITE",
    rate: { max: 20, windowMs: 60_000 },
  });
  if (g instanceof NextResponse) return g;

  const { id } = await ctx.params;
  const { action, rawGoalText, category } = g.body as { action: string; rawGoalText?: string; category?: string };

  const goal = await db.diyGoal.findFirst({ where: { id, userId: g.userId } });
  if (!goal) return guardFail("NOT_FOUND", "Goal not found.", 404);

  /* reparse: re-run safety + classification on edited text */
  if (action === "reparse") {
    if (!rawGoalText) return guardFail("INVALID_BODY", "Edited goal text is required for reparse.");
    const verdict = evaluateSafety(rawGoalText);
    await recordSafetyEvent({ userId: g.userId, text: rawGoalText, verdict, surface: "goal_reparse" });
    if (verdict.action === "EMERGENCY" || verdict.action === "STOP_AND_REFER") {
      return NextResponse.json({ safety: { action: verdict.action, message: verdict.message } });
    }
    const { category: cat, confidence } = classifyCategory(normalizeHinglish(rawGoalText));
    const tf = applyPacingFloor(cat as DiyCategory, extractTimeframeDays(rawGoalText));
    const updated = await db.diyGoal.update({
      where: { id: goal.id },
      data: {
        rawGoalText,
        normalizedText: rawGoalText.toLowerCase().slice(0, 600),
        category: cat || goal.category,
        confidence,
        requestedTimeframeDays: extractTimeframeDays(rawGoalText),
        timeframeDays: tf.days,
        needsClarify: !cat,
      },
    });
    return NextResponse.json({ ok: true, goal: updated, safety: { action: verdict.action } });
  }

  const target = STATE_FOR_ACTION[action];
  if (!target) return guardFail("INVALID_BODY", "Unknown action.");
  if (!canTransition(goal.status as GoalState, target)) {
    return guardFail("STATE_FORBIDDEN", `Cannot ${action} a goal that is ${goal.status}.`, 409);
  }

  const updated = await db.diyGoal.update({ where: { id: goal.id }, data: { status: target } });
  return NextResponse.json({ ok: true, goal: updated });
});
