import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/clinic/visit?patientId=
export async function GET(req: NextRequest) {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    if (!patientId) return NextResponse.json({ error: "no_patient" }, { status: 400 });
    const visits = await db.clinicVisit.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take: 20, include: { doctor: { select: { id: true, name: true, specialization: true } }, meds: true, invoices: { select: { id: true, invoiceNo: true, total: true, status: true } } } });
    return NextResponse.json({ visits });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "clinic_visit_failed", detail: message }, { status: 500 });
  }
}

// POST — create a visit with vitals, diagnosis, Rx + invoice
export async function POST(req: NextRequest) {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const { patientId, doctorId, appointmentId, chiefComplaint, vitalsBP, vitalsPulse, vitalsTemp, vitalsSpo2, diagnosis, advice, followUp, meds, fee } = body as any;
    if (!patientId) return NextResponse.json({ error: "no_patient" }, { status: 400 });

    const visit = await db.clinicVisit.create({
      data: { clinicId: ctx.clinic.id, patientId, doctorId: doctorId || null, appointmentId: appointmentId || null, chiefComplaint: chiefComplaint || null, vitalsBP: vitalsBP || null, vitalsPulse: vitalsPulse ? Number(vitalsPulse) : null, vitalsTemp: vitalsTemp ? Number(vitalsTemp) : null, vitalsSpo2: vitalsSpo2 ? Number(vitalsSpo2) : null, diagnosis: diagnosis || null, advice: advice || null, followUp: followUp || null, status: "closed" },
    });
    if (Array.isArray(meds)) {
      await db.clinicRx.createMany({ data: meds.filter((m: any) => m.medicine).map((m: any) => ({ visitId: visit.id, medicine: m.medicine, dosage: m.dosage || null, duration: m.duration || null, notes: m.notes || null })) });
    }
    if (fee && fee > 0) {
      const count = await db.clinicInvoice.count({ where: { clinicId: ctx.clinic.id } });
      await db.clinicInvoice.create({ data: { clinicId: ctx.clinic.id, patientId, visitId: visit.id, invoiceNo: `CLN-INV-${3001 + count}`, description: "Consultation", amount: Number(fee), total: Number(fee), status: "paid", payMode: "cash" } });
    }
    if (appointmentId) {
      await db.clinicAppointment.update({ where: { id: appointmentId }, data: { status: "done" } });
    }
    return NextResponse.json({ ok: true, visitId: visit.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "clinic_visit_create_failed", detail: message }, { status: 500 });
  }
}
