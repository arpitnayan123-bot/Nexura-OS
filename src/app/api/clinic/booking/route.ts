import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/clinic/booking?slug=rao-clinic — public booking page data
async function GET_impl(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "no_slug" }, { status: 400 });
    const clinic = await db.clinic.findUnique({
      where: { bookingSlug: slug },
      include: { doctors: { where: { active: true } } },
    });
    if (!clinic) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ clinic, doctors: clinic.doctors });
  } catch (err) {
    log.error("api", "clinic.booking.read_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "booking_failed" }, { status: 500 });
  }
}

// POST — create an online booking (from public page)
async function POST_impl(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clinicId, doctorId, patientName, phone, slot, action } = body as {
      clinicId?: string;
      doctorId?: string;
      patientName?: string;
      phone?: string;
      slot?: string;
      action?: string;
    };

    // accept — convert a pending online booking into patient + appointment.
    // This closes the loop: request → clinic accepts → it lands in the queue.
    if (action === "accept") {
      const ctx = await getClinicContext();
      if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
      const bookingId = body.bookingId as string;
      if (!bookingId) return NextResponse.json({ error: "missing" }, { status: 400 });

      const booking = await db.onlineBooking.findUnique({ where: { id: bookingId } });
      if (!booking || booking.clinicId !== ctx.clinic.id) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      if (booking.status !== "booked") {
        return NextResponse.json({ error: "already_processed" }, { status: 409 });
      }

      /* Claim the booking atomically: only one concurrent accept can win the
         status flip (the historical check-then-convert let two staff members
         accept the same booking simultaneously and create two patients /
         appointments). On conversion failure the claim is released. */
      const claim = await db.onlineBooking.updateMany({
        where: { id: booking.id, status: "booked" },
        data: { status: "processing" },
      });
      if (claim.count === 0) {
        return NextResponse.json({ error: "already_processed" }, { status: 409 });
      }

      try {
        // Find-or-create the walk-in patient by phone (dedupes repeat bookers).
        let patient = await db.clinicPatient.findFirst({
          where: { clinicId: ctx.clinic.id, phone: booking.phone },
        });
        if (!patient) {
          const count = await db.clinicPatient.count({ where: { clinicId: ctx.clinic.id } });
          patient = await db.clinicPatient.create({
            data: {
              clinicId: ctx.clinic.id,
              mrn: `CLN-${2001 + count}`,
              name: booking.patientName,
              gender: "unknown",
              phone: booking.phone,
            },
          });
        }

        const dayStart = new Date(booking.slot);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(booking.slot);
        dayEnd.setHours(23, 59, 59, 999);
        const tokenNo =
          (await db.clinicAppointment.count({
            where: { clinicId: ctx.clinic.id, slot: { gte: dayStart, lte: dayEnd } },
          })) + 1;

        // Appointments require a doctor — "any doctor" bookings resolve to
        // the clinic's first active doctor at acceptance time. Fail closed
        // when the clinic has no active doctor at all.
        let doctorId: string | null = booking.doctorId;
        if (!doctorId) {
          const firstDoctor = await db.clinicDoctor.findFirst({
            where: { clinicId: ctx.clinic.id, active: true },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          });
          if (!firstDoctor) {
            await db.onlineBooking
              .updateMany({
                where: { id: booking.id, status: "processing" },
                data: { status: "booked" },
              })
              .catch(() => {});
            return NextResponse.json({ error: "no_doctor" }, { status: 409 });
          }
          doctorId = firstDoctor.id;
        }

        const appointment = await db.clinicAppointment.create({
          data: {
            clinicId: ctx.clinic.id,
            patientId: patient.id,
            doctorId: doctorId ?? undefined,
            slot: booking.slot,
            tokenNo,
            reason: "Online booking",
            source: "online",
            status: "booked",
          },
        });

        const updated = await db.onlineBooking.update({
          where: { id: booking.id },
          data: {
            status: "converted",
            convertedPatientId: patient.id,
            convertedAppointmentId: appointment.id,
          },
        });

        return NextResponse.json({ ok: true, booking: updated, appointment, patient });
      } catch (convErr) {
        await db.onlineBooking
          .updateMany({
            where: { id: booking.id, status: "processing" },
            data: { status: "booked" },
          })
          .catch(() => {});
        throw convErr;
      }
    }

    if (!clinicId || !patientName || !phone || !slot)
      return NextResponse.json({ error: "missing" }, { status: 400 });
    const booking = await db.onlineBooking.create({
      data: { clinicId, doctorId: doctorId || null, patientName, phone, slot: new Date(slot) },
    });
    return NextResponse.json({ ok: true, booking });
  } catch (err) {
    log.error("api", "clinic.booking.create_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "booking_create_failed" }, { status: 500 });
  }
}

export const GET = withProductAuth("clinic.booking.GET", GET_impl);
export const POST = withProductAuth("clinic.booking.POST", POST_impl);
