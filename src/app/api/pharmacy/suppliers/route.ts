import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pharmacy/suppliers — list with ledger (outstanding + payments)
async function GET_impl() {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const suppliers = await db.supplier.findMany({
      where: { purchases: { some: { branchId: ctx.branch.id } } },
      include: {
        purchases: { where: { branchId: ctx.branch.id }, select: { id: true, poNo: true, total: true, paidAmount: true, createdAt: true, status: true }, orderBy: { createdAt: "desc" } },
        payments: { include: { purchase: { select: { poNo: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    const withLedger = suppliers.map((s) => {
      const totalPurchased = s.purchases.reduce((sum, p) => sum + p.total, 0);
      const totalPaid = s.purchases.reduce((sum, p) => sum + p.paidAmount, 0);
      const outstanding = totalPurchased - totalPaid;
      return { ...s, totalPurchased, totalPaid, outstanding };
    });
    return NextResponse.json({ suppliers: withLedger });
  } catch (err) {
    log.error("pharmacy", "suppliers_list_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "suppliers_failed", detail: "Suppliers could not be loaded. Please retry." }, { status: 500 });
  }
}

// POST — record a supplier payment
async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const { supplierId, purchaseId, amount, payMode, refNo, notes } = body as { supplierId?: string; purchaseId?: string; amount?: number; payMode?: string; refNo?: string; notes?: string };
    if (!supplierId || !amount || amount <= 0) return NextResponse.json({ error: "missing" }, { status: 400 });
    const payment = await db.supplierPayment.create({
      data: { supplierId, purchaseId: purchaseId || null, amount, payMode: payMode || "cash", refNo: refNo || null, notes: notes || null },
    });
    // update purchase paidAmount
    if (purchaseId) {
      const p = await db.purchase.findUnique({ where: { id: purchaseId } });
      if (p) await db.purchase.update({ where: { id: purchaseId }, data: { paidAmount: { increment: amount } } });
    }
    return NextResponse.json({ ok: true, payment });
  } catch (err) {
    log.error("pharmacy", "supplier_payment_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "supplier_payment_failed", detail: "The payment could not be recorded. Please retry." }, { status: 500 });
  }
}

export const GET = withProductAuth("pharmacy.suppliers.GET", GET_impl);
export const POST = withProductAuth("pharmacy.suppliers.POST", POST_impl);
