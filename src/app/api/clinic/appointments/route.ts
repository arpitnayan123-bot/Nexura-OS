import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — list appointments by range (today | upcoming | past)
async function GET_impl(req: NextRequest) {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });

    const range = new URL(req.url).searchParams.get("range") || "today";
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);
    const horizon = new Date(now.getTime() + 30 * 86400000);

    const where =
      range === "upcoming"
        ? { clinicId: ctx.clinic.id, slot: { gt: dayEnd, lte: horizon } }
        : range === "past"
          ? { clinicId: ctx.clinic.id, slot: { lt: dayStart } }
          : { clinicId: ctx.clinic.id, slot: { gte: dayStart, lte: dayEnd } };

    const appointments = await db.clinicAppointment.findMany({
      where,
      orderBy: { slot: range === "past" ? "desc" : "asc" },
      take: 200,
      select: {
        id: true, tokenNo: true, slot: true, status: true, reason: true, source: true,
        patient: { select: { id: true, mrn: true, name: true, age: true, gender: true, phone: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
    });

    return NextResponse.json({ appointments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "clinic_appts_failed", detail: message }, { status: 500 });
  }
}

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

// PATCH — update status (clinic-scoped; a clinic can only ever touch its own appointments)
const APPT_STATUSES = new Set(["booked", "arrived", "done", "cancelled", "no_show"]);
async function PATCH_impl(req: NextRequest) {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const { appointmentId, status } = body as { appointmentId?: string; status?: string };
    if (!appointmentId || !status || !APPT_STATUSES.has(status)) {
      return NextResponse.json({ error: "missing_or_invalid" }, { status: 400 });
    }
    const existing = await db.clinicAppointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, clinicId: true, status: true },
    });
    if (!existing || existing.clinicId !== ctx.clinic.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const appt = await db.clinicAppointment.update({ where: { id: appointmentId }, data: { status } });
    return NextResponse.json({ ok: true, appointment: appt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "clinic_update_failed", detail: message }, { status: 500 });
  }
}

export const GET = withProductAuth("clinic.appointments.GET", GET_impl);
export const POST = withProductAuth("clinic.appointments.POST", POST_impl);
export const PATCH = withProductAuth("clinic.appointments.PATCH", PATCH_impl);
