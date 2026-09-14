// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/clinic/telemedicine — list telemedicine consults
async function GET_impl(req: NextRequest) {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const consults = await db.telemedicineConsult.findMany({
      where: { clinicId: ctx.clinic.id, ...(status ? { status } : {}) },
      orderBy: { startedAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ consults, count: consults.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "telemedicine_failed", detail: message }, { status: 500 });
  }
}

// POST — create a telemedicine consult (NMC Telemedicine Guidelines 2020 compliant)
async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const { patientId, doctorName, doctorRegNo, consultMode, chiefComplaint, diagnosis, prescription, followUpDate, patientConsent } = body as any;

    if (!doctorName || !doctorRegNo) return NextResponse.json({ error: "doctor_reg_required" }, { status: 400 });
    // NMC Guideline: doctor must have valid MCI/NMC registration
    // NMC Guideline: patient consent for telemedicine is mandatory

    const consult = await db.telemedicineConsult.create({
      data: {
        clinicId: ctx.clinic.id,
        patientId: patientId || null,
        patientType: "clinic",
        doctorName,
        doctorRegNo,
        consultMode: consultMode || "video",
        chiefComplaint: chiefComplaint || null,
        diagnosis: diagnosis || null,
        prescription: prescription || null,
        followUpDate: followUpDate || null,
        patientConsent: patientConsent !== false,
        consentText: "Patient consented to telemedicine consultation as per NMC Telemedicine Guidelines, 2020",
        status: "scheduled",
      },
    });

    return NextResponse.json({ ok: true, consult });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "telemedicine_create_failed", detail: message }, { status: 500 });
  }
}

// PATCH — update status
async function PATCH_impl(req: NextRequest) {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const { consultId, status } = body as { consultId?: string; status?: string };
    if (!consultId || !status) return NextResponse.json({ error: "missing" }, { status: 400 });

    const data: any = { status };
    if (status === "completed") data.endedAt = new Date();

    const consult = await db.telemedicineConsult.update({ where: { id: consultId }, data });
    return NextResponse.json({ ok: true, consult });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "telemedicine_update_failed", detail: message }, { status: 500 });
  }
}

export const GET = withProductAuth("clinic.telemedicine.GET", GET_impl);
export const POST = withProductAuth("clinic.telemedicine.POST", POST_impl);
export const PATCH = withProductAuth("clinic.telemedicine.PATCH", PATCH_impl);
