import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPhiSubjectId } from "@/modules/phi/session";
import { requireScope } from "@/modules/phi/consent";
import { phiAudit } from "@/modules/phi/audit";
import { firstZodIssue, sharePostSchema } from "@/modules/phi/schemas";
import {
  buildSummaryExtra,
  filterSummarySections,
  generateShareToken,
  isGrantActive,
  mergeSummaryExtra,
  shareExpiryFromNow,
  type SummaryExtra,
} from "@/modules/phi/share-utils";
import { clinicianSummaryGenerator } from "@/modules/phi/assessment/engines";
import type { ClinicianSummary, PredictiveHealthAssessment } from "@/modules/phi/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* engines.ts (owned by PHI-E2) is extending generate(subjectId, assessment)
   to accept an optional third "extra" argument; this local signature compiles
   either way and passes extra at runtime when supported. */
type GenerateWithExtra = (
  subjectId: string,
  assessment: PredictiveHealthAssessment,
  extra?: SummaryExtra
) => ClinicianSummary;

function fail(status: number, code: string, error: string): NextResponse {
  return NextResponse.json({ ok: false, error, code }, { status });
}

function parseIncludes(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

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

/* --------------- POST /api/nx/phi/share — create a grant --------------- */

export async function POST(req: NextRequest) {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) return fail(401, "no_session", "No active PHI session.");

    const scopeErr = await requireScope(subjectId, "clinician_sharing");
    if (scopeErr) return fail(403, "consent_required", "Clinician-sharing consent is required to create a share link.");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }
    const parsed = sharePostSchema.safeParse(body);
    if (!parsed.success) return fail(400, "invalid_input", firstZodIssue(parsed.error));

    const assessment = await db.phiAssessment.findFirst({ where: { id: parsed.data.assessmentId, subjectId } });
    if (!assessment) return fail(404, "not_found", "Assessment not found.");

    const token = generateShareToken();
    const expiresAt = shareExpiryFromNow(parsed.data.expiresInDays);

    const grant = await db.phiShareGrant.create({
      data: {
        subjectId,
        assessmentId: assessment.id, // pin the exact assessment — prevents create/view drift
        token,
        includes: JSON.stringify(parsed.data.includes),
        dateFrom: parsed.data.dateFrom ?? null,
        dateTo: parsed.data.dateTo ?? null,
        expiresAt,
      },
    });

    await phiAudit.record({
      subjectId,
      action: "share.created",
      resource: `share:${grant.id}`,
      outcome: "ok",
      meta: { sections: parsed.data.includes.join(",").slice(0, 120), expires_in_days: parsed.data.expiresInDays },
    });

    return NextResponse.json({ ok: true, data: { token, expiresAt: expiresAt.toISOString() } }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/share POST", err instanceof Error ? err.message : "unknown");
    return fail(500, "server_error", "Unexpected server error.");
  }
}

/* --------------- GET /api/nx/phi/share?token=… — public capability view ---------------
   Works WITHOUT a session cookie by design: the token is the capability.
   Returns ONLY the granted sections of the PINNED assessment captured at
   grant creation (assessmentId column) — never "latest at view time".
   Expired/revoked/unknown tokens all return 404 (no existence leak). */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return fail(400, "invalid_input", "Query parameter 'token' is required.");

    const grant = await db.phiShareGrant.findUnique({ where: { token } });
    if (!grant || !isGrantActive(grant)) {
      return fail(404, "not_found", "Share link is not available.");
    }

    const subjectId = grant.subjectId;
    const row = await db.phiAssessment.findFirst({
      where: { id: grant.assessmentId, subjectId },
    });
    if (!row) return fail(404, "not_found", "Share link is not available.");

    let assessment: PredictiveHealthAssessment;
    try {
      assessment = JSON.parse(row.payload) as PredictiveHealthAssessment;
      /* Id alignment: reference the canonical DB row id. */
      assessment = { ...assessment, id: row.id };
    } catch {
      console.error("[phi] route error /api/nx/phi/share GET", "assessment payload unreadable");
      return fail(500, "server_error", "Unexpected server error.");
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
    const { statement, sections } = filterSummarySections(summary, parseIncludes(grant.includes));

    await phiAudit.record({
      subjectId,
      action: "share.viewed",
      resource: `share:${grant.id}`,
      outcome: "ok",
    });

    return NextResponse.json(
      { ok: true, data: { generatedAt: new Date().toISOString(), statement, sections } },
      { status: 200 }
    );
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/share GET", err instanceof Error ? err.message : "unknown");
    return fail(500, "server_error", "Unexpected server error.");
  }
}

/* --------------- DELETE /api/nx/phi/share?token=… — revoke (session required) --------------- */

export async function DELETE(req: NextRequest) {
  try {
    const subjectId = await getPhiSubjectId();
    if (!subjectId) return fail(401, "no_session", "No active PHI session.");

    const token = req.nextUrl.searchParams.get("token");
    if (!token) return fail(400, "invalid_input", "Query parameter 'token' is required.");

    const grant = await db.phiShareGrant.findUnique({ where: { token } });
    if (!grant || grant.subjectId !== subjectId) return fail(404, "not_found", "Share link not found.");

    if (!grant.revokedAt) {
      await db.phiShareGrant.update({ where: { token }, data: { revokedAt: new Date() } });
      await phiAudit.record({ subjectId, action: "share.revoked", resource: `share:${grant.id}`, outcome: "ok" });
    }

    return NextResponse.json({ ok: true, data: { revoked: true } }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/share DELETE", err instanceof Error ? err.message : "unknown");
    return fail(500, "server_error", "Unexpected server error.");
  }
}
