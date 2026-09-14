import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST — book an appointment
async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const { patientId, doctorId, reason, slot } = body as { patientId?: string; doctorId?: string; reason?: string; slot?: string };
    if (!patientId || !doctorId || !slot) return NextResponse.json({ error: "missing" }, { status: 400 });
    const dayStart = new Date(slot); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(slot); dayEnd.setHours(23, 59, 59, 999);
    const countToday = await db.clinicAppointment.count({ where: { slot: { gte: dayStart, lte: dayEnd } } });
    const appt = await db.clinicAppointment.create({ data: { clinicId: ctx.clinic.id, patientId, doctorId, slot: new Date(slot), reason: reason || "", tokenNo: countToday + 1 } });
    return NextResponse.json({ ok: true, appointment: appt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "clinic_book_failed", detail: message }, { status: 500 });
  }
}

// PATCH — update status
async function PATCH_impl(req: NextRequest) {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const { appointmentId, status } = body as { appointmentId?: string; status?: string };
    if (!appointmentId || !status) return NextResponse.json({ error: "missing" }, { status: 400 });
    const appt = await db.clinicAppointment.update({ where: { id: appointmentId }, data: { status } });
    return NextResponse.json({ ok: true, appointment: appt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "clinic_update_failed", detail: message }, { status: 500 });
  }
}

export const POST = withProductAuth("clinic.appointments.POST", POST_impl);
export const PATCH = withProductAuth("clinic.appointments.PATCH", PATCH_impl);
