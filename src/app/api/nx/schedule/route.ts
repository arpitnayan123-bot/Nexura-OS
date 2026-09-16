import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireHospitalContext, withRoute } from "@/lib/nx/api";
import { requireModule } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";
import { fire } from "@/lib/nx/automations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — appointment & resource scheduling workspace. */
export const GET = withRoute("nx.schedule.list", async (req: NextRequest) => {
  const gate = await requireModule(req, "schedule");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalCtx = await requireHospitalContext(gate.session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;

  const { searchParams } = new URL(req.url);
  const dayOffset = Number(searchParams.get("day") || 0);
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + dayOffset);
  const next = new Date(base.getTime() + 86400000);

  const [appointments, doctors] = await Promise.all([
    db.hospitalAppointment.findMany({
      where: { hospitalId, date: { gte: base, lt: next } },
      orderBy: { timeSlot: "asc" },
      include: {
        patient: { select: { id: true, fullName: true, uhid: true, phone: true } },
        doctor: { select: { id: true, name: true, specialty: true, department: true } },
      },
    }),
    db.hospitalDoctor.findMany({ where: { hospitalId }, include: { _count: { select: { appointments: true } } } }),
  ]);

  const byStatus = appointments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    day: base.toISOString(),
    appointments: appointments.map((a) => {
      // Compose a parseable wall-clock datetime: a bare "16:00" timeSlot is not
      // a Date and rendered as "Invalid Date" in the day board.
      const dayIso = new Date(a.date).toISOString().slice(0, 10);
      const slot = /^\d{1,2}:\d{2}/.test(a.timeSlot || "") ? a.timeSlot : "00:00";
      return {
        id: a.id, time: `${dayIso}T${slot.slice(0, 5)}:00`, token: a.tokenNumber, type: a.appointmentType, status: a.status,
        complaint: a.chiefComplaint, patient: a.patient, doctor: a.doctor,
      };
    }),
    stats: { total: appointments.length, ...byStatus },
    doctors: doctors.map((d) => ({
      id: d.id, name: d.name, speciality: d.specialty, department: d.department,
      todayCount: appointments.filter((a) => a.doctorId === d.id).length,
      totalAppointments: (d as unknown as { _count: { appointments: number } })._count.appointments,
    })),
  });
});

/** POST — book appointment (conflict-checked, fires prep automation). */
export const POST = withRoute("nx.schedule.book", async (req: NextRequest) => {
  const gate = await requireModule(req, "schedule");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalCtx = await requireHospitalContext(gate.session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;
  const body = await req.json().catch(() => ({}));
  if (!body.patientId || !body.doctorId || !body.date) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const [patient, doctor] = await Promise.all([
    db.hospitalPatient.findFirst({ where: { id: body.patientId, hospitalId } }),
    db.hospitalDoctor.findFirst({ where: { id: body.doctorId, hospitalId } }),
  ]);
  if (!patient || !doctor) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const when = new Date(body.date);
  // conflict detection: same doctor within the same 15-min slot
  const clash = await db.hospitalAppointment.findFirst({
    where: { hospitalId, doctorId: doctor.id, date: { gte: new Date(when.getTime() - 7 * 60000), lte: new Date(when.getTime() + 7 * 60000) }, status: { notIn: ["cancelled", "no_show"] } },
  });
  if (clash) {
    const suggestions: string[] = [];
    for (const mins of [30, 45, 60, 90, 120]) {
      const alt = new Date(when.getTime() + mins * 60000);
      const altClash = await db.hospitalAppointment.findFirst({
        where: { hospitalId, doctorId: doctor.id, date: { gte: new Date(alt.getTime() - 7 * 60000), lte: new Date(alt.getTime() + 7 * 60000) }, status: { notIn: ["cancelled", "no_show"] } },
      });
      if (!altClash) suggestions.push(alt.toISOString());
      if (suggestions.length >= 3) break;
    }
    return NextResponse.json({ error: "slot_conflict", detail: `${doctor.name} already has an appointment in this slot`, suggestions }, { status: 409 });
  }

  /* The findFirst clash check above narrows the window but cannot close it —
     two concurrent bookings can both see a free slot. The partial unique
     index (doctorId, date) WHERE status NOT IN ('cancelled','no_show')
     (migration 20260918000000) is the real serialization point: the loser
     of the race gets the same 409 the pre-check would have returned. */
  let appt;
  try {
    appt = await db.hospitalAppointment.create({
      data: {
        hospitalId: hospitalId!,
        patientId: patient.id,
        patientUhid: patient.uhid,
        doctorId: doctor.id,
        date: when,
        timeSlot: when.toISOString().slice(11, 16),
        appointmentType: body.type === "teleconsult" ? "teleconsult" : body.type === "followup" ? "followup" : "opd",
        chiefComplaint: body.complaint || null,
        status: "scheduled",
      },
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "slot_conflict", detail: `${doctor.name} already has an appointment in this slot` }, { status: 409 });
    }
    throw err;
  }
  await audit({
    hospitalId: hospitalId!, actorName: gate.session.name, actorRole: gate.session.role,
    action: "appointment.create", entityType: "HospitalAppointment", entityId: appt.id, patientId: patient.id,
    detail: { doctor: doctor.name, at: when.toISOString() },
  });
  await fire("appointment.created", {
    hospitalId: hospitalId!, actorName: gate.session.name, actorRole: gate.session.role,
    patientId: patient.id, patientName: patient.fullName, relatedId: appt.id,
    detail: { doctor: doctor.name, at: when.toISOString() },
  });
  return NextResponse.json({ appointment: appt });
});

/** PATCH — check-in / complete / cancel / no-show / reschedule. Every transition is event-logged. */
export const PATCH = withRoute("nx.schedule.transition", async (req: NextRequest) => {
  const gate = await requireModule(req, "schedule");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = await req.json().catch(() => ({}));
  if (!body.id || !body.status) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const appt = await db.hospitalAppointment.findUnique({ where: { id: body.id } });
  if (!appt) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (appt.hospitalId !== gate.session.hospitalId) return NextResponse.json({ error: "forbidden", detail: "cross_hospital" }, { status: 403 });

  const allowed = ["scheduled", "waiting", "in_consultation", "completed", "no_show", "cancelled"];
  if (!allowed.includes(body.status)) return NextResponse.json({ error: "invalid_status" }, { status: 400 });

  // Reschedule support: new date → re-run conflict detection
  let newDate: Date | undefined;
  if (body.newDate) {
    newDate = new Date(body.newDate);
    const clash = await db.hospitalAppointment.findFirst({
      where: { hospitalId: appt.hospitalId, doctorId: appt.doctorId, id: { not: appt.id }, date: { gte: new Date(newDate.getTime() - 7 * 60000), lte: new Date(newDate.getTime() + 7 * 60000) }, status: { notIn: ["cancelled", "no_show"] } },
    });
    if (clash) return NextResponse.json({ error: "slot_conflict", detail: "Doctor already booked in that slot" }, { status: 409 });
  }

  const updated = await db.hospitalAppointment.update({
    where: { id: appt.id },
    data: {
      status: body.status,
      ...(body.status === "waiting" && !appt.checkedInAt ? { checkedInAt: new Date() } : {}),
      ...(body.note ? { notes: String(body.note).slice(0, 1000) } : {}),
      ...(newDate ? { date: newDate, timeSlot: newDate.toISOString().slice(11, 16), rescheduledFromId: appt.id } : {}),
    },
  });
  await db.nxAppointmentEvent.create({
    data: { hospitalId: appt.hospitalId, appointmentId: appt.id, fromStatus: appt.status, toStatus: body.status, actorName: gate.session.name, note: body.note ?? null },
  });
  if (body.status === "no_show" && body.addToWaitlist) {
    await db.nxAppointmentWaitlist.create({
      data: { hospitalId: appt.hospitalId, patientId: appt.patientId, patientName: (await db.hospitalPatient.findUnique({ where: { id: appt.patientId }, select: { fullName: true } }))?.fullName, doctorId: appt.doctorId, priority: "routine", reason: "no-show rebook" },
    });
  }
  await audit({
    hospitalId: appt.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
    action: `appointment.${body.status}`, entityType: "HospitalAppointment", entityId: appt.id, patientId: appt.patientId,
    detail: { from: appt.status, to: body.status, rescheduledTo: newDate?.toISOString() },
  });
  return NextResponse.json({ appointment: updated });
});
