import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pharmacy/purchases — list purchases with supplier + items
async function GET_impl() {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const purchases = await db.purchase.findMany({
      where: { branchId: ctx.branch.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        supplier: { select: { id: true, name: true, phone: true, gstin: true } },
        items: { include: { product: { select: { id: true, name: true, genericName: true } } } },
        _count: { select: { payments: true } },
      },
    });
    return NextResponse.json({ purchases });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "purchases_failed", detail: message }, { status: 500 });
  }
}

// POST — create a purchase (receive stock) → updates inventory
async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const { supplierId, supplierInvoiceNo, items } = body as {
      supplierId?: string;
      supplierInvoiceNo?: string;
      items?: { productId: string; batchNo: string; mfgDate: string; expDate: string; mrp: number; purchaseRate: number; qtyStrips: number }[];
    };
    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "missing" }, { status: 400 });
    }
    const count = await db.purchase.count();
    const poNo = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    let total = 0;
    const lineItems = items.map((it) => {
      const lineTotal = it.purchaseRate * it.qtyStrips;
      total += lineTotal;
      return { ...it, lineTotal };
    });

    const purchase = await db.purchase.create({
      data: {
        poNo,
        supplierInvoiceNo: supplierInvoiceNo || null,
        branchId: ctx.branch.id,
        supplierId,
        status: "received",
        total,
        paidAmount: 0,
        items: { create: lineItems.map((it) => ({ productId: it.productId, batchNo: it.batchNo, mfgDate: it.mfgDate, expDate: it.expDate, mrp: it.mrp, purchaseRate: it.purchaseRate, qtyStrips: it.qtyStrips, lineTotal: it.lineTotal })) },
      },
      include: { items: true },
    });

    // update / create batches (increment stock)
    for (const it of lineItems) {
      const existing = await db.productBatch.findFirst({
        where: { productId: it.productId, branchId: ctx.branch.id, batchNo: it.batchNo },
      });
      if (existing) {
        await db.productBatch.update({
          where: { id: existing.id },
          data: { stockStrips: { increment: it.qtyStrips }, mrp: it.mrp, purchaseRate: it.purchaseRate, mfgDate: it.mfgDate, expDate: it.expDate },
        });
      } else {
        await db.productBatch.create({
          data: { productId: it.productId, branchId: ctx.branch.id, batchNo: it.batchNo, mfgDate: it.mfgDate, expDate: it.expDate, mrp: it.mrp, purchaseRate: it.purchaseRate, stockStrips: it.qtyStrips, stockLoose: 0 },
        });
      }
    }

    return NextResponse.json({ ok: true, purchase });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "purchase_failed", detail: message }, { status: 500 });
  }
}

export const GET = withProductAuth("pharmacy.purchases.GET", GET_impl);
export const POST = withProductAuth("pharmacy.purchases.POST", POST_impl);
