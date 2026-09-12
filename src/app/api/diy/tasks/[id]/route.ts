/* /api/diy/tasks/[id] — mark done / skipped / not-feasible / note.
   Ownership-checked; idempotent per task+user+day (upsert). */

import { NextRequest, NextResponse } from "next/server";
import { guard, zodBody, guardFail } from "../../_lib";
import { taskActionSchema } from "@/lib/diy/schemas";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function today(): string {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard(req, {
    body: zodBody(taskActionSchema),
    consent: "TASKS",
    rate: { max: 120, windowMs: 60_000 },
  });
  if (g instanceof NextResponse) return g;

  const { id } = await ctx.params;
  const { action, note } = g.body as { action: string; note?: string };

  const task = await db.diyTask.findFirst({
    where: { id, active: true, plan: { userId: g.userId } },
  });
  if (!task) return guardFail("NOT_FOUND", "Task not found.", 404);

  const status = action === "done" ? "DONE" : action === "skipped" ? "SKIPPED" : action === "not_feasible" ? "NOT_FEASIBLE" : "PENDING";

  const completion = await db.diyTaskCompletion.upsert({
    where: { taskId_userId_date: { taskId: task.id, userId: g.userId, date: today() } },
    create: { taskId: task.id, userId: g.userId, date: today(), status, note },
    update: { status, note: note ?? undefined },
  });

  return NextResponse.json({ ok: true, completion });
}
