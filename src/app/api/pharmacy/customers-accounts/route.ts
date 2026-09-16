import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";
import { AMOUNT_PAISE, CREDIT_LIMIT_PAISE, SALE_PAISE, rupeeToPaise, toRupees, toRupeesAll } from "@/lib/money";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pharmacy/customers-accounts — customers with credit outstanding + history
async function GET_impl() {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const customers = await db.customer.findMany({
      include: {
        sales: { where: { payMode: "credit" }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, invoiceNo: true, total: true, status: true, createdAt: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 10 },
        account: true,
      },
    });
    /* Sale.total, CustomerPayment.amount, CustomerAccount.creditLimit are
       integer paise — ledger sums are exact; serialize to rupees once here. */
    const withLedger = customers.map((c) => {
      const creditBills = toRupeesAll(c.sales, SALE_PAISE);
      const payments = toRupeesAll(c.payments, AMOUNT_PAISE);
      const totalBilled = creditBills.reduce((s, b) => s + b.total, 0);
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      const outstanding = totalBilled - totalPaid;
      return { ...c, sales: creditBills, payments, totalBilled, totalPaid, outstanding, hasAccount: !!c.account, account: c.account ? toRupees(c.account, CREDIT_LIMIT_PAISE) : null };
    });
    return NextResponse.json({ customers: withLedger.filter((c) => c.name !== "Walk-in") });
  } catch (err) {
    log.error("pharmacy", "customers_list_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "customers_accounts_failed", detail: "Customer accounts could not be loaded. Please retry." }, { status: 500 });
  }
}

// POST — record a customer payment (rupees in, paise stored)
const CustomerPaymentSchema = z.object({
  customerId: z.string().min(1),
  saleId: z.string().min(1).optional(),
  amount: z.number().min(0.01).max(100_000_000),
  payMode: z.enum(["cash", "upi", "card", "credit"]).default("cash"),
  refNo: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(300).optional(),
});

async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const parsed = CustomerPaymentSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "invalid_request", detail: "Invalid customer payment payload." }, { status: 400 });
    const { customerId, saleId, amount, payMode, refNo, notes } = parsed.data;
    const payment = await db.customerPayment.create({
      data: { customerId, saleId: saleId || null, amount: rupeeToPaise(amount), payMode, refNo: refNo || null, notes: notes || null },
    });
    return NextResponse.json({ ok: true, payment: toRupees(payment, AMOUNT_PAISE) });
  } catch (err) {
    log.error("pharmacy", "customer_payment_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "customer_payment_failed", detail: "The payment could not be recorded. Please retry." }, { status: 500 });
  }
}

export const GET = withProductAuth("pharmacy.customers-accounts.GET", GET_impl);
export const POST = withProductAuth("pharmacy.customers-accounts.POST", POST_impl);
