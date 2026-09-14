import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/clinic/dashboard — one aggregated call
async function GET_impl() {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const cId = ctx.clinic.id;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    const [
      totalPatients,
      todaysAppts,
      waiting,
      done,
      revenueAgg,
      outstandingAgg,
      doctors,
      appts,
      pendingBookings,
      revTrend,
    ] = await Promise.all([
      db.clinicPatient.count({ where: { clinicId: cId } }),
      db.clinicAppointment.count({ where: { slot: { gte: start, lte: end } } }),
      db.clinicAppointment.count({ where: { slot: { gte: start, lte: end }, status: { in: ["booked", "arrived"] } } }),
      db.clinicAppointment.count({ where: { slot: { gte: start, lte: end }, status: "done" } }),
      db.clinicInvoice.aggregate({ where: { createdAt: { gte: start }, status: "paid" }, _sum: { total: true } }),
      db.clinicInvoice.aggregate({ where: { status: "unpaid" }, _sum: { total: true } }),
      db.clinicDoctor.findMany({ where: { clinicId: cId, active: true }, select: { id: true, name: true, specialization: true, feeConsult: true, shiftStart: true, shiftEnd: true } }),
      db.clinicAppointment.findMany({
        where: { slot: { gte: start, lte: end } },
        orderBy: { slot: "asc" },
        take: 30,
        include: { patient: { select: { id: true, mrn: true, name: true, age: true, gender: true, phone: true, bloodGroup: true, abhaId: true } }, doctor: { select: { id: true, name: true, specialization: true } } },
      }),
      (async () => {
        // convert online bookings to walk-in appointments for today
        const pendingBookings = await db.onlineBooking.findMany({
          where: { clinicId: cId, status: "booked", convertedPatientId: null },
          orderBy: { createdAt: "desc" },
          include: { doctor: { select: { id: true, name: true, specialization: true } } },
        });
        return pendingBookings;
      })(),
      (async () => {
        const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 7);
        const bills = await db.clinicInvoice.findMany({ where: { createdAt: { gte: sevenAgo }, status: "paid" }, select: { total: true, createdAt: true } });
        const trend: { date: string; revenue: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
          const next = new Date(d); next.setDate(next.getDate() + 1);
          const revenue = bills.filter((b) => b.createdAt >= d && b.createdAt < next).reduce((s, b) => s + b.total, 0);
          trend.push({ date: d.toISOString().slice(5, 10), revenue: Math.round(revenue) });
        }
        return trend;
      })(),
    ]);

    return NextResponse.json({
      clinic: { name: ctx.clinic.name, ownerName: ctx.clinic.ownerName, city: ctx.clinic.city, bookingSlug: ctx.clinic.bookingSlug },
      kpis: {
        patients: totalPatients,
        appointmentsToday: todaysAppts,
        waiting,
        done,
        revenueToday: revenueAgg._sum.total ?? 0,
        outstanding: outstandingAgg._sum.total ?? 0,
      },
      doctors,
      appointments: appts.map((a) => ({ ...a, source: (a as any).source || "walkin" })),
      pendingOnlineBookings: pendingBookings,
      revenueTrend7d: revTrend,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "clinic_dashboard_failed", detail: message }, { status: 500 });
  }
}

export const GET = withProductAuth("clinic.dashboard.GET", GET_impl);
