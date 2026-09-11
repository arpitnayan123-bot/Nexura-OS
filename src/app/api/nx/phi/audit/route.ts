import { NextResponse } from "next/server";
import { getPhiSubjectId } from "@/modules/phi/session";
import { getAuditTrail } from "@/modules/phi/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseMeta(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/* GET /api/nx/phi/audit — the subject's own audit trail (latest 50).
   Meta is already PHI-scrubbed at write time; it is parsed to an object
   here for UI convenience only — never expanded or enriched. */
export async function GET() {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json({ ok: false, error: "No active PHI session.", code: "no_session" }, { status: 401 });
    }

    const rows = await getAuditTrail(subjectId, 50);
    return NextResponse.json(
      {
        ok: true,
        data: {
          items: rows.map((r) => ({
            id: r.id,
            action: r.action,
            resource: r.resource,
            outcome: r.outcome,
            meta: parseMeta(r.meta),
            createdAt: r.createdAt.toISOString(),
          })),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/audit GET", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}
