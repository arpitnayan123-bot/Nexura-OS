import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/clinic/patients?q=
async function GET_impl(req: NextRequest) {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const where = q ? { clinicId: ctx.clinic.id, OR: [{ name: { contains: q } }, { mrn: { contains: q } }, { phone: { contains: q } }] } : { clinicId: ctx.clinic.id };
    // `visits` (latest only) is additive — powers last-visit recency in the clinic
    // chronic-care watchlist. No Prisma schema change.
    const patients = await db.clinicPatient.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, mrn: true, name: true, gender: true, age: true, bloodGroup: true, phone: true, allergy: true, chronicDx: true, abhaId: true, createdAt: true, _count: { select: { visits: true, appointments: true } }, visits: { take: 1, orderBy: { createdAt: "desc" }, select: { createdAt: true, diagnosis: true } } } });
    return NextResponse.json({ patients });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "clinic_patients_failed", detail: message }, { status: 500 });
  }
}

// POST — register a new patient
async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const count = await db.clinicPatient.count({ where: { clinicId: ctx.clinic.id } });
    // Persist ABHA identity when provided (ABDM link itself is not live — ID/profile are stored on file only)
    const abhaId = typeof body.abhaId === "string" && body.abhaId.trim() ? body.abhaId.trim() : null;
    const abhaProfile = body.abhaProfile == null ? null : typeof body.abhaProfile === "string" ? body.abhaProfile : JSON.stringify(body.abhaProfile);
    const patient = await db.clinicPatient.create({ data: { clinicId: ctx.clinic.id, mrn: `CLN-${String(2001 + count)}`, name: String(body.name || "").trim(), gender: body.gender || "male", age: body.age ? Number(body.age) : null, bloodGroup: body.bloodGroup || null, phone: body.phone || null, allergy: body.allergy || null, chronicDx: body.chronicDx || null, abhaId, abhaProfile } });
    return NextResponse.json({ ok: true, patient });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "clinic_patient_create_failed", detail: message }, { status: 500 });
  }
}

export const GET = withProductAuth("clinic.patients.GET", GET_impl);
export const POST = withProductAuth("clinic.patients.POST", POST_impl);
