import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSubject } from "@/modules/foresight/subject";
import { runForesight, summarizeForDoctor } from "@/modules/foresight/engine";
import { normalizeForesightInput } from "@/modules/foresight/adapter";

/* POST /api/nx/foresight/run — validate input, run the engine
   server-side (authoritative version), persist the run, return
   the full report + clinician summary + normalized input (the
   client What-if Studio replays the same pure engine locally). */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const normalized = normalizeForesightInput(raw);
    if (!normalized.ok) {
      return NextResponse.json(
        { ok: false, error: "Nexura Predictive is built for adults (18+). For children and teens, please consult a paediatrician." },
        { status: 422 }
      );
    }
    const input = normalized.input;

    /* Engine runs server-side — the versions stamped here are authoritative. */
    const report = runForesight(input);
    const doctorSummary = summarizeForDoctor(report, input);

    const subjectKey = await getOrCreateSubject();
    const topDomainId = report.topDomainIds[0] ?? "metabolic";
    const created = await db.foresightRun.create({
      data: {
        subjectKey,
        score: report.foresightScore,
        band: report.scoreBand,
        triageLevel: report.triage.level,
        topDomainId,
        inputJson: JSON.stringify(input),
        reportJson: JSON.stringify(report),
        engineVer: report.engineVersion,
      },
    });

    return NextResponse.json({
      ok: true,
      data: { id: created.id, report, doctorSummary, input },
    });
  } catch (err) {
    console.error("[foresight/run]", err);
    return NextResponse.json(
      { ok: false, error: "The foresight engine could not complete. Nothing was saved incorrectly — please retry." },
      { status: 500 }
    );
  }
}
