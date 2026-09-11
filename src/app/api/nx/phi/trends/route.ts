import { NextResponse } from "next/server";
import { getPhiSubjectId } from "@/modules/phi/session";
import { requireScope } from "@/modules/phi/consent";
import { buildSnapshots } from "@/modules/phi/snapshot";
import { trendEngine } from "@/modules/phi/assessment/engines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/nx/phi/trends — trend observations over the subject's records.
   Requires the trends consent scope; withdrawal stops analysis immediately. */
export async function GET() {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json({ ok: false, error: "No active PHI session.", code: "no_session" }, { status: 401 });
    }

    const scopeErr = await requireScope(subjectId, "trends");
    if (scopeErr) {
      return NextResponse.json(
        { ok: false, error: "Trends consent is required to compute and show trend analysis.", code: "consent_required" },
        { status: 403 }
      );
    }

    const { records } = await buildSnapshots(subjectId);
    const trends = trendEngine.analyze(records);
    return NextResponse.json({ ok: true, data: { trends } }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/trends GET", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}
