import { NextRequest, NextResponse } from "next/server";
import { getPhiSubjectId } from "@/modules/phi/session";
import { getConsentState, setConsent } from "@/modules/phi/consent";
import { consentPutSchema, firstZodIssue } from "@/modules/phi/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/nx/phi/consent — full consent state for the subject (all scopes,
   DENIED-by-default). Auditing is handled inside the consent service. */
export async function GET() {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json(
        { ok: false, error: "No active PHI session.", code: "no_session" },
        { status: 401 }
      );
    }
    const consent = await getConsentState(subjectId);
    return NextResponse.json({ ok: true, data: consent }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/consent GET", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}

/* PUT /api/nx/phi/consent — {scope, granted}. Only scopes in CONSENT_SCOPES
   are accepted; withdrawal propagates inside the consent service. */
export async function PUT(req: NextRequest) {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json(
        { ok: false, error: "No active PHI session.", code: "no_session" },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }
    const parsed = consentPutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: firstZodIssue(parsed.error), code: "invalid_input" },
        { status: 400 }
      );
    }

    const consent = await setConsent(subjectId, parsed.data.scope, parsed.data.granted);
    return NextResponse.json({ ok: true, data: consent }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/consent PUT", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}
