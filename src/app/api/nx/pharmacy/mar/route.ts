import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { fail, guard, ok, parseBody, withRoute } from "@/lib/nx/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   MEDICATION ADMINISTRATION RECORD (MAR)
   Nurse workflow: scheduled doses → given / held / refused / missed.
   Controlled substances always audited with witness note support.
   Allergy cross-check on create.
   ============================================================ */

const CreateSchema = z.object({
  patientId: z.string().min(3),
  prescriptionId: z.string().optional(),
  orderId: z.string().optional(),
  medicineName: z.string().min(2).max(160),
  dose: z.string().max(80).optional(),
  route: z.string().max(40).optional(),
  scheduledAt: z.string().datetime(),
  controlled: z.boolean().default(false),
});

export const POST = withRoute("mar.create", async (req: NextRequest) => {
  const g = await guard(req, "medication.order.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const body = await parseBody(req, CreateSchema);
  if ("response" in body) return body.response;

  const patient = await db.hospitalPatient.findFirst({ where: { id: body.data.patientId, hospitalId }, select: { id: true, uhid: true, allergy: true, fullName: true } });
  if (!patient) return fail("not_found", 404, "Patient not found.");

  // Allergy cross-check: warn (block only if exact token match)
  const allergyTokens = (patient.allergy || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const med = body.data.medicineName.toLowerCase();
  const exactHit = allergyTokens.find((t) => t.length > 3 && (med.includes(t) || t.includes(med)));
  const softHit = allergyTokens.find((t) => t.length > 3 && med.split(/\s+/).some((w) => w.startsWith(t.slice(0, 4))));

  const mar = await db.nxMedicationAdministration.create({
    data: {
      hospitalId,
      patientId: patient.id,
      patientUhid: patient.uhid,
      prescriptionId: body.data.prescriptionId,
      orderId: body.data.orderId,
      medicineName: body.data.medicineName,
      dose: body.data.dose,
      route: body.data.route,
      scheduledAt: new Date(body.data.scheduledAt),
      controlled: body.data.controlled,
    },
  });
  await audit({ hospitalId, actorName: g.session.name, actorRole: g.session.role, action: "mar.create", entityType: "mar", entityId: mar.id, patientId: patient.id, detail: { medicine: body.data.medicineName, controlled: body.data.controlled } });
  return NextResponse.json({
    data: {
      mar,
      allergyCheck: exactHit ? { level: "blocked", allergen: exactHit, message: `Patient allergy: ${patient.allergy}. Do not administer — contact the ordering clinician.` } : softHit ? { level: "warning", allergen: softHit, message: `Possible cross-sensitivity with allergy: ${patient.allergy}. Verify before administering.` } : { level: "clear" },
    },
  }, { status: 201 });
});

const AdministerSchema = z.object({
  id: z.string().min(3),
  status: z.enum(["given", "held", "refused", "missed"]),
  notes: z.string().max(500).optional(),
  witnessName: z.string().max(80).optional(),
});

export const PATCH = withRoute("mar.administer", async (req: NextRequest) => {
  const g = await guard(req, "medication.administer");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = AdministerSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);

  const mar = await db.nxMedicationAdministration.findFirst({ where: { id: parsed.data.id, hospitalId } });
  if (!mar) return fail("not_found", 404, "MAR entry not found.");
  if (mar.status === "given") return fail("already_given", 409, "This dose is already recorded as given.");

  // Controlled substances require a witness
  if (mar.controlled && parsed.data.status === "given" && !parsed.data.witnessName) {
    return fail("witness_required", 422, "Controlled substance administration requires a witness name.");
  }

  const updated = await db.nxMedicationAdministration.update({
    where: { id: mar.id },
    data: {
      status: parsed.data.status,
      administeredAt: parsed.data.status === "given" ? new Date() : null,
      administeredBy: g.session.name,
      notes: [parsed.data.notes, parsed.data.witnessName ? `witness: ${parsed.data.witnessName}` : null].filter(Boolean).join(" · ") || null,
    },
  });
  await audit({
    hospitalId, actorName: g.session.name, actorRole: g.session.role,
    action: mar.controlled ? "mar.controlled.administered" : "mar.administered",
    entityType: "mar", entityId: mar.id, patientId: mar.patientId,
    detail: { status: parsed.data.status, medicine: mar.medicineName, witness: parsed.data.witnessName },
  });
  return NextResponse.json({ data: { mar: updated } });
});

export const GET = withRoute("mar.list", async (req: NextRequest) => {
  const g = await guard(req, "medication.order.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const patientId = req.nextUrl.searchParams.get("patientId");
  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const entries = await db.nxMedicationAdministration.findMany({
    where: { hospitalId, ...(patientId ? { patientId } : {}), ...(status !== "all" ? { status } : {}) },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });
  const patientIds = Array.from(new Set(entries.map((e) => e.patientId)));
  const patients = await db.hospitalPatient.findMany({ where: { id: { in: patientIds } }, select: { id: true, fullName: true, uhid: true, allergy: true } });
  const pmap = new Map(patients.map((pt) => [pt.id, pt]));
  return NextResponse.json({ data: { entries: entries.map((e) => ({ ...e, patient: pmap.get(e.patientId) ?? null })) } });
});
void guard; void withRoute;
