import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPhiSubjectId } from "@/modules/phi/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/nx/phi/assessment — history list (latest first, max 50).
   Lightweight list shape only; full payloads live at /assessment/[id]. */
export async function GET() {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json({ ok: false, error: "No active PHI session.", code: "no_session" }, { status: 401 });
    }

    const rows = await db.phiAssessment.findMany({
      where: { subjectId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, urgency: true, triageOnly: true, dataCompleteness: true, createdAt: true },
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          items: rows.map((r) => ({
            id: r.id,
            urgency: r.urgency,
            triageOnly: r.triageOnly,
            dataCompleteness: r.dataCompleteness,
            createdAt: r.createdAt.toISOString(),
          })),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/assessment GET", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}
