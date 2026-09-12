/* /api/diy/me — export (JSON, 9 sections) + two-step wipe.
   Guest or portal, ownership absolute. Export is audited;
   deletion requires { confirm: "DELETE" } and wipes every Diy*
   row owned by the user (guest rows included). */

import { NextRequest, NextResponse } from "next/server";
import { guard } from "../_lib";
import { db } from "@/lib/db";
import { AUDIT } from "@/lib/diy/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await guard(req, { consent: "EXPORT" });
  if (g instanceof NextResponse) return g;

  const [goals, plans, tasks, completions, progress, consents, conflicts, safetyEvents, generations] = await Promise.all([
    db.diyGoal.findMany({ where: { userId: g.userId } }),
    db.diyPlan.findMany({ where: { userId: g.userId } }),
    db.diyTask.findMany({ where: { plan: { userId: g.userId } } }),
    db.diyTaskCompletion.findMany({ where: { userId: g.userId } }),
    db.diyProgressLog.findMany({ where: { userId: g.userId } }),
    db.diyConsent.findMany({ where: { userId: g.userId } }),
    db.diyGoalConflict.findMany({ where: { userId: g.userId } }),
    db.diySafetyEvent.findMany({ where: { userId: g.userId } }),
    db.diyGeneration.findMany({ where: { userId: g.userId } }),
  ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    policyVersion: "2026-09-diy-1",
    sections: {
      goals,
      plans,
      tasks,
      completions,
      progress,
      consents,
      conflicts,
      safetyEvents,
      generations,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const g = await guard(req, { consent: "DELETE" });
  if (g instanceof NextResponse) return g;

  /* the shared guard has ALREADY consumed the request body (every
     non-GET/HEAD goes through it) — re-reading req.json() here always
     threw, making the wipe permanently 400. Read the parsed body. */
  const confirm = (g.body as { confirm?: string } | undefined)?.confirm ?? "";
  if (confirm !== "DELETE") {
    return NextResponse.json({ error: { code: "DIY_005", message: 'Send { "confirm": "DELETE" } to wipe DIY data.' } }, { status: 400 });
  }

  const plans = await db.diyPlan.findMany({ where: { userId: g.userId }, select: { id: true } });
  const planIds = plans.map((p) => p.id);

  await db.$transaction([
    db.diyTaskCompletion.deleteMany({ where: { userId: g.userId } }),
    db.diyTask.deleteMany({ where: { planId: { in: planIds } } }),
    db.diyMilestone.deleteMany({ where: { planId: { in: planIds } } }),
    db.diyPlanChange.deleteMany({ where: { planId: { in: planIds } } }),
    db.diyPlan.deleteMany({ where: { userId: g.userId } }),
    db.diyGoal.deleteMany({ where: { userId: g.userId } }),
    db.diyProgressLog.deleteMany({ where: { userId: g.userId } }),
    db.diyGoalConflict.deleteMany({ where: { userId: g.userId } }),
    db.diyConsent.deleteMany({ where: { userId: g.userId } }),
    db.diySafetyEvent.deleteMany({ where: { userId: g.userId } }),
    db.diyGeneration.deleteMany({ where: { userId: g.userId } }),
  ]);

  return NextResponse.json({ ok: true, wiped: true });
}
