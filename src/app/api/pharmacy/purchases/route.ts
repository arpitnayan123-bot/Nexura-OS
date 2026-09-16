import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { getDemoContext } from "@/lib/pharmacy-context";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Validated purchase contract — the historical handler took mrp/purchaseRate/
   qtyStrips verbatim from the body, so any signed-in account could write
   arbitrary totals and inventory. Bounds mirror realistic pharma lines. */
const PurchaseItemSchema = z.object({
  productId: z.string().min(1),
  batchNo: z.string().trim().min(1).max(40),
  mfgDate: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
  expDate: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/),
  mrp: z.number().min(0).max(1_000_000),
  purchaseRate: z.number().min(0).max(1_000_000),
  qtyStrips: z.number().int().min(1).max(100_000),
});
const PurchaseSchema = z.object({
  supplierId: z.string().min(1),
  supplierInvoiceNo: z.string().trim().max(60).optional(),
  items: z.array(PurchaseItemSchema).min(1).max(200),
});

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
  } catch {
    return NextResponse.json(
      { error: "purchases_failed", detail: "Purchase history could not be loaded. Please retry." },
      { status: 500 }
    );
  }
}

// POST — create a purchase (receive stock) → updates inventory
async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const parsed = PurchaseSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const detail = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: "invalid_request", detail }, { status: 400 });
    }
    const { supplierId, supplierInvoiceNo, items } = parsed.data;

    const count = await db.purchase.count();
    const poNo = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    let total = 0;
    const lineItems = items.map((it) => {
      const lineTotal = it.purchaseRate * it.qtyStrips;
      total += lineTotal;
      return { ...it, lineTotal };
    });

    /* One goods-receipt = one transaction. Batch merge uses the
       (branchId, productId, batchNo) identity so two concurrent receipts of
       the same batch increment one row instead of splitting stock across
       duplicates (unique constraint added in migration 20260917_batch_identity). */
    const purchase = await db.$transaction(async (tx) => {
      const created = await tx.purchase.create({
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

      for (const it of lineItems) {
        await tx.productBatch.upsert({
          where: { branchId_productId_batchNo: { branchId: ctx.branch.id, productId: it.productId, batchNo: it.batchNo } },
          create: { productId: it.productId, branchId: ctx.branch.id, batchNo: it.batchNo, mfgDate: it.mfgDate, expDate: it.expDate, mrp: it.mrp, purchaseRate: it.purchaseRate, stockStrips: it.qtyStrips, stockLoose: 0 },
          update: { stockStrips: { increment: it.qtyStrips }, mrp: it.mrp, purchaseRate: it.purchaseRate, mfgDate: it.mfgDate, expDate: it.expDate },
        });
      }

      return created;
    });

    return NextResponse.json({ ok: true, purchase });
  } catch (err) {
    log.error("pharmacy", "purchases.create_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "purchase_failed", detail: "The purchase could not be recorded. Please retry." },
      { status: 500 }
    );
  }
}

export const GET = withProductAuth("pharmacy.purchases.GET", GET_impl);
export const POST = withProductAuth("pharmacy.purchases.POST", POST_impl);
