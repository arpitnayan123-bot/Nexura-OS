import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPhiSubjectId } from "@/modules/phi/session";
import { requireScope } from "@/modules/phi/consent";
import { phiAudit } from "@/modules/phi/audit";
import { getConsentState } from "@/modules/phi/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* GET /api/nx/phi/export — full JSON export of the subject's own data.
   Gated by health_profile consent. The download body is the raw export
   object (not ApiResult-wrapped) so the file is a clean data archive;
   Content-Disposition makes browsers save it as a file. */
export async function GET() {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json({ ok: false, error: "No active PHI session.", code: "no_session" }, { status: 401 });
    }

    const scopeErr = await requireScope(subjectId, "health_profile");
    if (scopeErr) {
      return NextResponse.json(
        { ok: false, error: "Health-profile consent is required to export your data.", code: "consent_required" },
        { status: 403 }
      );
    }

    const [subject, consents, profile, symptoms, conditions, medications, allergies, lifestyle, vitals, labs, assessmentRows, feedback] =
      await Promise.all([
        db.phiSubject.findUnique({ where: { id: subjectId }, select: { id: true, label: true, createdAt: true } }),
        getConsentState(subjectId),
        db.phiHealthProfile.findUnique({ where: { subjectId } }),
        db.phiSymptomReport.findMany({ where: { subjectId }, orderBy: { createdAt: "asc" } }),
        db.phiConditionHistory.findMany({ where: { subjectId }, orderBy: { createdAt: "asc" } }),
        db.phiMedicationRecord.findMany({ where: { subjectId }, orderBy: { createdAt: "asc" } }),
        db.phiAllergyRecord.findMany({ where: { subjectId }, orderBy: { createdAt: "asc" } }),
        db.phiLifestyleRecord.findMany({ where: { subjectId }, orderBy: { recordedAt: "asc" } }),
        db.phiVitalRecord.findMany({ where: { subjectId }, orderBy: { measuredAt: "asc" } }),
        db.phiLaboratoryRecord.findMany({ where: { subjectId }, orderBy: { createdAt: "asc" } }),
        db.phiAssessment.findMany({ where: { subjectId }, orderBy: { createdAt: "asc" } }),
        db.phiFeedback.findMany({ where: { subjectId }, orderBy: { createdAt: "asc" } }),
      ]);

    if (!subject) {
      return NextResponse.json({ ok: false, error: "No active PHI session.", code: "no_session" }, { status: 401 });
    }

    const assessments = assessmentRows.map((a) => {
      try {
        return JSON.parse(a.payload);
      } catch {
        return { id: a.id, createdAt: a.createdAt.toISOString(), payloadUnreadable: true };
      }
    });

    const exportBody = {
      exportedAt: new Date().toISOString(),
      subject,
      consents,
      profile,
      symptoms,
      conditions,
      medications,
      allergies,
      lifestyle,
      vitals,
      labs,
      assessments,
      feedback,
    };

    await phiAudit.record({
      subjectId,
      action: "data.exported",
      resource: "export:full",
      outcome: "ok",
    });

    return new NextResponse(JSON.stringify(exportBody, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="nexura-phi-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/export GET", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}
