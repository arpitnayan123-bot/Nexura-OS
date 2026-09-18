import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { getPortalCaller } from "@/lib/portal-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public test-panel catalog (8 panels). */
export const TEST_PANELS = [
  {
    code: "FULL_BODY",
    name: "Full Body Checkup",
    price: 2999,
    tests: "CBC, LFT, KFT, Lipid, Thyroid, HbA1c, Vitamins",
    icon: "🩺",
    popular: true,
    estTime: "24 hrs",
  },
  {
    code: "DIABETES",
    name: "Diabetes Panel",
    price: 499,
    tests: "FBS, PPBS, HbA1c, eAG, RBS",
    icon: "🩸",
    popular: true,
    estTime: "12 hrs",
  },
  {
    code: "THYROID",
    name: "Thyroid Profile",
    price: 399,
    tests: "TSH, Free T3, Free T4",
    icon: "🦋",
    popular: false,
    estTime: "12 hrs",
  },
  {
    code: "CBC",
    name: "Complete Blood Count",
    price: 199,
    tests: "Hemogram, RBC, WBC, Platelets",
    icon: "🧫",
    popular: false,
    estTime: "6 hrs",
  },
  {
    code: "LIPID",
    name: "Lipid Profile",
    price: 349,
    tests: "Total Chol, HDL, LDL, Triglycerides, VLDL",
    icon: "❤️",
    popular: true,
    estTime: "12 hrs",
  },
  {
    code: "LIVER",
    name: "Liver Function Test",
    price: 449,
    tests: "Bilirubin, ALT, AST, ALP, Protein",
    icon: "🫀",
    popular: false,
    estTime: "12 hrs",
  },
  {
    code: "KIDNEY",
    name: "Kidney Function Test",
    price: 449,
    tests: "Urea, Creatinine, Uric Acid, eGFR",
    icon: "🫘",
    popular: false,
    estTime: "12 hrs",
  },
  {
    code: "VITAMIN",
    name: "Vitamin Profile",
    price: 899,
    tests: "Vitamin D, B12, Folate, Iron Studies",
    icon: "💊",
    popular: true,
    estTime: "24 hrs",
  },
];

async function getUser() {
  return getPortalCaller();
}

/**
 * GET /api/portal/blood-bookings  — list bookings + TEST_PANELS catalog
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const bookings = await db.bloodBooking.findMany({
    where: { userId: user.id },
    orderBy: { scheduledDate: "desc" },
  });
  const phlebotomists = await db.phlebotomist.findMany({
    where: { isAvailable: true },
    select: { id: true, name: true, city: true, zones: true, rating: true, totalCollections: true },
  });
  return NextResponse.json({ bookings, testPanels: TEST_PANELS, phlebotomists });
}

/**
 * POST /api/portal/blood-bookings
 *   { testPanelCode, scheduledDate, timeSlot, address, city, pincode, paymentMode }
 * Auto-generates `NX-BLD-YYYY-XXXXX` ref + auto-assigns nearest available phlebotomist.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const panel = TEST_PANELS.find((p) => p.code === body.testPanelCode);
    if (!panel) return NextResponse.json({ error: "Invalid test panel" }, { status: 400 });

    if (!body.scheduledDate || !body.timeSlot || !body.address) {
      return NextResponse.json(
        { error: "scheduledDate, timeSlot and address are required" },
        { status: 400 },
      );
    }

    // ---- auto-assign nearest available phlebotomist (rating desc, fewest current bookings) ----
    const candidate = await db.phlebotomist.findFirst({
      where: { isAvailable: true },
      orderBy: [{ rating: "desc" }, { totalCollections: "asc" }],
    });
    if (!candidate) {
      return NextResponse.json({ error: "No phlebotomists available right now" }, { status: 503 });
    }

    // ---- generate booking ref ----
    const year = new Date().getFullYear();
    const count = await db.bloodBooking.count({
      // bookingRef is machine-generated uppercase — case-sensitivity is moot,
      // and `mode` is not portable to the packaged demo's SQLite client.
      where: { bookingRef: { startsWith: `NX-BLD-${year}-` } },
    });
    const bookingRef = `NX-BLD-${year}-${String(count + 10001).padStart(5, "0")}`;

    const created = await db.bloodBooking.create({
      data: {
        userId: user.id,
        bookingRef,
        testPanelName: panel.name,
        testPanelCode: panel.code,
        testsIncluded: panel.tests,
        price: panel.price,
        scheduledDate: new Date(body.scheduledDate),
        timeSlot: body.timeSlot,
        address: body.address,
        city: body.city || user.city || "Mumbai",
        pincode: body.pincode || user.pincode || "400053",
        phlebotomistId: candidate.id,
        phlebotomistName: candidate.name,
        phlebotomistPhone: candidate.phone,
        status: "assigned",
        paymentMode: body.paymentMode || "upi",
        paymentStatus: body.paymentMode === "cash" ? "pending" : "paid",
      },
    });

    // mark phlebotomist as assigned (keep available=true for demo simplicity)
    await db.phlebotomist.update({
      where: { id: candidate.id },
      data: { currentBookingId: created.id, totalCollections: { increment: 1 } },
    });

    return NextResponse.json({ ok: true, booking: created });
  } catch (err) {
    log.error("portal", "blood_booking_create_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

/**
 * PATCH /api/portal/blood-bookings
 *   { bookingId, status }
 * Patient-side status changes are closed-set: a booking owner may only CANCEL
 * (`cancelled` — frees the phlebotomist and records the reason). Workflow
 * statuses (`sample_collected`, `report_ready`, `in_lab`, `en_route`, …)
 * belong to the phlebotomist/lab side and are rejected, so a portal account
 * can never fast-track its own booking through the collection workflow.
 * Cascade: cancelled frees phlebotomist (currentBookingId = null).
 */
const PATIENT_BOOKING_STATUSES = new Set(["cancelled"]);

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { bookingId, status } = body;
    if (!bookingId || !status) {
      return NextResponse.json({ error: "bookingId and status are required" }, { status: 400 });
    }
    if (typeof status !== "string" || !PATIENT_BOOKING_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Invalid status — bookings can only be cancelled here" },
        { status: 400 },
      );
    }

    const existing = await db.bloodBooking.findFirst({ where: { id: bookingId, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const updates: { status: string; cancellationReason?: string } = { status };
    if (status === "cancelled") {
      updates.cancellationReason = body.cancellationReason || "Cancelled by patient";
      if (existing.phlebotomistId) {
        await db.phlebotomist.update({
          where: { id: existing.phlebotomistId },
          data: { currentBookingId: null },
        });
      }
    }

    const updated = await db.bloodBooking.update({ where: { id: bookingId }, data: updates });
    return NextResponse.json({ ok: true, booking: updated });
  } catch (err) {
    log.error("portal", "blood_booking_update_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
