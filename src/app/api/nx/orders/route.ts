import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";
import { fire } from "@/lib/nx/automations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_FLOW: Record<string, string[]> = {
  ordered: ["acknowledged", "cancelled"],
  acknowledged: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** GET — unified orders & results center. */
export async function GET(req: NextRequest) {
  const gate = await requireModule(req, "orders");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");

  const where: Record<string, unknown> = { hospitalId };
  if (type) where.orderType = { in: type.split(",") };
  if (status) where.status = { in: status.split(",") };
  if (priority) where.priority = { in: priority.split(",") };

  const orders = await db.hospitalOrder.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: 80,
    include: {
      patient: { select: { fullName: true, uhid: true } },
      doctor: { select: { name: true } },
      labResults: true,
      nxOrderEvents: true,
    },
  });

  const counts = {
    stat: await db.hospitalOrder.count({ where: { hospitalId, priority: "stat", status: { notIn: ["completed", "cancelled"] } } }),
    active: await db.hospitalOrder.count({ where: { hospitalId, status: { in: ["ordered", "acknowledged", "in_progress"] } } }),
    completed: await db.hospitalOrder.count({ where: { hospitalId, status: "completed" } }),
    criticalResults: orders.flatMap((o) => o.labResults).filter((r) => r.abnormalFlag === "critical").length,
  };

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      patient: o.patient,
      doctor: o.doctor?.name,
      type: o.orderType,
      details: (() => { try { return JSON.parse(o.orderDetails); } catch { return {}; } })(),
      priority: o.priority,
      status: o.status,
      at: o.createdAt,
      results: o.labResults.map((r) => ({ id: r.id, test: r.testName, value: r.resultValue, unit: r.unit, flag: r.abnormalFlag, ref: [r.refRangeMin, r.refRangeMax] })),
      timeline: o.nxOrderEvents.map((e) => ({ from: e.fromStatus, to: e.toStatus, actor: e.actorName, role: e.actorRole, at: e.createdAt, note: e.note })),
    })),
    counts,
  });
}

/** POST — create order (fires routing automation). */
export async function POST(req: NextRequest) {
  const gate = await requireModule(req, "orders");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!["doctor", "admin"].includes(gate.session.role)) {
    return NextResponse.json({ error: "only_doctors_can_order", detail: "Ordering requires an authorized prescriber role" }, { status: 403 });
  }
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;
  const body = await req.json().catch(() => ({}));
  if (!body.patientId || !body.orderType || !body.testName) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const patient = await db.hospitalPatient.findFirst({ where: { id: body.patientId, hospitalId } });
  if (!patient) return NextResponse.json({ error: "patient_not_found" }, { status: 404 });

  const order = await db.hospitalOrder.create({
    data: {
      hospitalId: hospitalId!,
      patientId: patient.id,
      patientUhid: patient.uhid,
      orderingDoctorId: body.doctorId || null,
      admissionId: body.admissionId || null,
      orderType: body.orderType,
      orderDetails: JSON.stringify({ testName: body.testName, notes: body.notes || "", dose: body.dose, frequency: body.frequency }),
      priority: ["routine", "urgent", "stat"].includes(body.priority) ? body.priority : "routine",
    },
  });
  await db.nxOrderEvent.create({
    data: { hospitalId: hospitalId!, orderId: order.id, fromStatus: null, toStatus: "ordered", actorName: gate.session.name, actorRole: gate.session.role, note: body.notes },
  });
  await audit({
    hospitalId: hospitalId!, actorName: gate.session.name, actorRole: gate.session.role,
    action: "order.create", entityType: "HospitalOrder", entityId: order.id, patientId: patient.id,
    detail: { type: body.orderType, test: body.testName, priority: order.priority },
  });
  await fire("order.created", {
    hospitalId: hospitalId!, actorName: gate.session.name, actorRole: gate.session.role,
    patientId: patient.id, patientName: patient.fullName, patientUhid: patient.uhid,
    relatedId: order.id, detail: { orderType: body.orderType, priority: order.priority },
  });
  return NextResponse.json({ order });
}

/** PATCH — advance order lifecycle / validate result (fires critical-result automation). */
export async function PATCH(req: NextRequest) {
  const gate = await requireModule(req, "orders");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  if (!gate.session.hospitalId) return NextResponse.json({ error: "no_hospital" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.id || !body.to) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  // Tenant-scoped: orders from other hospitals are unreachable.
  const order = await db.hospitalOrder.findFirst({ where: { id: body.id, hospitalId: gate.session.hospitalId }, include: { patient: true, labResults: true } });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (body.to === "validate_result") {
    // Lab validation path
    const { resultId, flag, value } = body;
    const result = await db.labResult.findUnique({ where: { id: resultId } });
    if (!result || result.orderId !== order.id) return NextResponse.json({ error: "result_not_found" }, { status: 404 });
    // Whitelisted flags only — a forged "critical" would page the escalation chain.
    const VALID_FLAGS = ["normal", "abnormal", "critical"];
    const safeFlag = VALID_FLAGS.includes(flag) ? flag : result.abnormalFlag;
    const updated = await db.labResult.update({
      where: { id: resultId },
      data: { abnormalFlag: safeFlag, resultValue: value || result.resultValue, reportedAt: new Date() },
    });
    await audit({
      hospitalId: order.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
      action: "result.validate", entityType: "LabResult", entityId: resultId, patientId: order.patientId,
      detail: { test: result.testName, flag: updated.abnormalFlag },
    });
    if (updated.abnormalFlag === "critical") {
      await fire("result.critical", {
        hospitalId: order.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
        patientId: order.patientId, patientName: order.patient.fullName, patientUhid: order.patientUhid,
        relatedId: resultId, detail: { testName: result.testName, value: updated.resultValue },
      });
    }
    return NextResponse.json({ result: updated });
  }

  const allowed = ORDER_FLOW[order.status] || [];
  if (!allowed.includes(body.to)) {
    return NextResponse.json({ error: "invalid_transition", from: order.status, allowed }, { status: 400 });
  }

  const updated = await db.hospitalOrder.update({ where: { id: order.id }, data: { status: body.to } });
  await db.nxOrderEvent.create({
    data: { hospitalId: order.hospitalId, orderId: order.id, fromStatus: order.status, toStatus: body.to, actorName: gate.session.name, actorRole: gate.session.role, note: body.note },
  });
  await audit({
    hospitalId: order.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
    action: "order.lifecycle", entityType: "HospitalOrder", entityId: order.id, patientId: order.patientId,
    detail: { from: order.status, to: body.to },
  });
  return NextResponse.json({ order: updated });
}
