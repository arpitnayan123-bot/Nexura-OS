import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";
import { fire } from "@/lib/nx/automations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — encounters (active admissions with full context). */
export async function GET(req: NextRequest) {
  const gate = requireModule(req, "patients");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;

  const admissions = await db.hospitalAdmission.findMany({
    where: { hospitalId },
    orderBy: { admissionDate: "desc" },
    take: 50,
    include: {
      patient: { select: { fullName: true, uhid: true, age: true, gender: true, bloodGroup: true, allergy: true } },
      bed: { include: { ward: true } },
      admittingDoctor: { select: { name: true } },
      orders: { where: { status: { in: ["ordered", "acknowledged", "in_progress"] } }, select: { id: true } },
    },
  });
  return NextResponse.json({
    encounters: admissions.map((a) => ({
      id: a.id, patient: a.patient, uhid: a.patientUhid,
      type: a.admissionType, diagnosis: a.admissionDiagnosis, doctor: a.admittingDoctor?.name,
      admittedAt: a.admissionDate, expectedDischarge: a.expectedDischargeDate,
      dischargeStatus: a.dischargeStatus, dischargeDate: a.actualDischargeDate,
      location: a.bed ? `${a.bed.ward?.name} · ${a.bed.bedNumber}` : null,
      activeOrders: a.orders.length,
    })),
  });
}

/** POST — admit patient to a bed (ER handoff / elective admission). */
export async function POST(req: NextRequest) {
  const gate = requireModule(req, "patients");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;
  const body = await req.json().catch(() => ({}));
  if (!body.patientId || !body.bedId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const [patient, bed] = await Promise.all([
    db.hospitalPatient.findFirst({ where: { id: body.patientId, hospitalId } }),
    db.hospitalBed.findUnique({ where: { id: body.bedId }, include: { ward: true } }),
  ]);
  if (!patient) return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
  if (!bed) return NextResponse.json({ error: "bed_not_found" }, { status: 404 });
  if (!["ready", "available", "reserved"].includes(bed.status)) {
    return NextResponse.json({ error: "bed_not_assignable", status: bed.status }, { status: 400 });
  }

  const [admission] = await db.$transaction([
    db.hospitalAdmission.create({
      data: {
        hospitalId: hospitalId!,
        patientId: patient.id,
        patientUhid: patient.uhid,
        admittingDoctorId: body.doctorId || null,
        wardId: bed.wardId,
        bedId: bed.id,
        admissionDiagnosis: body.diagnosis || null,
        admissionType: body.admissionType === "elective" ? "elective" : "emergency",
        expectedDischargeDate: body.expectedDays ? new Date(Date.now() + Number(body.expectedDays) * 86400000) : null,
        dischargeStatus: "active",
      },
    }),
    db.hospitalBed.update({ where: { id: bed.id }, data: { status: "occupied", currentPatientUhid: patient.uhid, reservedForName: null } }),
  ]);

  await audit({
    hospitalId: hospitalId!, actorName: gate.session.name, actorRole: gate.session.role,
    action: "encounter.admit", entityType: "HospitalAdmission", entityId: admission.id, patientId: patient.id,
    detail: { bed: bed.bedNumber, ward: bed.ward?.name, type: admission.admissionType },
  });
  return NextResponse.json({ admission });
}

/** PATCH — discharge / transfer (fires the discharge coordination cascade). */
export async function PATCH(req: NextRequest) {
  const gate = requireModule(req, "patients");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = await req.json().catch(() => ({}));
  if (!body.id || !body.action) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const admission = await db.hospitalAdmission.findUnique({ where: { id: body.id }, include: { patient: true, bed: true } });
  if (!admission) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body.action === "mark_discharge_pending") {
    if (admission.bed) {
      await db.hospitalBed.update({ where: { id: admission.bed.id }, data: { status: "discharge_pending" } });
    }
    await audit({
      hospitalId: admission.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
      action: "encounter.discharge_pending", entityType: "HospitalAdmission", entityId: admission.id, patientId: admission.patientId,
      detail: { bed: admission.bed?.bedNumber },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "confirm_discharge") {
    if (!["doctor", "admin"].includes(gate.session.role)) {
      return NextResponse.json({ error: "only_doctors_confirm_discharge", detail: "Discharge is a high-risk decision requiring an authorized clinician" }, { status: 403 });
    }
    await db.hospitalAdmission.update({
      where: { id: admission.id },
      data: {
        dischargeStatus: "discharged",
        actualDischargeDate: new Date(),
        dischargeSummary: body.summary || admission.dischargeSummary,
      },
    });
    if (admission.bed) {
      await db.hospitalBed.update({ where: { id: admission.bed.id }, data: { status: "cleaning_required", currentPatientUhid: null } });
    }
    await audit({
      hospitalId: admission.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
      action: "encounter.discharge", entityType: "HospitalAdmission", entityId: admission.id, patientId: admission.patientId,
      detail: { bed: admission.bed?.bedNumber, summary: Boolean(body.summary) },
    });
    await fire("discharge.confirmed", {
      hospitalId: admission.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
      patientId: admission.patientId, patientName: admission.patient.fullName, patientUhid: admission.patientUhid,
      relatedId: admission.id, detail: { bedNumber: admission.bed?.bedNumber },
    });
    return NextResponse.json({ ok: true, cascade: "discharge.confirmed" });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
