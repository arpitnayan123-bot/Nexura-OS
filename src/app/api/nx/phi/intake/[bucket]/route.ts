import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPhiSubjectId } from "@/modules/phi/session";
import { requireScope } from "@/modules/phi/consent";
import { phiAudit } from "@/modules/phi/audit";
import {
  allergySchema,
  conditionSchema,
  firstZodIssue,
  isIntakeBucket,
  labSchema,
  lifestyleSchema,
  medicationSchema,
  symptomSchema,
  vitalsSchema,
} from "@/modules/phi/schemas";
import type { IntakeBucket } from "@/modules/phi/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ bucket: string }> };

const LIST_LIMIT = 50;

function fail(status: number, code: string, error: string): NextResponse {
  return NextResponse.json({ ok: false, error, code }, { status });
}

function notFoundBucket(): NextResponse {
  return fail(404, "not_found", "Unknown intake bucket. Valid buckets: symptoms, conditions, medications, allergies, lifestyle, vitals, labs.");
}

async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

/* --------------- shared guards --------------- */

async function guard(bucket: string): Promise<{ subjectId: string } | NextResponse> {
  if (!isIntakeBucket(bucket)) return notFoundBucket();
  const subjectId = await getPhiSubjectId();
  if (!subjectId) return fail(401, "no_session", "No active PHI session.");
  const scopeErr = await requireScope(subjectId, "health_profile");
  if (scopeErr) return fail(403, "consent_required", "Health-profile consent is required before health data can be stored.");
  return { subjectId };
}

/* --------------- POST /api/nx/phi/intake/[bucket] --------------- */

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { bucket } = await ctx.params;
    const g = await guard(bucket);
    if (g instanceof NextResponse) return g;
    const subjectId = g.subjectId;

    const body = await readJson(req);
    if (body === undefined || typeof body !== "object" || body === null) {
      return fail(400, "invalid_input", "expected a JSON object body");
    }

    switch (bucket) {
      case "symptoms": {
        const r = symptomSchema.safeParse(body);
        if (!r.success) return fail(400, "invalid_input", firstZodIssue(r.error));
        const row = await db.phiSymptomReport.create({
          data: {
            subjectId,
            category: r.data.category,
            userWording: r.data.userWording,
            bodyLocation: r.data.bodyLocation ?? null,
            onsetAt: r.data.onsetAt ?? null,
            durationDays: r.data.durationDays ?? null,
            severity1to10: r.data.severity1to10,
            frequency: r.data.frequency ?? null,
            pattern: r.data.pattern ?? null,
            triggers: r.data.triggers ?? null,
            relieving: r.data.relieving ?? null,
            worsening: r.data.worsening ?? null,
            associated: JSON.stringify(r.data.associated),
            denied: JSON.stringify(r.data.denied),
            isNew: r.data.isNew,
            isWorsening: r.data.isWorsening,
            confidence: r.data.confidence ?? null,
          },
        });
        await phiAudit.record({ subjectId, action: "intake.saved", resource: "intake:symptoms", outcome: "ok", meta: { bucket: "symptoms" } });
        return NextResponse.json({ ok: true, data: { id: row.id, bucket, savedAt: row.createdAt.toISOString() } }, { status: 200 });
      }

      case "conditions": {
        const r = conditionSchema.safeParse(body);
        if (!r.success) return fail(400, "invalid_input", firstZodIssue(r.error));
        const row = await db.phiConditionHistory.create({
          data: {
            subjectId,
            name: r.data.name,
            source: r.data.source,
            diagnosedYear: r.data.diagnosedYear ?? null,
            status: r.data.status,
            treatmentStatus: r.data.treatmentStatus ?? null,
            complications: r.data.complications ?? null,
          },
        });
        await phiAudit.record({ subjectId, action: "intake.saved", resource: "intake:conditions", outcome: "ok", meta: { bucket: "conditions" } });
        return NextResponse.json({ ok: true, data: { id: row.id, bucket, savedAt: row.createdAt.toISOString() } }, { status: 200 });
      }

      case "medications": {
        const r = medicationSchema.safeParse(body);
        if (!r.success) return fail(400, "invalid_input", firstZodIssue(r.error));
        const row = await db.phiMedicationRecord.create({
          data: {
            subjectId,
            name: r.data.name,
            strength: r.data.strength ?? null,
            frequency: r.data.frequency ?? null,
            reason: r.data.reason ?? null,
            prescribedBy: r.data.prescribedBy ?? null,
            startedAt: r.data.startedAt ?? null,
            adverseReactions: r.data.adverseReactions ?? null,
          },
        });
        await phiAudit.record({ subjectId, action: "intake.saved", resource: "intake:medications", outcome: "ok", meta: { bucket: "medications" } });
        return NextResponse.json({ ok: true, data: { id: row.id, bucket, savedAt: row.createdAt.toISOString() } }, { status: 200 });
      }

      case "allergies": {
        const r = allergySchema.safeParse(body);
        if (!r.success) return fail(400, "invalid_input", firstZodIssue(r.error));
        const row = await db.phiAllergyRecord.create({
          data: {
            subjectId,
            substance: r.data.substance,
            reaction: r.data.reaction ?? null,
            severity: r.data.severity,
          },
        });
        await phiAudit.record({ subjectId, action: "intake.saved", resource: "intake:allergies", outcome: "ok", meta: { bucket: "allergies" } });
        return NextResponse.json({ ok: true, data: { id: row.id, bucket, savedAt: row.createdAt.toISOString() } }, { status: 200 });
      }

      case "lifestyle": {
        const r = lifestyleSchema.safeParse(body);
        if (!r.success) return fail(400, "invalid_input", firstZodIssue(r.error));
        const row = await db.phiLifestyleRecord.create({
          data: {
            subjectId,
            sleepHours: r.data.sleepHours,
            sleepQuality: r.data.sleepQuality,
            activityMinutesWeek: r.data.activityMinutesWeek,
            sedentaryHours: r.data.sedentaryHours ?? null,
            mealPattern: r.data.mealPattern ?? null,
            fruitsVegFrequency: r.data.fruitsVegFrequency ?? null,
            proteinSources: r.data.proteinSources ?? null,
            waterGlasses: r.data.waterGlasses ?? null,
            tobacco: r.data.tobacco,
            alcohol: r.data.alcohol,
            stressLevel: r.data.stressLevel,
            workSchedule: r.data.workSchedule ?? null,
            socialSupport: r.data.socialSupport ?? null,
            recordedAt: new Date(),
          },
        });
        await phiAudit.record({ subjectId, action: "intake.saved", resource: "intake:lifestyle", outcome: "ok", meta: { bucket: "lifestyle" } });
        return NextResponse.json({ ok: true, data: { id: row.id, bucket, savedAt: row.createdAt.toISOString() } }, { status: 200 });
      }

      case "vitals": {
        const r = vitalsSchema.safeParse(body);
        if (!r.success) return fail(400, "invalid_input", firstZodIssue(r.error));
        const v = r.data;
        const row = await db.phiVitalRecord.create({
          data: {
            subjectId,
            systolic: v.systolic ?? null,
            diastolic: v.diastolic ?? null,
            heartRate: v.heartRate ?? null,
            temperatureC: v.temperatureC ?? null,
            spo2: v.spo2 ?? null,
            glucoseMgDl: v.glucoseMgDl ?? null,
            weightKg: v.weightKg ?? null,
            atRest: v.atRest,
            deviceSource: v.deviceSource,
            confidence: v.confidence ?? null,
            measuredAt: v.measuredAt ? new Date(v.measuredAt) : new Date(),
          },
        });
        await phiAudit.record({ subjectId, action: "intake.saved", resource: "intake:vitals", outcome: "ok", meta: { bucket: "vitals" } });
        return NextResponse.json({ ok: true, data: { id: row.id, bucket, savedAt: row.createdAt.toISOString() } }, { status: 200 });
      }

      case "labs": {
        const r = labSchema.safeParse(body);
        if (!r.success) return fail(400, "invalid_input", firstZodIssue(r.error));
        const row = await db.phiLaboratoryRecord.create({
          data: {
            subjectId,
            testName: r.data.testName,
            resultValue: r.data.resultValue,
            unit: r.data.unit,
            refRangeLow: r.data.refRangeLow ?? null,
            refRangeHigh: r.data.refRangeHigh ?? null,
            collectedAt: r.data.collectedAt ? new Date(r.data.collectedAt) : null,
            labSource: r.data.labSource ?? null,
          },
        });
        await phiAudit.record({ subjectId, action: "intake.saved", resource: "intake:labs", outcome: "ok", meta: { bucket: "labs" } });
        return NextResponse.json({ ok: true, data: { id: row.id, bucket, savedAt: row.createdAt.toISOString() } }, { status: 200 });
      }

      default:
        return notFoundBucket();
    }
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/intake/[bucket] POST", err instanceof Error ? err.message : "unknown");
    return fail(500, "server_error", "Unexpected server error.");
  }
}

/* --------------- GET /api/nx/phi/intake/[bucket] — list latest 50 --------------- */

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { bucket } = await ctx.params;
    const g = await guard(bucket);
    if (g instanceof NextResponse) return g;
    const subjectId = g.subjectId;

    switch (bucket as IntakeBucket) {
      case "symptoms": {
        const items = await db.phiSymptomReport.findMany({ where: { subjectId }, orderBy: { createdAt: "desc" }, take: LIST_LIMIT });
        return NextResponse.json({ ok: true, data: { bucket, items } }, { status: 200 });
      }
      case "conditions": {
        const items = await db.phiConditionHistory.findMany({ where: { subjectId }, orderBy: { createdAt: "desc" }, take: LIST_LIMIT });
        return NextResponse.json({ ok: true, data: { bucket, items } }, { status: 200 });
      }
      case "medications": {
        const items = await db.phiMedicationRecord.findMany({ where: { subjectId }, orderBy: { createdAt: "desc" }, take: LIST_LIMIT });
        return NextResponse.json({ ok: true, data: { bucket, items } }, { status: 200 });
      }
      case "allergies": {
        const items = await db.phiAllergyRecord.findMany({ where: { subjectId }, orderBy: { createdAt: "desc" }, take: LIST_LIMIT });
        return NextResponse.json({ ok: true, data: { bucket, items } }, { status: 200 });
      }
      case "lifestyle": {
        const items = await db.phiLifestyleRecord.findMany({ where: { subjectId }, orderBy: { recordedAt: "desc" }, take: LIST_LIMIT });
        return NextResponse.json({ ok: true, data: { bucket, items } }, { status: 200 });
      }
      case "vitals": {
        const items = await db.phiVitalRecord.findMany({ where: { subjectId }, orderBy: { measuredAt: "desc" }, take: LIST_LIMIT });
        return NextResponse.json({ ok: true, data: { bucket, items } }, { status: 200 });
      }
      case "labs": {
        const items = await db.phiLaboratoryRecord.findMany({ where: { subjectId }, orderBy: { createdAt: "desc" }, take: LIST_LIMIT });
        return NextResponse.json({ ok: true, data: { bucket, items } }, { status: 200 });
      }
      default:
        return notFoundBucket();
    }
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/intake/[bucket] GET", err instanceof Error ? err.message : "unknown");
    return fail(500, "server_error", "Unexpected server error.");
  }
}

/* --------------- DELETE /api/nx/phi/intake/[bucket]?id=… --------------- */

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const { bucket } = await ctx.params;
    const g = await guard(bucket);
    if (g instanceof NextResponse) return g;
    const subjectId = g.subjectId;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return fail(400, "invalid_input", "Query parameter 'id' is required.");

    /* Ownership is enforced in the query itself — a foreign id is indistinguishable from a missing one (404). */
    switch (bucket as IntakeBucket) {
      case "symptoms": {
        const row = await db.phiSymptomReport.findFirst({ where: { id, subjectId } });
        if (!row) return fail(404, "not_found", "Entry not found.");
        await db.phiSymptomReport.delete({ where: { id } });
        break;
      }
      case "conditions": {
        const row = await db.phiConditionHistory.findFirst({ where: { id, subjectId } });
        if (!row) return fail(404, "not_found", "Entry not found.");
        await db.phiConditionHistory.delete({ where: { id } });
        break;
      }
      case "medications": {
        const row = await db.phiMedicationRecord.findFirst({ where: { id, subjectId } });
        if (!row) return fail(404, "not_found", "Entry not found.");
        await db.phiMedicationRecord.delete({ where: { id } });
        break;
      }
      case "allergies": {
        const row = await db.phiAllergyRecord.findFirst({ where: { id, subjectId } });
        if (!row) return fail(404, "not_found", "Entry not found.");
        await db.phiAllergyRecord.delete({ where: { id } });
        break;
      }
      case "lifestyle": {
        const row = await db.phiLifestyleRecord.findFirst({ where: { id, subjectId } });
        if (!row) return fail(404, "not_found", "Entry not found.");
        await db.phiLifestyleRecord.delete({ where: { id } });
        break;
      }
      case "vitals": {
        const row = await db.phiVitalRecord.findFirst({ where: { id, subjectId } });
        if (!row) return fail(404, "not_found", "Entry not found.");
        await db.phiVitalRecord.delete({ where: { id } });
        break;
      }
      case "labs": {
        const row = await db.phiLaboratoryRecord.findFirst({ where: { id, subjectId } });
        if (!row) return fail(404, "not_found", "Entry not found.");
        await db.phiLaboratoryRecord.delete({ where: { id } });
        break;
      }
      default:
        return notFoundBucket();
    }

    await phiAudit.record({ subjectId, action: "intake.deleted", resource: `intake:${bucket}`, outcome: "ok", meta: { bucket } });
    return NextResponse.json({ ok: true, data: { deleted: true, id } }, { status: 200 });
  } catch (err) {
    console.error("[phi] route error /api/nx/phi/intake/[bucket] DELETE", err instanceof Error ? err.message : "unknown");
    return fail(500, "server_error", "Unexpected server error.");
  }
}
