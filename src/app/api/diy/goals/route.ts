/* /api/diy/goals — batch confirm + list. Server re-runs pacing
   floors and reconciliation on confirm; the client never sets
   the plan's timeframe directly. */

import { NextRequest, NextResponse } from "next/server";
import { guard, zodBody } from "../_lib";
import { withRoute } from "@/lib/nx/api";
import { goalsBatchSchema } from "@/lib/diy/schemas";
import { db } from "@/lib/db";
import { reconcile } from "@/lib/diy/compiler";
import { applyPacingFloor } from "@/lib/diy/safety/timeframe";
import type { DiyCategory } from "@/lib/diy/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute("diy.goals.list", async (req: NextRequest) => {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  const goals = await db.diyGoal.findMany({
    where: { userId: g.userId, status: { notIn: ["WITHDRAWN"] } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ goals });
});

export const POST = withRoute("diy.goals.batch", async (req: NextRequest) => {
  const g = await guard(req, {
    body: zodBody(goalsBatchSchema),
    consent: "GOALS_WRITE",
    rate: { max: 12, windowMs: 60_000 },
  });
  if (g instanceof NextResponse) return g;

  const { batchId, goals } = g.body as {
    batchId: string;
    goals: {
      clientKey: string;
      rawGoalText: string;
      category: string;
      requestedTimeframeDays?: number | null;
    }[];
  };

  // reconcile at category level (first-stated wins)
  const reconciled = reconcile(
    goals.map((x) => ({
      category: x.category,
      rawGoalText: x.rawGoalText,
      clientKey: x.clientKey,
    })),
  );

  const created: Awaited<ReturnType<typeof db.diyGoal.create>>[] = [];
  for (const goal of reconciled.kept) {
    const src = goals.find((x) => x.clientKey === goal.clientKey)!;
    const tf = applyPacingFloor(goal.category as DiyCategory, src.requestedTimeframeDays ?? null);
    const existing = await db.diyGoal.findUnique({
      where: { userId_batchId_clientKey: { userId: g.userId, batchId, clientKey: goal.clientKey } },
    });
    if (existing) {
      created.push(existing);
      continue;
    }
    const row = await db.diyGoal.create({
      data: {
        userId: g.userId,
        batchId,
        clientKey: goal.clientKey,
        rawGoalText: goal.rawGoalText,
        normalizedText: goal.rawGoalText.toLowerCase().slice(0, 600),
        category: goal.category,
        status: "CONFIRMED",
        requestedTimeframeDays: src.requestedTimeframeDays ?? null,
        timeframeDays: tf.days,
        confidence: 0.9,
        needsClarify: false,
      },
    });
    created.push(row);
  }

  return NextResponse.json({
    ok: true,
    goals: created,
    trimmed: reconciled.trimmed,
    conflicts: reconciled.conflicts,
    batchId,
  });
});
