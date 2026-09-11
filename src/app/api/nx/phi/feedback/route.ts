import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/auth/jwt";
import { getPhiSubjectId } from "@/modules/phi/session";
import { phiAudit } from "@/modules/phi/audit";
import { feedbackPostSchema, firstZodIssue } from "@/modules/phi/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* POST /api/nx/phi/feedback — {kind: unclear|incorrect|other, message?}.
   The free-text message is STORED for review but NEVER logged, audited,
   or echoed back. Rate limit: 5 submissions / minute / subject. */
export async function POST(req: NextRequest) {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json({ ok: false, error: "No active PHI session.", code: "no_session" }, { status: 401 });
    }

    const rl = rateLimit(`phi:feedback:${subjectId}`, 5, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { ok: false, error: "Feedback submissions are limited to 5 per minute. Please try again shortly.", code: "rate_limited" },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }
    const parsed = feedbackPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: firstZodIssue(parsed.error), code: "invalid_input" }, { status: 400 });
    }

    /* Optional assessment linkage — ownership enforced, existence never leaked to logs. */
    let assessmentId: string | null = null;
    if (parsed.data.assessmentId) {
      const owned = await db.phiAssessment.findFirst({ where: { id: parsed.data.assessmentId, subjectId } });
      if (!owned) {
        return NextResponse.json({ ok: false, error: "Assessment not found.", code: "not_found" }, { status: 404 });
      }
      assessmentId = owned.id;
    }

    const row = await db.phiFeedback.create({
      data: {
        subjectId,
        kind: parsed.data.kind,
        message: parsed.data.message ?? null,
        assessmentId,
      },
    });

    await phiAudit.record({
      subjectId,
      action: "feedback.recorded",
      resource: `feedback:${row.id}`,
      outcome: "ok",
      meta: { kind: parsed.data.kind },
    });

    return NextResponse.json({ ok: true, data: { received: true, id: row.id } }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/feedback POST", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}
