import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readSubject } from "@/modules/foresight/subject";

/* GET /api/nx/foresight/run/[id] — full stored report for one run
   (opens a history item). Only the owning subject may read it. */

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subjectKey = await readSubject();
    if (!subjectKey) {
      return NextResponse.json({ ok: false, error: "No session" }, { status: 404 });
    }

    const row = await db.foresightRun.findFirst({
      where: { id, subjectKey },
    });
    if (!row) {
      return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        report: JSON.parse(row.reportJson),
        input: JSON.parse(row.inputJson),
      },
    });
  } catch (err) {
    console.error("[foresight/run/:id]", err);
    return NextResponse.json({ ok: false, error: "Could not open this run" }, { status: 500 });
  }
}
