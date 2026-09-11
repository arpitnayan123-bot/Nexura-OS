import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPhiSubjectId } from "@/modules/phi/session";
import { requireScope } from "@/modules/phi/consent";
import { phiAudit } from "@/modules/phi/audit";
import { firstZodIssue, summaryPostSchema } from "@/modules/phi/schemas";
import { clinicianSummaryGenerator } from "@/modules/phi/assessment/engines";
import { buildSummaryExtra, mergeSummaryExtra, type SummaryExtra } from "@/modules/phi/share-utils";
import type { ClinicianSummary, PredictiveHealthAssessment } from "@/modules/phi/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* engines.ts (owned by PHI-E2) is extending generate(subjectId, assessment)
   to accept an optional third "extra" argument. Code against the 3-arg form
   defensively: this local signature compiles whether or not the extension
   has landed, and at runtime a 2-arg implementation simply ignores it. */
type GenerateWithExtra = (
  subjectId: string,
  assessment: PredictiveHealthAssessment,
  extra?: SummaryExtra
) => ClinicianSummary;

async function fetchSummaryRows(subjectId: string) {
  const [medications, allergies, vitals, labs, lifestyle, conditions] = await Promise.all([
    db.phiMedicationRecord.findMany({ where: { subjectId }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.phiAllergyRecord.findMany({ where: { subjectId }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.phiVitalRecord.findMany({ where: { subjectId }, orderBy: { measuredAt: "desc" }, take: 10 }),
    db.phiLaboratoryRecord.findMany({ where: { subjectId }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.phiLifestyleRecord.findMany({ where: { subjectId }, orderBy: { recordedAt: "desc" }, take: 1 }),
    db.phiConditionHistory.findMany({ where: { subjectId }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return { medications, allergies, vitals, labs, lifestyle: lifestyle[0] ?? null, conditions };
}

/* POST /api/nx/phi/summary — {assessmentId} → ClinicianSummary for the
   subject's own assessment. Gated by clinician_sharing consent. */
export async function POST(req: NextRequest) {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json({ ok: false, error: "No active PHI session.", code: "no_session" }, { status: 401 });
    }

    const scopeErr = await requireScope(subjectId, "clinician_sharing");
    if (scopeErr) {
      return NextResponse.json(
        { ok: false, error: "Clinician-sharing consent is required to generate a clinician summary.", code: "consent_required" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }
    const parsed = summaryPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: firstZodIssue(parsed.error), code: "invalid_input" }, { status: 400 });
    }

    const row = await db.phiAssessment.findFirst({ where: { id: parsed.data.assessmentId, subjectId } });
    if (!row) {
      return NextResponse.json({ ok: false, error: "Assessment not found.", code: "not_found" }, { status: 404 });
    }

    let assessment: PredictiveHealthAssessment;
    try {
      assessment = JSON.parse(row.payload) as PredictiveHealthAssessment;
      /* Id alignment: the summary should reference the canonical DB row id. */
      assessment = { ...assessment, id: row.id };
    } catch {
      console.error("[phi] route error /api/nx/phi/summary POST", "assessment payload unreadable");
      return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
    }

    const rows = await fetchSummaryRows(subjectId);
    const extra = buildSummaryExtra({
      medications: rows.medications,
      allergies: rows.allergies,
      vitals: rows.vitals,
      labs: rows.labs,
      lifestyle: rows.lifestyle,
      conditions: rows.conditions,
    });

    const generate = clinicianSummaryGenerator.generate as unknown as GenerateWithExtra;
    const summary = mergeSummaryExtra(generate(subjectId, assessment, extra), extra);

    await phiAudit.record({
      subjectId,
      action: "summary.generated",
      resource: `assessment:${row.id}`,
      outcome: "ok",
    });

    return NextResponse.json({ ok: true, data: { summary } }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/summary POST", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}
