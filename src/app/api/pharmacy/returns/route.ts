import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { getDemoContext } from "@/lib/pharmacy-context";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pharmacy/returns — near-expiry batches (<=90 days) + existing returns
async function GET_impl() {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const now = Date.now();
    const days90 = 1000 * 60 * 60 * 24 * 90;

    const products = await db.product.findMany({
      include: { batches: { where: { branchId: ctx.branch.id, stockStrips: { gt: 0 } }, orderBy: { expDate: "asc" } } },
    });
    const nearExpiry = products
      .map((p) => ({
        ...p,
        batches: p.batches.filter((b) => {
          const exp = new Date(b.expDate + "-01").getTime();
          return (exp - now) / (1000 * 60 * 60 * 24) <= 90;
        }),
      }))
      .filter((p) => p.batches.length > 0)
      .flatMap((p) => p.batches.map((b) => ({ product: { id: p.id, name: p.name, genericName: p.genericName, cgstRate: p.cgstRate, sgstRate: p.sgstRate, tabletsPerStrip: p.tabletsPerStrip }, batch: { id: b.id, batchNo: b.batchNo, expDate: b.expDate, mrp: b.mrp, stockStrips: b.stockStrips } })));

    const returns = await db.nearExpiryReturn.findMany({
      where: { branchId: ctx.branch.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { supplier: { select: { id: true, name: true } }, items: true },
    });

    return NextResponse.json({ nearExpiry, returns });
  } catch (err) {
    log.error("pharmacy", "returns.list_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "returns_failed", detail: "Returns data could not be loaded. Please retry." },
      { status: 500 }
    );
  }
}

// POST — create a return memo + credit note (decrements stock)
const ReturnItemSchema = z.object({
  productId: z.string().min(1),
  batchId: z.string().min(1),
  batchNo: z.string().min(1),
  medicineName: z.string().min(1).max(160),
  expDate: z.string().min(4).max(10),
  qtyStrips: z.number().int().min(1).max(100_000),
  mrp: z.number().min(0).max(1_000_000),
  cgstRate: z.number().min(0).max(100),
  sgstRate: z.number().min(0).max(100),
});
const ReturnSchema = z.object({
  supplierId: z.string().min(1),
  reason: z.string().max(300).optional(),
  items: z.array(ReturnItemSchema).min(1).max(200),
});

async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const parsed = ReturnSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const detail = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: "invalid_request", detail }, { status: 400 });
    }
    const { supplierId, reason, items } = parsed.data;

    const count = await db.nearExpiryReturn.count();
    const returnNo = `RET-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    let cgst = 0, sgst = 0, total = 0;
    const lineItems = items.map((it) => {
      const gross = it.qtyStrips * it.mrp;
      const c = (gross * it.cgstRate) / 100;
      const s = (gross * it.sgstRate) / 100;
      const lineTotal = gross + c + s;
      cgst += c; sgst += s; total += lineTotal;
      return { ...it, lineTotal };
    });

    /* Return memo + stock decrement commit together; the decrement is
       conditional so a return can never drive batch stock negative. */
    const ret = await db.$transaction(async (tx) => {
      const created = await tx.nearExpiryReturn.create({
        data: { returnNo, branchId: ctx.branch.id, supplierId, reason: reason || "Near expiry", status: "initiated", cgst, sgst, total, items: { create: lineItems.map((it) => ({ productId: it.productId, batchId: it.batchId, batchNo: it.batchNo, medicineName: it.medicineName, expDate: it.expDate, qtyStrips: it.qtyStrips, mrp: it.mrp, cgstRate: it.cgstRate, sgstRate: it.sgstRate, lineTotal: it.lineTotal })) } },
        include: { items: true },
      });
      for (const it of lineItems) {
        const dec = await tx.productBatch.updateMany({
          where: { id: it.batchId, branchId: ctx.branch.id, stockStrips: { gte: it.qtyStrips } },
          data: { stockStrips: { decrement: it.qtyStrips } },
        });
        if (dec.count === 0) {
          return null;
        }
      }
      return created;
    });

    if (!ret) {
      return NextResponse.json(
        { error: "insufficient_stock", detail: "One or more batches do not have enough stock to return." },
        { status: 422 }
      );
    }

    return NextResponse.json({ ok: true, return: ret });
  } catch (err) {
    log.error("pharmacy", "returns.create_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "return_failed", detail: "The return could not be recorded. Please retry." },
      { status: 500 }
    );
  }
}

export const GET = withProductAuth("pharmacy.returns.GET", GET_impl);
export const POST = withProductAuth("pharmacy.returns.POST", POST_impl);
