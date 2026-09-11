import { NextResponse } from "next/server";
import { ensurePhiSession, getPhiSubjectId } from "@/modules/phi/session";
import { getConsentState } from "@/modules/phi/consent";
import { getKillSwitch } from "@/modules/phi/kill-switch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/nx/phi/session — resolve the current subject + consent state.
   401 (no_session) when no valid cookie exists; the UI then calls POST. */
export async function GET() {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json(
        { ok: false, error: "No active PHI session. Start a session first.", code: "no_session" },
        { status: 401 }
      );
    }
    const [killSwitch, consent] = await Promise.all([getKillSwitch(), getConsentState(subjectId)]);
    return NextResponse.json({ ok: true, data: { subjectId, demo: true, killSwitch, consent } }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/session GET", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}

/* POST /api/nx/phi/session — idempotent bootstrap: resolves or creates the
   subject, sets the httpOnly signed cookie, and returns the session payload. */
export async function POST() {
  try {
    const { subjectId, killSwitch } = await ensurePhiSession();
    return NextResponse.json({ ok: true, data: { subjectId, demo: true, killSwitch } }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/session POST", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Session could not be established.", code: "server_error" }, { status: 500 });
  }
}
