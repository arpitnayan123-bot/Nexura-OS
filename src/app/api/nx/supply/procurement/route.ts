import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { fail, guard, withRoute } from "@/lib/nx/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   PROCUREMENT — vendors, purchase orders, stock transactions.
   Stock mutations keep NxSupplyItem.onHand transactional and
   alert on low stock + near-expiry after every receipt.
   ============================================================ */

export const GET = withRoute("procurement.list", async (req: NextRequest) => {
  const g = await guard(req, "inventory.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const kind = req.nextUrl.searchParams.get("kind") ?? "all";

  const [vendors, purchaseOrders, recentTxns, allItems, expiring] = await Promise.all([
    kind === "all" || kind === "vendors"
      ? db.nxVendor.findMany({ where: { hospitalId }, orderBy: { name: "asc" }, take: 100 })
      : [],
    kind === "all" || kind === "orders"
      ? db.nxPurchaseOrder.findMany({
          where: { hospitalId },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [],
    kind === "all" || kind === "txns"
      ? db.nxStockTxn.findMany({
          where: { hospitalId },
          orderBy: { createdAt: "desc" },
          take: 40,
          include: { item: { select: { name: true, unit: true } } },
        })
      : [],
    db.nxSupplyItem.findMany({ where: { hospitalId }, orderBy: { name: "asc" } }),
    db.nxSupplyItem.findMany({
      where: { hospitalId, expiryDate: { lte: new Date(Date.now() + 90 * 24 * 3600_000) } },
      orderBy: { expiryDate: "asc" },
      take: 20,
    }),
  ]);

  return NextResponse.json({
    data: {
      vendors,
      purchaseOrders: purchaseOrders.map((po) => ({ ...po, items: JSON.parse(po.items || "[]") })),
      recentTxns,
      alerts: {
        lowStock: allItems
          .filter((i) => i.onHand <= i.reorderLevel)
          .map((i) => ({
            id: i.id,
            name: i.name,
            onHand: i.onHand,
            reorderLevel: i.reorderLevel,
            unit: i.unit,
          })),
        expiring: expiring.map((i) => ({
          id: i.id,
          name: i.name,
          expiryDate: i.expiryDate,
          batchNo: i.batchNo,
        })),
      },
    },
  });
});

const VendorSchema = z.object({
  name: z.string().min(2).max(120),
  contactName: z.string().max(80).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  gstin: z.string().max(20).optional(),
});

export const POST = withRoute("procurement.vendor.create", async (req: NextRequest) => {
  const g = await guard(req, "inventory.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = VendorSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);
  const vendor = await db.nxVendor.create({ data: { ...parsed.data, hospitalId } });
  await audit({
    hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: "inventory.vendor.create",
    entityType: "nx_vendor",
    entityId: vendor.id,
  });
  return NextResponse.json({ data: { vendor } }, { status: 201 });
});

const POSchema = z.object({
  vendorId: z.string().min(3),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        qty: z.number().int().min(1),
        unit: z.string().default("units"),
        unitPrice: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(50),
  expectedAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const PUT = withRoute("procurement.po.create", async (req: NextRequest) => {
  const g = await guard(req, "inventory.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = POSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);
  const vendor = await db.nxVendor.findFirst({ where: { id: parsed.data.vendorId, hospitalId } });
  if (!vendor) return fail("not_found", 404, "Vendor not found.");

  const total = parsed.data.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const po = await db.nxPurchaseOrder.create({
    data: {
      hospitalId,
      vendorId: vendor.id,
      vendorName: vendor.name,
      poNumber: `PO-${Date.now().toString(36).toUpperCase()}`,
      status: "submitted",
      items: JSON.stringify(parsed.data.items),
      totalValue: total,
      raisedBy: g.session.name,
      expectedAt: parsed.data.expectedAt ? new Date(parsed.data.expectedAt) : null,
      notes: parsed.data.notes,
    },
  });
  await audit({
    hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: "inventory.po.create",
    entityType: "nx_purchase_order",
    entityId: po.id,
    detail: { total, items: parsed.data.items.length },
  });
  return NextResponse.json({ data: { po } }, { status: 201 });
});

const TxnSchema = z.object({
  itemId: z.string().min(3),
  kind: z.enum(["receipt", "issue", "adjust", "wastage", "transfer_in", "transfer_out"]),
  qty: z.number().int().min(1).max(100000),
  batchNo: z.string().max(40).optional(),
  reason: z.string().max(300).optional(),
  poId: z.string().optional(),
});

const DELTA: Record<string, number> = {
  receipt: 1,
  transfer_in: 1,
  issue: -1,
  adjust: 0,
  wastage: -1,
  transfer_out: -1,
};

export const PATCH = withRoute("procurement.txn", async (req: NextRequest) => {
  const g = await guard(req, "inventory.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = TxnSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);

  const item = await db.nxSupplyItem.findFirst({ where: { id: parsed.data.itemId, hospitalId } });
  if (!item) return fail("not_found", 404, "Item not found.");
  const sign = DELTA[parsed.data.kind];
  const delta =
    parsed.data.kind === "adjust" ? parsed.data.qty - item.onHand : sign * parsed.data.qty;
  const newOnHand = item.onHand + delta;
  if (newOnHand < 0)
    return fail("insufficient_stock", 422, `Only ${item.onHand} ${item.unit} on hand.`);

  /* The stock mutation is conditional INSIDE the transaction — the historical
     code read `onHand`, computed `newOnHand`, then wrote it back, so two
     concurrent issues of the same item both computed from the same starting
     value and one issue was silently lost (lost update). Negative deltas
     (issue/wastage/transfer_out) additionally re-check sufficiency in the
     UPDATE's where-clause; `adjust` is a compare-and-set on the read value. */
  const txn = await db.$transaction(async (tx) => {
    const created = await tx.nxStockTxn.create({
      data: {
        hospitalId,
        itemId: item.id,
        kind: parsed.data.kind,
        qty: parsed.data.qty,
        batchNo: parsed.data.batchNo,
        reason: parsed.data.reason,
        actorName: g.session.name,
      },
    });
    let applied: { count: number };
    if (delta < 0) {
      applied = await tx.nxSupplyItem.updateMany({
        where: { id: item.id, hospitalId, onHand: { gte: -delta } },
        data: { onHand: { decrement: -delta } },
      });
    } else if (delta > 0) {
      applied = await tx.nxSupplyItem.updateMany({
        where: { id: item.id, hospitalId },
        data: { onHand: { increment: delta } },
      });
    } else {
      applied = await tx.nxSupplyItem.updateMany({
        where: { id: item.id, hospitalId, onHand: item.onHand },
        data: { onHand: parsed.data.qty },
      });
    }
    if (applied.count === 0) return null;
    return created;
  });
  if (!txn)
    return fail("stock_conflict", 409, "Stock changed concurrently — re-check the item and retry.");

  if (parsed.data.poId && parsed.data.kind === "receipt") {
    await db.nxPurchaseOrder
      .updateMany({
        where: {
          id: parsed.data.poId,
          hospitalId,
          status: { in: ["submitted", "partially_received"] },
        },
        data: { status: "received", receivedAt: new Date() },
      })
      .catch(() => {});
  }

  const alerts: string[] = [];
  if (newOnHand <= item.reorderLevel)
    alerts.push(
      `LOW STOCK: ${item.name} at ${newOnHand} ${item.unit} (reorder at ${item.reorderLevel})`,
    );
  await audit({
    hospitalId,
    actorName: g.session.name,
    actorRole: g.session.role,
    action: `inventory.${parsed.data.kind}`,
    entityType: "nx_stock_txn",
    entityId: txn.id,
    detail: { item: item.name, qty: parsed.data.qty, newOnHand },
  });
  return NextResponse.json({ data: { txn, onHand: newOnHand, alerts } });
});
void guard;
void withRoute;
