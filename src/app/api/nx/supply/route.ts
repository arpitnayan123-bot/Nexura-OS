import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — inventory (supplies) + equipment & assets. */
export async function GET(req: NextRequest) {
  const inv = requireModule(req, "inventory");
  const eqGate = requireModule(req, "equipment");
  const gate = "session" in inv ? inv : eqGate;
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;

  const [supplies, equipment] = await Promise.all([
    db.nxSupplyItem.findMany({ where: { hospitalId }, orderBy: [{ onHand: "asc" }] }),
    db.nxEquipment.findMany({ where: { hospitalId }, orderBy: { nextMaintenance: "asc" } }),
  ]);

  return NextResponse.json({
    supplies: supplies.map((s) => ({
      ...s,
      low: s.onHand <= s.reorderLevel,
      daysToExpiry: s.expiryDate ? Math.round((new Date(s.expiryDate).getTime() - Date.now()) / 86400000) : null,
    })),
    equipment: equipment.map((e) => ({
      ...e,
      maintenanceDueDays: e.nextMaintenance ? Math.round((new Date(e.nextMaintenance).getTime() - Date.now()) / 86400000) : null,
      maintenanceOverdue: e.nextMaintenance ? new Date(e.nextMaintenance) < new Date() : false,
    })),
    stats: {
      lowStock: supplies.filter((s) => s.onHand <= s.reorderLevel).length,
      expiring90d: supplies.filter((s) => s.expiryDate && new Date(s.expiryDate) < new Date(Date.now() + 90 * 86400000)).length,
      equipmentFault: equipment.filter((e) => e.status === "fault").length,
      maintenanceOverdue: equipment.filter((e) => e.nextMaintenance && new Date(e.nextMaintenance) < new Date() && e.status !== "retired").length,
      avgUtilization: equipment.length ? Math.round(equipment.reduce((s, e) => s + e.utilization, 0) / equipment.length) : 0,
    },
  });
}

/** PATCH — adjust stock / toggle equipment status. */
export async function PATCH(req: NextRequest) {
  const inv = requireModule(req, "inventory");
  const eqGate = requireModule(req, "equipment");
  const gate = "session" in inv ? inv : eqGate;
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = await req.json().catch(() => ({}));
  const hospitalId = (await db.hospital.findFirst())?.id;

  if (body.kind === "equipment") {
    const asset = await db.nxEquipment.findUnique({ where: { id: body.id } });
    if (!asset) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const status = ["in_service", "maintenance", "fault", "retired"].includes(body.status) ? body.status : asset.status;
    const updated = await db.nxEquipment.update({ where: { id: asset.id }, data: { status, nextMaintenance: body.nextMaintenance ? new Date(body.nextMaintenance) : asset.nextMaintenance } });
    await audit({
      hospitalId: asset.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
      action: "equipment.status", entityType: "NxEquipment", entityId: asset.id,
      detail: { asset: asset.name, from: asset.status, to: status },
    });
    return NextResponse.json({ equipment: updated });
  }

  const item = await db.nxSupplyItem.findUnique({ where: { id: body.id } });
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const delta = Number(body.delta || 0);
  const onHand = Math.max(0, item.onHand + delta);
  const updated = await db.nxSupplyItem.update({ where: { id: item.id }, data: { onHand } });
  await audit({
    hospitalId: item.hospitalId, actorName: gate.session.name, actorRole: gate.session.role,
    action: "inventory.adjust", entityType: "NxSupplyItem", entityId: item.id,
    detail: { item: item.name, delta, newLevel: onHand },
  });
  return NextResponse.json({ item: updated, hospitalId });
}
