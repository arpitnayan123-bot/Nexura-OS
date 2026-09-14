import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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
    const clinic = await db.clinic.findUnique({ where: { bookingSlug: slug }, include: { doctors: { where: { active: true } } } });
    if (!clinic) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ clinic, doctors: clinic.doctors });
  } catch (err) {
    log.error("api", "clinic.booking.read_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "booking_failed" }, { status: 500 });
  }
}

// POST — create an online booking (from public page)
async function POST_impl(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clinicId, doctorId, patientName, phone, slot } = body as { clinicId?: string; doctorId?: string; patientName?: string; phone?: string; slot?: string };
    if (!clinicId || !patientName || !phone || !slot) return NextResponse.json({ error: "missing" }, { status: 400 });
    const booking = await db.onlineBooking.create({
      data: { clinicId, doctorId: doctorId || null, patientName, phone, slot: new Date(slot) },
    });
    return NextResponse.json({ ok: true, booking });
  } catch (err) {
    log.error("api", "clinic.booking.create_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "booking_create_failed" }, { status: 500 });
  }
}

export const GET = withProductAuth("clinic.booking.GET", GET_impl);
export const POST = withProductAuth("clinic.booking.POST", POST_impl);
