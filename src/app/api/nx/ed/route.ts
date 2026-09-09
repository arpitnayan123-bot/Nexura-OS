import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function acuityFromVitals(v: { pulseRate?: number | null; spo2?: number | null; bpSystolic?: number | null; temperatureC?: number | null } | null): { level: number; label: string; reason: string } {
  if (!v) return { level: 3, label: "Urgent", reason: "No vitals recorded yet" };
  if ((v.spo2 != null && v.spo2 < 90) || (v.bpSystolic != null && v.bpSystolic < 90) || (v.pulseRate != null && v.pulseRate > 130)) {
    return { level: 1, label: "Resuscitation", reason: "Derailing vitals — SpO2/BP/pulse thresholds breached" };
  }
  if ((v.spo2 != null && v.spo2 < 94) || (v.pulseRate != null && (v.pulseRate > 110 || v.pulseRate < 50)) || (v.temperatureC != null && v.temperatureC >= 39)) {
    return { level: 2, label: "Emergent", reason: "Abnormal vitals — needs rapid assessment" };
  }
  return { level: 3, label: "Urgent", reason: "Stable vitals within alert bounds" };
}

/** GET — Emergency department board. */
export async function GET(req: NextRequest) {
  const gate = await requireModule(req, "ed");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const edAdmissions = await db.hospitalAdmission.findMany({
    where: { hospitalId, admissionType: "emergency", admissionDate: { gte: new Date(Date.now() - 24 * 3600000) } },
    orderBy: { admissionDate: "desc" },
    include: {
      patient: { select: { id: true, fullName: true, uhid: true, age: true, gender: true, allergy: true } },
      bed: { include: { ward: true } },
      admittingDoctor: { select: { name: true } },
    },
  });

  const vitalsByPatient = await db.hospitalVital.findMany({
    where: { hospitalId, recordedAt: { gte: new Date(Date.now() - 24 * 3600000) } },
    orderBy: { recordedAt: "desc" },
  });

  const now = Date.now();
  const cases = edAdmissions.map((a) => {
    const v = vitalsByPatient.find((x) => x.patientId === a.patientId) || null;
    const acuity = acuityFromVitals(v);
    const waitMins = Math.round((now - new Date(a.admissionDate).getTime()) / 60000);
    return {
      id: a.id,
      patient: a.patient,
      diagnosis: a.admissionDiagnosis,
      doctor: a.admittingDoctor?.name,
      arrival: a.admissionDate,
      waitMins,
      acuity,
      location: a.bed ? `${a.bed.ward?.name} · ${a.bed.bedNumber}` : "ED — awaiting space",
      disposition: a.dischargeStatus,
      latestVitals: v ? { bp: `${v.bpSystolic}/${v.bpDiastolic}`, pulse: v.pulseRate, spo2: v.spo2, temp: v.temperatureC, at: v.recordedAt } : null,
    };
  });

  return NextResponse.json({
    cases,
    stats: {
      active: cases.filter((c) => c.disposition === "active").length,
      level1: cases.filter((c) => c.acuity.level === 1).length,
      waitingSpace: cases.filter((c) => c.location === "ED — awaiting space").length,
      avgWaitMins: cases.length ? Math.round(cases.reduce((s, c) => s + c.waitMins, 0) / cases.length) : 0,
      longWaits: cases.filter((c) => c.waitMins > 60 && c.disposition === "active").length,
    },
  });
}

/** PATCH — assign acuity / update disposition note (triage). */
export async function PATCH(req: NextRequest) {
  const gate = await requireModule(req, "ed");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!gate.session.hospitalId) return NextResponse.json({ error: "no_hospital" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  // Tenant-scoped triage target.
  const admission = await db.hospitalAdmission.findFirst({ where: { id: body.id, hospitalId: gate.session.hospitalId }, include: { patient: true } });
  if (!admission) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body.note) {
    await db.clinicalNote.create({
      data: {
        hospitalId: admission.hospitalId,
        patientUhid: admission.patientUhid,
        patientId: admission.patientId,
        admissionId: admission.id,
        noteType: "progress",
        fullText: `[triage by ${gate.session.name}/${gate.session.role}] ${String(body.note)}`,
      },
    });
  }
  await audit({
    hospitalId: admission.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
    action: "ed.triage", entityType: "HospitalAdmission", entityId: admission.id, patientId: admission.patientId,
    detail: { note: body.note || "triage update" },
  });
  return NextResponse.json({ ok: true });
}
