import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/auth/jwt";
import { getPhiSubjectId } from "@/modules/phi/session";
import { runAssessment, PhiAssessmentBlockedError } from "@/modules/phi/assessment/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/nx/phi/assessment/run — executes the full PHI pipeline.
   Blocked runs (consent / kill-switch) surface as 403 with the engine's
   code and message; runAssessment already audits both success and denial,
   so this route never double-audits. Rate limit: 10 runs / minute / subject. */
export async function POST() {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json({ ok: false, error: "No active PHI session.", code: "no_session" }, { status: 401 });
    }

    const rl = rateLimit(`phi:assessment-run:${subjectId}`, 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: "Assessments are limited to 10 runs per minute. Please wait a moment and try again.", code: "rate_limited" },
        { status: 429 }
      );
    }

    try {
      const assessment = await runAssessment(subjectId);
      /* Id alignment: run.ts stores a UUID inside the payload while the DB row
         uses its own cuid. Match the just-created row by the payload UUID and
         return the ROW id, so every id the UI ever sees (run, list, one,
         summary, share) is the same canonical identifier. */
      const row = await db.phiAssessment.findFirst({
        where: { subjectId, payload: { contains: assessment.id } },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      return NextResponse.json(
        { ok: true, data: { assessment: { ...assessment, id: row?.id ?? assessment.id } } },
        { status: 200 }
      );
    } catch (err) {
      if (err instanceof PhiAssessmentBlockedError) {
        const code = err.code === "KILL_SWITCH" ? "kill_switch" : "consent_required";
        return NextResponse.json({ ok: false, error: err.message, code }, { status: 403 });
      }
      throw err;
    }
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/assessment/run POST", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}
