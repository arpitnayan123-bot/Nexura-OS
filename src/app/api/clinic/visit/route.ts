import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";
import { rupeeToPaise } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/clinic/visit?patientId=   — one patient's visits
// GET /api/clinic/visit?recent=1     — clinic-wide recent prescriptions feed
async function GET_impl(req: NextRequest) {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (searchParams.get("recent")) {
      const recent = await db.clinicVisit.findMany({
        where: { clinicId: ctx.clinic.id, meds: { some: {} } },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true, createdAt: true, diagnosis: true, chiefComplaint: true, followUp: true,
          doctor: { select: { id: true, name: true, specialization: true } },
          patient: { select: { id: true, mrn: true, name: true, age: true, gender: true } },
          meds: { select: { id: true, medicine: true, dosage: true, duration: true, notes: true } },
        },
      });
      return NextResponse.json({ visits: recent });
    }

    if (!patientId) return NextResponse.json({ error: "no_patient" }, { status: 400 });
    const visits = await db.clinicVisit.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take: 20, include: { doctor: { select: { id: true, name: true, specialization: true } }, meds: true, invoices: { select: { id: true, invoiceNo: true, total: true, status: true } } } });
    return NextResponse.json({ visits });
  } catch (err) {
    log.error("clinic", "visit_list_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "clinic_visit_failed", detail: "Visits could not be loaded. Please retry." }, { status: 500 });
  }
}

// POST — create a visit with vitals, diagnosis, Rx + invoice
async function POST_impl(req: NextRequest) {
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
      /* fee arrives in rupees (what the consultation UI shows); stored as paise */
      const feePaise = rupeeToPaise(Number(fee));
      await db.clinicInvoice.create({ data: { clinicId: ctx.clinic.id, patientId, visitId: visit.id, invoiceNo: `CLN-INV-${3001 + count}`, description: "Consultation", amount: feePaise, total: feePaise, status: "paid", payMode: "cash" } });
    }
    if (appointmentId) {
      await db.clinicAppointment.update({ where: { id: appointmentId }, data: { status: "done" } });
    }
    return NextResponse.json({ ok: true, visitId: visit.id });
  } catch (err) {
    log.error("clinic", "visit_create_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "clinic_visit_create_failed", detail: "The visit could not be saved. Please retry." }, { status: 500 });
  }
}

export const GET = withProductAuth("clinic.visit.GET", GET_impl);
export const POST = withProductAuth("clinic.visit.POST", POST_impl);
