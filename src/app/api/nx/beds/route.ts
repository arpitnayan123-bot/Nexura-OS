import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireHospitalContext } from "@/lib/nx/api";
import { requireModule } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";
import { fire } from "@/lib/nx/automations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Bed / room lifecycle:
   occupied → discharge_pending → cleaning_required → cleaning_in_progress
   → inspection_required → ready → reserved → occupied               */

const LIFECYCLE: Record<string, string[]> = {
  cleaning: ["cleaning_in_progress", "inspection_required", "ready"],
  occupied: ["discharge_pending"],
  discharge_pending: ["cleaning_required", "occupied"],
  cleaning_required: ["cleaning_in_progress"],
  cleaning_in_progress: ["inspection_required"],
  inspection_required: ["ready", "cleaning_required"],
  ready: ["reserved", "available", "occupied"],
  reserved: ["occupied", "ready"],
  available: ["reserved", "occupied"],
};

/** GET — bed board grouped by ward with lifecycle states. */
export async function GET(req: NextRequest) {
  const gate = await requireModule(req, "beds");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalCtx = await requireHospitalContext(gate.session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;

  const wards = await db.hospitalWard.findMany({
    where: { hospitalId },
    include: { beds: { include: { admissions: { where: { dischargeStatus: "active" }, include: { patient: { select: { id: true, fullName: true, uhid: true, gender: true, age: true } } }, take: 1 } } } },
    orderBy: { name: "asc" },
  });

  const beds = wards.flatMap((w) => w.beds);
  const counts = beds.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    wards: wards.map((w) => ({
      id: w.id, name: w.name, type: w.wardType,
      beds: w.beds.map((b) => ({
        id: b.id, number: b.bedNumber, status: b.status === "cleaning" ? "cleaning_required" : b.status,
        patient: b.admissions[0]
          ? { id: b.admissions[0].patient.id, name: b.admissions[0].patient.fullName, uhid: b.admissions[0].patient.uhid, age: b.admissions[0].patient.age, gender: b.admissions[0].patient.gender, diagnosis: b.admissions[0].admissionDiagnosis, since: b.admissions[0].admissionDate }
          : null,
        reservedFor: b.reservedForName, lastCleanedAt: b.lastCleanedAt,
      })),
    })),
    counts,
    total: beds.length,
    occupancyPct: beds.length ? Math.round((beds.filter((b) => ["occupied", "discharge_pending"].includes(b.status)).length / beds.length) * 100) : 0,
  });
}

/** PATCH — advance bed lifecycle (deterministic state machine + audit + automations). */
export async function PATCH(req: NextRequest) {
  const gate = await requireModule(req, "beds");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!gate.session.hospitalId) return NextResponse.json({ error: "no_hospital" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.bedId || !body.to) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  // Tenant-scoped: beds outside this hospital are invisible.
  const bed = await db.hospitalBed.findFirst({ where: { id: body.bedId, hospitalId: gate.session.hospitalId }, include: { ward: true } });
  if (!bed) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const allowed = LIFECYCLE[bed.status] || [];
  if (!allowed.includes(body.to)) {
    return NextResponse.json({ error: "invalid_transition", from: bed.status, allowed }, { status: 400 });
  }

  const data: Record<string, unknown> = { status: body.to };
  if (body.to === "cleaning_in_progress") data.lastCleanedAt = new Date();
  if (body.to === "reserved") data.reservedForName = body.reservedFor || "Next patient";
  if (["available", "ready"].includes(body.to)) data.reservedForName = null;

  const updated = await db.hospitalBed.update({ where: { id: bed.id }, data });

  await audit({
    hospitalId: bed.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
    action: "bed.lifecycle", entityType: "HospitalBed", entityId: bed.id,
    detail: { bed: bed.bedNumber, ward: bed.ward?.name, from: bed.status, to: body.to },
  });

  // Bed ready → nudge assignment
  if (body.to === "ready") {
    await fire("bed.ready", {
      hospitalId: bed.hospitalId, actorName: gate.session.name, actorRole: gate.session.role, relatedId: bed.id,
      detail: { bedNumber: bed.bedNumber, ward: bed.ward?.name },
    });
  }

  return NextResponse.json({ bed: updated });
}

/** POST — reserve a ready bed for a patient (admission prep). */
export async function POST(req: NextRequest) {
  const gate = await requireModule(req, "beds");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!gate.session.hospitalId) return NextResponse.json({ error: "no_hospital" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.bedId || !body.patientId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const bed = await db.hospitalBed.findFirst({ where: { id: body.bedId, hospitalId: gate.session.hospitalId } });
  if (!bed) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!["ready", "available"].includes(bed.status)) {
    return NextResponse.json({ error: "bed_not_assignable", status: bed.status }, { status: 400 });
  }

  // Patient must belong to the same hospital as the bed (no cross-tenant reservation).
  const patient = await db.hospitalPatient.findFirst({ where: { id: body.patientId, hospitalId: gate.session.hospitalId } });
  if (!patient) return NextResponse.json({ error: "patient_not_found" }, { status: 404 });

  const updated = await db.hospitalBed.update({
    where: { id: bed.id },
    data: { status: "reserved", reservedForName: patient.fullName },
  });
  await audit({
    hospitalId: bed.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
    action: "bed.reserve", entityType: "HospitalBed", entityId: bed.id, patientId: patient.id,
    detail: { bed: bed.bedNumber, patient: patient.fullName },
  });
  return NextResponse.json({ bed: updated });
}
