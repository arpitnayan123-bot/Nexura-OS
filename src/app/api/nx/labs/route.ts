import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";
import { fire } from "@/lib/nx/automations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — laboratory work queue: specimen tasks + orders by stage + TAT. */
export async function GET(req: NextRequest) {
  const gate = await requireModule(req, "labs");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;

  const [orders, specimenTasks] = await Promise.all([
    db.hospitalOrder.findMany({
      where: { hospitalId, orderType: "lab" },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 60,
      include: {
        patient: { select: { fullName: true, uhid: true } },
        doctor: { select: { name: true } },
        labResults: true,
        nxOrderEvents: { orderBy: { createdAt: "asc" } },
      },
    }),
    db.nxTask.findMany({ where: { hospitalId, ownerRole: "lab", status: { in: ["open", "in_progress"] } }, orderBy: { dueAt: "asc" }, take: 20 }),
  ]);

  const stats = {
    stat: orders.filter((o) => o.priority === "stat" && !["completed", "cancelled"].includes(o.status)).length,
    pending: orders.filter((o) => ["ordered", "acknowledged"].includes(o.status)).length,
    processing: orders.filter((o) => o.status === "in_progress").length,
    completed: orders.filter((o) => o.status === "completed").length,
    critical: orders.filter((o) => o.labResults.some((r) => r.abnormalFlag === "critical")).length,
  };

  return NextResponse.json({
    queue: orders.map((o) => ({
      id: o.id,
      patient: o.patient,
      doctor: o.doctor?.name,
      test: (() => { try { return (JSON.parse(o.orderDetails) as { testName?: string }).testName; } catch { return "Lab test"; } })(),
      priority: o.priority,
      status: o.status,
      at: o.createdAt,
      stage: o.nxOrderEvents.length ? o.nxOrderEvents[o.nxOrderEvents.length - 1].toStatus : "ordered",
      tatMins: o.nxOrderEvents.length ? Math.round((new Date(o.nxOrderEvents[o.nxOrderEvents.length - 1].createdAt).getTime() - new Date(o.nxOrderEvents[0].createdAt).getTime()) / 60000) : null,
      results: o.labResults.map((r) => ({ id: r.id, test: r.testName, value: r.resultValue, unit: r.unit, flag: r.abnormalFlag, ref: [r.refRangeMin, r.refRangeMax], reportedAt: r.reportedAt })),
    })),
    specimenTasks,
    stats,
  });
}

/** POST — record a result for an order (then validate via orders PATCH). */
export async function POST(req: NextRequest) {
  const gate = await requireModule(req, "labs");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = await req.json().catch(() => ({}));
  if (!body.orderId || !body.testName) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const order = await db.hospitalOrder.findUnique({ where: { id: body.orderId }, include: { patient: true } });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const result = await db.labResult.create({
    data: {
      orderId: order.id,
      testName: String(body.testName),
      resultValue: body.value != null ? String(body.value) : null,
      unit: body.unit || null,
      refRangeMin: body.refMin ?? null,
      refRangeMax: body.refMax ?? null,
      abnormalFlag: body.flag || "normal",
      reportedAt: new Date(),
    },
  });
  if (order.status === "acknowledged") {
    await db.hospitalOrder.update({ where: { id: order.id }, data: { status: "in_progress" } });
    await db.nxOrderEvent.create({ data: { hospitalId: order.hospitalId, orderId: order.id, fromStatus: "acknowledged", toStatus: "in_progress", actorName: gate.session.name, actorRole: "lab", note: "Result captured" } });
  }
  await audit({
    hospitalId: order.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
    action: "result.enter", entityType: "LabResult", entityId: result.id, patientId: order.patientId,
    detail: { test: result.testName, value: result.resultValue, flag: result.abnormalFlag },
  });
  if (result.abnormalFlag === "critical") {
    await fire("result.critical", {
      hospitalId: order.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
      patientId: order.patientId, patientName: order.patient.fullName, patientUhid: order.patientUhid,
      relatedId: result.id, detail: { testName: result.testName, value: result.resultValue },
    });
  }
  return NextResponse.json({ result });
}
