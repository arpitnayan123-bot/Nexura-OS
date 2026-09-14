import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "returns_failed", detail: message }, { status: 500 });
  }
}

// POST — create a return memo + credit note (decrements stock)
async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const { supplierId, reason, items } = body as { supplierId?: string; reason?: string; items?: { productId: string; batchId: string; batchNo: string; medicineName: string; expDate: string; qtyStrips: number; mrp: number; cgstRate: number; sgstRate: number }[] };
    if (!supplierId || !Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "missing" }, { status: 400 });

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

    const ret = await db.nearExpiryReturn.create({
      data: { returnNo, branchId: ctx.branch.id, supplierId, reason: reason || "Near expiry", status: "initiated", cgst, sgst, total, items: { create: lineItems.map((it) => ({ productId: it.productId, batchId: it.batchId, batchNo: it.batchNo, medicineName: it.medicineName, expDate: it.expDate, qtyStrips: it.qtyStrips, mrp: it.mrp, cgstRate: it.cgstRate, sgstRate: it.sgstRate, lineTotal: it.lineTotal })) } },
      include: { items: true },
    });

    // decrement stock
    for (const it of lineItems) {
      await db.productBatch.update({ where: { id: it.batchId }, data: { stockStrips: { decrement: it.qtyStrips } } });
    }

    return NextResponse.json({ ok: true, return: ret });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "return_failed", detail: message }, { status: 500 });
  }
}

export const GET = withProductAuth("pharmacy.returns.GET", GET_impl);
export const POST = withProductAuth("pharmacy.returns.POST", POST_impl);
