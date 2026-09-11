import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPhiSubjectId } from "@/modules/phi/session";
import { phiAudit } from "@/modules/phi/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* DELETE /api/nx/phi/data — erase all health rows for the subject.
   - phiConsent rows are KEPT (the user must never be silently re-consented).
   - The subject row is kept so the session and audit continuity survive.
   - Audit order: "data.delete_requested" (with per-bucket COUNTS only,
     before rows disappear) → deletion → "data.deleted" on the surviving subject. */
export async function DELETE() {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) {
      return NextResponse.json({ ok: false, error: "No active PHI session.", code: "no_session" }, { status: 401 });
    }

    const [profile, symptoms, conditions, medications, allergies, lifestyle, vitals, labs, assessments, feedback, shares, audits] =
      await Promise.all([
        db.phiHealthProfile.count({ where: { subjectId } }),
        db.phiSymptomReport.count({ where: { subjectId } }),
        db.phiConditionHistory.count({ where: { subjectId } }),
        db.phiMedicationRecord.count({ where: { subjectId } }),
        db.phiAllergyRecord.count({ where: { subjectId } }),
        db.phiLifestyleRecord.count({ where: { subjectId } }),
        db.phiVitalRecord.count({ where: { subjectId } }),
        db.phiLaboratoryRecord.count({ where: { subjectId } }),
        db.phiAssessment.count({ where: { subjectId } }),
        db.phiFeedback.count({ where: { subjectId } }),
        db.phiShareGrant.count({ where: { subjectId } }),
        db.phiAuditEvent.count({ where: { subjectId } }),
      ]);

    const counts = { profile, symptoms, conditions, medications, allergies, lifestyle, vitals, labs, assessments, feedback, shares, audits };

    await phiAudit.record({
      subjectId,
      action: "data.delete_requested",
      resource: "data:all",
      outcome: "ok",
      meta: {
        buckets: "profile,symptoms,conditions,medications,allergies,lifestyle,vitals,labs,assessments,feedback,shares,audits",
        ...counts,
      },
    });

    await db.$transaction([
      db.phiHealthProfile.deleteMany({ where: { subjectId } }),
      db.phiSymptomReport.deleteMany({ where: { subjectId } }),
      db.phiConditionHistory.deleteMany({ where: { subjectId } }),
      db.phiMedicationRecord.deleteMany({ where: { subjectId } }),
      db.phiAllergyRecord.deleteMany({ where: { subjectId } }),
      db.phiLifestyleRecord.deleteMany({ where: { subjectId } }),
      db.phiVitalRecord.deleteMany({ where: { subjectId } }),
      db.phiLaboratoryRecord.deleteMany({ where: { subjectId } }),
      db.phiAssessment.deleteMany({ where: { subjectId } }),
      db.phiFeedback.deleteMany({ where: { subjectId } }),
      db.phiShareGrant.deleteMany({ where: { subjectId } }),
      db.phiAuditEvent.deleteMany({ where: { subjectId } }),
    ]);

    await phiAudit.record({
      subjectId,
      action: "data.deleted",
      resource: "data:all",
      outcome: "ok",
      meta: { deleted: true },
    });

    return NextResponse.json({ ok: true, data: { deleted: true, counts } }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/data DELETE", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false, error: "Unexpected server error.", code: "server_error" }, { status: 500 });
  }
}
