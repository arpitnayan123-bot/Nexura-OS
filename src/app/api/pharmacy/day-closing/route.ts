import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pharmacy/day-closing?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const date = dateParam || new Date().toISOString().slice(0, 10);

    const dayStart = new Date(date + "T00:00:00");
    const dayEnd = new Date(date + "T23:59:59.999");

    const [sales, purchases, existing] = await Promise.all([
      db.sale.findMany({
        where: { createdAt: { gte: dayStart, lte: dayEnd }, status: { in: ["billed"] } },
        select: { payMode: true, total: true, cgst: true, sgst: true, discount: true, id: true },
      }),
      db.purchase.findMany({
        where: { createdAt: { gte: dayStart, lte: dayEnd }, status: "received" },
        select: { total: true },
      }),
      db.dayClosing.findUnique({ where: { branchId_closingDate: { branchId: ctx.branch.id, closingDate: date } } }),
    ]);

    const byMode = { cash: 0, upi: 0, card: 0, credit: 0 };
    let cgst = 0, sgst = 0, discount = 0, totalSales = 0;
    for (const s of sales) {
      byMode[s.payMode as keyof typeof byMode] = (byMode[s.payMode as keyof typeof byMode] || 0) + s.total;
      cgst += s.cgst;
      sgst += s.sgst;
      discount += s.discount;
      totalSales += s.total;
    }
    const totalPurchases = purchases.reduce((s, p) => s + p.total, 0);
    const netProfit = totalSales - discount - totalPurchases * 0.0; // profit = sales (margin is in purchase vs mrp; simplified)

    return NextResponse.json({
      date,
      closed: !!existing,
      invoiceCount: sales.length,
      cashSales: byMode.cash,
      upiSales: byMode.upi,
      cardSales: byMode.card,
      creditSales: byMode.credit,
      totalSales,
      cgstCollected: cgst,
      sgstCollected: sgst,
      totalGst: cgst + sgst,
      totalDiscount: discount,
      totalPurchases,
      netProfit: totalSales - discount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "day_closing_failed", detail: message }, { status: 500 });
  }
}

// POST — close the day (persist)
export async function POST(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const date = body.date || new Date().toISOString().slice(0, 10);
    const data = body.data as any;

    const closing = await db.dayClosing.upsert({
      where: { branchId_closingDate: { branchId: ctx.branch.id, closingDate: date } },
      create: { branchId: ctx.branch.id, closingDate: date, ...data },
      update: { ...data, closedAt: new Date() },
    });
    return NextResponse.json({ ok: true, closing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "day_close_failed", detail: message }, { status: 500 });
  }
}
