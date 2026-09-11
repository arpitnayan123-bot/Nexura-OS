import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPhiSubjectId } from "@/modules/phi/session";
import type { PredictiveHealthAssessment } from "@/modules/phi/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/* GET /api/nx/phi/assessment/[id] — full assessment payload (JSON column
   parsed) when owned by the subject; foreign or missing ids are both 404. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json({ ok: false, error: "No active PHI session.", code: "no_session" }, { status: 401 });
    }

    const row = await db.phiAssessment.findFirst({ where: { id, subjectId } });
    if (!row) {
      return NextResponse.json({ ok: false, error: "Assessment not found.", code: "not_found" }, { status: 404 });
    }

    let assessment: PredictiveHealthAssessment;
    try {
      assessment = JSON.parse(row.payload) as PredictiveHealthAssessment;
      /* Id alignment: expose the canonical DB row id (see assessment/run). */
      assessment = { ...assessment, id: row.id };
    } catch {
      console.error("[phi] route error /api/nx/phi/assessment/[id] GET", "assessment payload unreadable");
      return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: { assessment } }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/assessment/[id] GET", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}
