import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readSubject } from "@/modules/foresight/subject";

/* GET /api/nx/foresight/history — light list of the subject's
   past runs (no heavy payloads), newest first, capped at 20. */

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const subjectKey = await readSubject();
    if (!subjectKey) {
      return NextResponse.json({ ok: true, data: { runs: [], scoreSeries: [] } });
    }

    const rows = await db.foresightRun.findMany({
      where: { subjectKey },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        score: true,
        band: true,
        triageLevel: true,
        topDomainId: true,
        engineVer: true,
        createdAt: true,
      },
    });

    // Oldest -> newest score series for the trend sparkline
    const scoreSeries = [...rows]
      .reverse()
      .map((r) => ({ at: r.createdAt.toISOString(), score: r.score }));

    return NextResponse.json({
      ok: true,
      data: {
        runs: rows.map((r) => ({
          id: r.id,
          score: r.score,
          band: r.band,
          triageLevel: r.triageLevel,
          topDomainId: r.topDomainId,
          engineVer: r.engineVer,
          createdAt: r.createdAt.toISOString(),
        })),
        scoreSeries,
      },
    });
  } catch (err) {
    console.error("[foresight/history]", err);
    return NextResponse.json({ ok: false, error: "History unavailable right now" }, { status: 500 });
  }
}
