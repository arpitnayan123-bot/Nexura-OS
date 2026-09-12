/* /api/diy/generate — idempotent plan generation.
   Confirmed goals → deterministic modules → content validation
   → burden trim → single transaction. AI enrichment runs in
   shadow (logged, never persisted) when available. */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guard, zodBody, guardFail } from "../_lib";
import { db } from "@/lib/db";
import { generatePlans } from "@/lib/diy/compiler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const generateSchema = z.object({
  goalIds: z.array(z.string().min(5)).min(1).max(8),
  idempotencyKey: z.string().min(6).max(64),
});

export async function POST(req: NextRequest) {
  const g = await guard(req, {
    body: zodBody(generateSchema),
    consent: "GENERATE",
    rate: { max: 6, windowMs: 60_000 },
  });
  if (g instanceof NextResponse) return g;

  const { goalIds, idempotencyKey } = g.body as { goalIds: string[]; idempotencyKey: string };

  const goals = await db.diyGoal.findMany({
    where: { id: { in: goalIds }, userId: g.userId, status: "CONFIRMED" },
  });
  if (!goals.length) return guardFail("NOT_FOUND", "No confirmed goals to plan.", 404);

  const result = await generatePlans({
    userId: g.userId,
    idempotencyKey,
    confirmedGoals: goals.map((x) => ({
      id: x.id,
      category: x.category,
      rawGoalText: x.rawGoalText,
      requestedTimeframeDays: x.requestedTimeframeDays,
      timeframeDays: x.timeframeDays,
    })),
  });

  return NextResponse.json({
    ok: true,
    generationId: result.generationId,
    planIds: result.planIds,
    conflicts: result.conflicts,
    trimmed: result.trimmed,
    burdenNote: result.burdenNote,
  });
}
