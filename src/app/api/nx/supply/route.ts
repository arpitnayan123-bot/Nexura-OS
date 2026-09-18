import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireHospitalContext, withRoute } from "@/lib/nx/api";
import { requireModule } from "@/lib/nx/session";
import { audit } from "@/lib/nx/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — inventory (supplies) + equipment & assets. */
export const GET = withRoute("nx.supply.inventory", async (req: NextRequest) => {
  const inv = await requireModule(req, "inventory");
  const eqGate = await requireModule(req, "equipment");
  const gate = "session" in inv ? inv : eqGate;
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalCtx = await requireHospitalContext(gate.session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;

  const [supplies, equipment] = await Promise.all([
    db.nxSupplyItem.findMany({ where: { hospitalId }, orderBy: [{ onHand: "asc" }] }),
    db.nxEquipment.findMany({ where: { hospitalId }, orderBy: { nextMaintenance: "asc" } }),
  ]);

  return NextResponse.json({
    supplies: supplies.map((s) => ({
      ...s,
      low: s.onHand <= s.reorderLevel,
      daysToExpiry: s.expiryDate
        ? Math.round((new Date(s.expiryDate).getTime() - Date.now()) / 86400000)
        : null,
    })),
    equipment: equipment.map((e) => ({
      ...e,
      maintenanceDueDays: e.nextMaintenance
        ? Math.round((new Date(e.nextMaintenance).getTime() - Date.now()) / 86400000)
        : null,
      maintenanceOverdue: e.nextMaintenance ? new Date(e.nextMaintenance) < new Date() : false,
    })),
    stats: {
      lowStock: supplies.filter((s) => s.onHand <= s.reorderLevel).length,
      expiring90d: supplies.filter(
        (s) => s.expiryDate && new Date(s.expiryDate) < new Date(Date.now() + 90 * 86400000),
      ).length,
      equipmentFault: equipment.filter((e) => e.status === "fault").length,
      maintenanceOverdue: equipment.filter(
        (e) =>
          e.nextMaintenance && new Date(e.nextMaintenance) < new Date() && e.status !== "retired",
      ).length,
      avgUtilization: equipment.length
        ? Math.round(equipment.reduce((s, e) => s + e.utilization, 0) / equipment.length)
        : 0,
    },
  });
});

/** PATCH — adjust stock / toggle equipment status. */
export const PATCH = withRoute("nx.supply.adjust", async (req: NextRequest) => {
  const inv = await requireModule(req, "inventory");
  const eqGate = await requireModule(req, "equipment");
  const gate = "session" in inv ? inv : eqGate;
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const body = await req.json().catch(() => ({}));
  const hospitalCtx = await requireHospitalContext(gate.session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;

  if (body.kind === "equipment") {
    // Tenant-scoped: assets from other hospitals are unreachable.
    const asset = await db.nxEquipment.findFirst({ where: { id: body.id, hospitalId } });
    if (!asset) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const status = ["in_service", "maintenance", "fault", "retired"].includes(body.status)
      ? body.status
      : asset.status;
    // Scoped updateMany + re-fetch: the response body below stays identical to
    // the historical `update()` payload while the write itself can never cross
    // a hospital boundary.
    const upd = await db.nxEquipment.updateMany({
      where: { id: asset.id, hospitalId },
      data: {
        status,
        nextMaintenance: body.nextMaintenance
          ? new Date(body.nextMaintenance)
          : asset.nextMaintenance,
      },
    });
    if (upd.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const updated = await db.nxEquipment.findFirst({ where: { id: asset.id, hospitalId } });
    await audit({
      hospitalId: asset.hospitalId,
      actorName: gate.session.name,
      actorRole: gate.session.role,
      action: "equipment.status",
      entityType: "NxEquipment",
      entityId: asset.id,
      detail: { asset: asset.name, from: asset.status, to: status },
    });
    return NextResponse.json({ equipment: updated });
  }

  // Tenant-scoped: stock from other hospitals is unreachable.
  const item = await db.nxSupplyItem.findFirst({ where: { id: body.id, hospitalId } });
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const delta = Number(body.delta || 0);
  const onHand = Math.max(0, item.onHand + delta);
  const upd = await db.nxSupplyItem.updateMany({
    where: { id: item.id, hospitalId },
    data: { onHand },
  });
  if (upd.count === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const updated = await db.nxSupplyItem.findFirst({ where: { id: item.id, hospitalId } });
  await audit({
    hospitalId: item.hospitalId,
    actorName: gate.session.name,
    actorRole: gate.session.role,
    action: "inventory.adjust",
    entityType: "NxSupplyItem",
    entityId: item.id,
    detail: { item: item.name, delta, newLevel: onHand },
  });
  return NextResponse.json({ item: updated, hospitalId });
});
