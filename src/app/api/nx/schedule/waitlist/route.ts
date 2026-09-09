import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { fail, guard, ok, withRoute } from "@/lib/nx/api";
import { publish } from "@/lib/nx/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* APPOINTMENT WAITLIST — add, list, promote to a booked slot. */

export const GET = withRoute("schedule.waitlist.list", async (req: NextRequest) => {
  const g = await guard(req, "appointments.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const entries = await db.nxAppointmentWaitlist.findMany({
    where: { hospitalId, status: "waiting" },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    take: 100,
  });
  return ok({ waitlist: entries });
});

const AddSchema = z.object({
  patientId: z.string().min(3),
  doctorId: z.string().optional(),
  department: z.string().max(80).optional(),
  preferredDate: z.string().datetime().optional(),
  priority: z.enum(["routine", "urgent", "vip"]).default("routine"),
  reason: z.string().max(300).optional(),
});

export const POST = withRoute("schedule.waitlist.add", async (req: NextRequest) => {
  const g = await guard(req, "appointments.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = AddSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);
  const patient = await db.hospitalPatient.findFirst({ where: { id: parsed.data.patientId, hospitalId }, select: { id: true, fullName: true } });
  if (!patient) return fail("not_found", 404, "Patient not found.");
  const entry = await db.nxAppointmentWaitlist.create({
    data: {
      hospitalId, patientId: patient.id, patientName: patient.fullName,
      doctorId: parsed.data.doctorId, department: parsed.data.department,
      preferredDate: parsed.data.preferredDate ? new Date(parsed.data.preferredDate) : null,
      priority: parsed.data.priority, reason: parsed.data.reason,
    },
  });
  await audit({ hospitalId, actorName: g.session.name, actorRole: g.session.role, action: "appointment.waitlist.add", entityType: "waitlist", entityId: entry.id, patientId: patient.id });
  return NextResponse.json({ data: { entry } }, { status: 201 });
});

const PromoteSchema = z.object({ id: z.string().min(3), date: z.string().datetime(), doctorId: z.string().optional() });

export const PATCH = withRoute("schedule.waitlist.promote", async (req: NextRequest) => {
  const g = await guard(req, "appointments.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = PromoteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);
  const entry = await db.nxAppointmentWaitlist.findFirst({ where: { id: parsed.data.id, hospitalId, status: "waiting" } });
  if (!entry) return fail("not_found", 404, "Waitlist entry not found.");

  const doctorId = parsed.data.doctorId || entry.doctorId;
  if (!doctorId) return fail("invalid_request", 400, "A doctor is required to promote this entry.");
  const when = new Date(parsed.data.date);

  // Same conflict rules as direct booking
  const clash = await db.hospitalAppointment.findFirst({
    where: { hospitalId, doctorId, date: { gte: new Date(when.getTime() - 7 * 60000), lte: new Date(when.getTime() + 7 * 60000) }, status: { notIn: ["cancelled", "no_show"] } },
  });
  if (clash) return fail("slot_conflict", 409, "Doctor already booked in that slot.");

  const appt = await db.hospitalAppointment.create({
    data: {
      hospitalId, patientId: entry.patientId,
      patientUhid: (await db.hospitalPatient.findUnique({ where: { id: entry.patientId }, select: { uhid: true } }))?.uhid ?? "—",
      doctorId, date: when, timeSlot: when.toISOString().slice(11, 16),
      appointmentType: "followup", chiefComplaint: entry.reason, status: "scheduled",
    },
  });
  await db.nxAppointmentWaitlist.update({ where: { id: entry.id }, data: { status: "promoted", promotedAppointmentId: appt.id } });
  await audit({ hospitalId, actorName: g.session.name, actorRole: g.session.role, action: "appointment.waitlist.promoted", entityType: "HospitalAppointment", entityId: appt.id, patientId: entry.patientId });
  publish({ event: "appointment.created", hospitalId, toRoles: ["receptionist", "command", "care_coordinator", "doctor"], data: { id: appt.id, waitlistPromoted: true } });
  return NextResponse.json({ data: { appointment: appt } });
});
void ok;
