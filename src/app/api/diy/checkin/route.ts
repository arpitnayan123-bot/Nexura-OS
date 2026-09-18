/* /api/diy/checkin — weekly reflection: mood/energy/sleep 1-5 +
   optional notes. Stored as today's progress row (upsert). */

import { NextRequest, NextResponse } from "next/server";
import { guard, zodBody } from "../_lib";
import { withRoute } from "@/lib/nx/api";
import { checkinSchema } from "@/lib/diy/schemas";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function today(): string {
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  return ist.toISOString().slice(0, 10);
}

export const POST = withRoute("diy.checkin.post", async (req: NextRequest) => {
  const g = await guard(req, {
    body: zodBody(checkinSchema),
    consent: "CHECKIN",
    rate: { max: 10, windowMs: 60_000 },
  });
  if (g instanceof NextResponse) return g;

  const b = g.body as { mood: number; energy: number; sleep: number; userNotes?: string };
  const row = await db.diyProgressLog.upsert({
    where: { userId_date: { userId: g.userId, date: today() } },
    create: {
      userId: g.userId,
      date: today(),
      mood: b.mood,
      energy: b.energy,
      sleep: b.sleep,
      userNotes: b.userNotes,
      completedTasks: 0,
      skippedTasks: 0,
    },
    update: { mood: b.mood, energy: b.energy, sleep: b.sleep, userNotes: b.userNotes },
  });

  return NextResponse.json({
    ok: true,
    checkin: { date: row.date, mood: row.mood, energy: row.energy, sleep: row.sleep },
  });
});
