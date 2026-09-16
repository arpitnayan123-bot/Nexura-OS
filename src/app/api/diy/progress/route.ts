/* /api/diy/progress — daily log upsert (counts + optional
   symptoms/mood/energy/sleep/notes). */

import { NextRequest, NextResponse } from "next/server";
import { guard, zodBody } from "../_lib";
import { withRoute } from "@/lib/nx/api";
import { progressSchema } from "@/lib/diy/schemas";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withRoute("diy.progress.upsert", async (req: NextRequest) => {
  const g = await guard(req, {
    body: zodBody(progressSchema),
    consent: "PROGRESS",
    rate: { max: 20, windowMs: 60_000 },
  });
  if (g instanceof NextResponse) return g;

  const b = g.body as { date: string; completedTasks: number; skippedTasks: number; symptoms?: string; mood?: number; energy?: number; sleep?: number; userNotes?: string };

  const row = await db.diyProgressLog.upsert({
    where: { userId_date: { userId: g.userId, date: b.date } },
    create: {
      userId: g.userId,
      date: b.date,
      completedTasks: b.completedTasks,
      skippedTasks: b.skippedTasks,
      symptoms: b.symptoms,
      mood: b.mood,
      energy: b.energy,
      sleep: b.sleep,
      userNotes: b.userNotes,
    },
    update: {
      completedTasks: b.completedTasks,
      skippedTasks: b.skippedTasks,
      symptoms: b.symptoms ?? undefined,
      mood: b.mood ?? undefined,
      energy: b.energy ?? undefined,
      sleep: b.sleep ?? undefined,
      userNotes: b.userNotes ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, progress: row });
});

export const GET = withRoute("diy.progress.list", async (req: NextRequest) => {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  const logs = await db.diyProgressLog.findMany({
    where: { userId: g.userId },
    orderBy: { date: "desc" },
    take: 60,
  });
  return NextResponse.json({ logs });
});
