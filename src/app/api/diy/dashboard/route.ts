/* /api/diy/dashboard — today's rhythm: active tasks for today,
   today's completions, milestones on the horizon, active goals
   with their plans, unresolved conflicts (explained honestly).
   ALSO: current streak (consecutive days with >=1 done, ending
   today-or-yesterday) + per-plan day position (Day N of M,
   milestones reached). */

import { NextRequest, NextResponse } from "next/server";
import { guard } from "../_lib";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function istDayKey(d: Date): string {
  return new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

function today(): string {
  return istDayKey(new Date());
}

/** whole days between two IST day keys */
function dayDiff(fromKey: string, toKey: string): number {
  const a = Date.parse(`${fromKey}T00:00:00Z`);
  const b = Date.parse(`${toKey}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** consecutive days with >=1 DONE completion, ending today or yesterday.
    (Today with nothing done yet does NOT break yesterday's streak.) */
function computeStreak(dates: Set<string>, todayKey: string): number {
  let streak = 0;
  let cursor = new Date(`${todayKey}T00:00:00Z`);
  if (!dates.has(todayKey)) cursor = new Date(cursor.getTime() - 86_400_000); // start at yesterday
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dates.has(key)) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - 86_400_000);
    if (streak >= 3650) break; // sanity cap (~10 years)
  }
  return streak;
}

export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  const day = today();
  const since = new Date(Date.now() - 120 * 86_400_000); // streak horizon: 120 days
  const [goals, plans, completions, conflicts, progress, recentCompletions] = await Promise.all([
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
    db.diyTaskCompletion.findMany({
      where: { userId: g.userId, status: "DONE", date: { gte: istDayKey(since) } },
      select: { date: true },
      distinct: ["date"],
    }),
  ]);

  const doneDays = new Set(recentCompletions.map((c) => c.date));
  const streak = computeStreak(doneDays, day);

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

  const weekly = plans.flatMap((p) => p.tasks.filter((t) => t.cadence === "WEEKLY").map((t) => ({ id: t.id, title: t.title, detail: t.detail, category: t.category, goalText: p.goal.rawGoalText, status: doneTaskIds.has(t.id) ? (completions.find((c) => c.taskId === t.id)?.status ?? "PENDING") : "PENDING" })));

  return NextResponse.json({
    date: day,
    streak,
    goals: goals.map((x) => ({ id: x.id, text: x.rawGoalText, category: x.category, status: x.status, timeframeDays: x.timeframeDays })),
    plans: plans.map((p) => {
      const startedDay = istDayKey(p.createdAt);
      const dayNumber = Math.min(Math.max(dayDiff(startedDay, day) + 1, 1), Math.max(p.goal.timeframeDays ?? 1, 1));
      return {
        id: p.id,
        goalId: p.goalId,
        goalText: p.goal.rawGoalText,
        version: p.version,
        summary: (JSON.parse(p.roadmap) as { summary: string }).summary,
        sourcePack: p.sourcePack,
        sourceKeys: p.sourceKeys,
        burdenMinutes: p.tasks.reduce((s, t) => s + t.estMinutes, 0),
        startedAt: startedDay,
        dayNumber,
        totalDays: p.goal.timeframeDays,
        milestones: p.milestones.map((m) => ({ id: m.id, title: m.title, detail: m.detail, targetDay: m.targetDay, reached: dayNumber >= m.targetDay })),
      };
    }),
    todayTasks,
    weekly,
    doneCount: completions.filter((c) => c.status === "DONE").length,
    skippedCount: completions.filter((c) => c.status !== "DONE").length,
    conflicts: conflicts.map((c) => ({ id: c.id, rule: c.rule, explanation: c.explanation, resolution: c.resolution })),
    progressToday: progress,
  });
}
