import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pharmacy/customers-accounts — customers with credit outstanding + history
export async function GET() {
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
    const withLedger = customers.map((c) => {
      const creditBills = c.sales;
      const totalBilled = creditBills.reduce((s, b) => s + b.total, 0);
      const totalPaid = c.payments.reduce((s, p) => s + p.amount, 0);
      const outstanding = totalBilled - totalPaid;
      return { ...c, totalBilled, totalPaid, outstanding, hasAccount: !!c.account };
    });
    return NextResponse.json({ customers: withLedger.filter((c) => c.name !== "Walk-in") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "customers_accounts_failed", detail: message }, { status: 500 });
  }
}

// POST — record a customer payment (partial/full)
export async function POST(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const { customerId, saleId, amount, payMode, refNo, notes } = body as { customerId?: string; saleId?: string; amount?: number; payMode?: string; refNo?: string; notes?: string };
    if (!customerId || !amount || amount <= 0) return NextResponse.json({ error: "missing" }, { status: 400 });
    const payment = await db.customerPayment.create({
      data: { customerId, saleId: saleId || null, amount, payMode: payMode || "cash", refNo: refNo || null, notes: notes || null },
    });
    return NextResponse.json({ ok: true, payment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "customer_payment_failed", detail: message }, { status: 500 });
  }
}
