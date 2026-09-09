import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — pharmacy work queue: medication orders awaiting verification + inventory alerts. */
export async function GET(req: NextRequest) {
  const gate = requireModule(req, "pharmacy");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;

  const [medOrders, lowStock, expiring] = await Promise.all([
    db.hospitalOrder.findMany({
      where: { hospitalId, orderType: "medication" },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 40,
      include: {
        patient: { select: { fullName: true, uhid: true, allergy: true } },
        doctor: { select: { name: true } },
        nxOrderEvents: true,
      },
    }),
    db.nxSupplyItem.findMany({ where: { hospitalId }, orderBy: { onHand: "asc" } }),
    db.nxSupplyItem.findMany({ where: { hospitalId }, orderBy: { onHand: "asc" } }),
  ]);

  const soon = new Date(Date.now() + 90 * 86400000);
  const expiringSoon = expiring.filter((m) => m.expiryDate && new Date(m.expiryDate) <= soon).slice(0, 6);

  return NextResponse.json({
    verificationQueue: medOrders.map((o) => {
      let det: { testName?: string; dose?: string; frequency?: string; notes?: string } = {};
      try { det = JSON.parse(o.orderDetails); } catch { /* ignore */ }
      return {
        id: o.id,
        patient: o.patient,
        doctor: o.doctor?.name,
        drug: det.testName || "Medication",
        dose: det.dose || null,
        frequency: det.frequency || null,
        priority: o.priority,
        status: o.status,
        at: o.createdAt,
        allergies: (o.patient.allergy || "").split(",").map((s) => s.trim()).filter(Boolean),
        verified: o.status !== "ordered",
      };
    }),
    lowStock: lowStock.filter((s) => s.onHand <= s.reorderLevel),
    expiringSoon: expiringSoon.map((m) => ({ id: m.id, name: m.name, expiryDate: m.expiryDate, batchNo: m.batchNo })),
  });
}

/** PATCH — verify / dispense a medication order. */
export async function PATCH(req: NextRequest) {
  const gate = requireModule(req, "pharmacy");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = await req.json().catch(() => ({}));
  if (!body.id || !body.to) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const order = await db.hospitalOrder.findUnique({ where: { id: body.id }, include: { patient: true } });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const flow: Record<string, string[]> = { ordered: ["acknowledged", "cancelled"], acknowledged: ["in_progress", "cancelled"], in_progress: ["completed"], completed: [], cancelled: [] };
  if (!(flow[order.status] || []).includes(body.to)) {
    return NextResponse.json({ error: "invalid_transition", from: order.status }, { status: 400 });
  }

  const updated = await db.hospitalOrder.update({ where: { id: order.id }, data: { status: body.to } });
  await db.nxOrderEvent.create({
    data: {
      hospitalId: order.hospitalId, orderId: order.id, fromStatus: order.status, toStatus: body.to,
      actorName: gate.session.name, actorRole: "pharmacist", note: body.note || (body.to === "acknowledged" ? "Pharmacist verification passed" : undefined),
    },
  });
  await audit({
    hospitalId: order.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
    action: `medication.${body.to === "acknowledged" ? "verify" : body.to}`, entityType: "HospitalOrder", entityId: order.id, patientId: order.patientId,
    detail: { drug: order.orderDetails, from: order.status, to: body.to },
  });
  return NextResponse.json({ order: updated });
}
