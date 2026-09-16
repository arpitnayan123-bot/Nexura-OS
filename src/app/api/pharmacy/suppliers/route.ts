import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";
import { AMOUNT_PAISE, PURCHASE_PAISE, rupeeToPaise, toRupees, toRupeesAll } from "@/lib/money";
import { z } from "zod";

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
    /* Purchase.total/paidAmount and SupplierPayment.amount are integer paise —
       ledger sums are exact integer sums; serialize everything to rupees. */
    const withLedger = suppliers.map((s) => {
      const purchases = toRupeesAll(s.purchases, PURCHASE_PAISE);
      const payments = toRupeesAll(s.payments, AMOUNT_PAISE);
      const totalPurchased = purchases.reduce((sum, p) => sum + p.total, 0);
      const totalPaid = purchases.reduce((sum, p) => sum + p.paidAmount, 0);
      const outstanding = totalPurchased - totalPaid;
      return { ...s, purchases, payments, totalPurchased, totalPaid, outstanding };
    });
    return NextResponse.json({ suppliers: withLedger });
  } catch (err) {
    log.error("pharmacy", "suppliers_list_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "suppliers_failed", detail: "Suppliers could not be loaded. Please retry." }, { status: 500 });
  }
}

// POST — record a supplier payment (rupees in, paise stored)
const SupplierPaymentSchema = z.object({
  supplierId: z.string().min(1),
  purchaseId: z.string().min(1).optional(),
  amount: z.number().min(0.01).max(100_000_000),
  payMode: z.enum(["cash", "upi", "bank", "cheque"]).default("cash"),
  refNo: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(300).optional(),
});

async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const parsed = SupplierPaymentSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid_request", detail: "Invalid supplier payment payload." }, { status: 400 });
    const { supplierId, purchaseId, amount, payMode, refNo, notes } = parsed.data;
    const amountPaise = rupeeToPaise(amount);
    /* Payment row + purchase paidAmount increment commit together — they are
       one business operation; splitting them risks a paid-ledger mismatch. */
    const payment = await db.$transaction(async (tx) => {
      const created = await tx.supplierPayment.create({
        data: { supplierId, purchaseId: purchaseId || null, amount: amountPaise, payMode, refNo: refNo || null, notes: notes || null },
      });
      if (purchaseId) {
        await tx.purchase.update({ where: { id: purchaseId }, data: { paidAmount: { increment: amountPaise } } });
      }
      return created;
    });
    return NextResponse.json({ ok: true, payment: toRupees(payment, AMOUNT_PAISE) });
  } catch (err) {
    log.error("pharmacy", "supplier_payment_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "supplier_payment_failed", detail: "The payment could not be recorded. Please retry." }, { status: 500 });
  }
}

export const GET = withProductAuth("pharmacy.suppliers.GET", GET_impl);
export const POST = withProductAuth("pharmacy.suppliers.POST", POST_impl);
