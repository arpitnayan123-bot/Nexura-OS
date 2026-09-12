/* /api/diy/dashboard — today's rhythm: active tasks for today,
   today's completions, milestones on the horizon, active goals
   with their plans, unresolved conflicts (explained honestly). */

import { NextRequest, NextResponse } from "next/server";
import { guard } from "../_lib";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function today(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  const day = today();
  const [goals, plans, completions, conflicts, progress] = await Promise.all([
    db.diyGoal.findMany({
      where: { userId: g.userId, status: { in: ["ACTIVE", "PAUSED", "CONFIRMED", "COMPLETED"] } },
      orderBy: { createdAt: "asc" },
    }),
    db.diyPlan.findMany({
      where: { userId: g.userId, status: "ACTIVE" },
      include: { tasks: { where: { active: true }, orderBy: { id: "asc" } }, milestones: { orderBy: { targetDay: "asc" } }, goal: true },
    }),
    db.diyTaskCompletion.findMany({ where: { userId: g.userId, date: day } }),
    db.diyGoalConflict.findMany({ where: { userId: g.userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.diyProgressLog.findUnique({ where: { userId_date: { userId: g.userId, date: day } } }),
  ]);

  const planByGoal = new Map(plans.map((p) => [p.goalId, p]));
  const doneTaskIds = new Set(completions.map((c) => c.taskId));

  const todayTasks = plans.flatMap((p) =>
    p.tasks
      .filter((t) => t.cadence === "DAILY")
      .map((t) => ({
        id: t.id,
        title: t.title,
        detail: t.detail,
        estMinutes: t.estMinutes,
        category: t.category,
        goalText: p.goal.rawGoalText,
        status: doneTaskIds.has(t.id) ? (completions.find((c) => c.taskId === t.id)?.status ?? "PENDING") : "PENDING",
        note: completions.find((c) => c.taskId === t.id)?.note ?? null,
      }))
  );

  const weekly = plans.flatMap((p) => p.tasks.filter((t) => t.cadence === "WEEKLY").map((t) => ({ id: t.id, title: t.title, detail: t.detail, category: t.category, goalText: p.goal.rawGoalText })));

  return NextResponse.json({
    date: day,
    goals: goals.map((x) => ({ id: x.id, text: x.rawGoalText, category: x.category, status: x.status, timeframeDays: x.timeframeDays })),
    plans: plans.map((p) => ({
      id: p.id,
      goalId: p.goalId,
      goalText: p.goal.rawGoalText,
      version: p.version,
      summary: (JSON.parse(p.roadmap) as { summary: string }).summary,
      sourcePack: p.sourcePack,
      sourceKeys: p.sourceKeys,
      burdenMinutes: p.tasks.reduce((s, t) => s + t.estMinutes, 0),
      milestones: p.milestones.map((m) => ({ id: m.id, title: m.title, detail: m.detail, targetDay: m.targetDay })),
    })),
    todayTasks,
    weekly,
    doneCount: completions.filter((c) => c.status === "DONE").length,
    skippedCount: completions.filter((c) => c.status !== "DONE").length,
    conflicts: conflicts.map((c) => ({ id: c.id, rule: c.rule, explanation: c.explanation, resolution: c.resolution })),
    progressToday: progress,
  });
}
