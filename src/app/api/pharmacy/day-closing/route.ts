import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";
import { DAY_CLOSING_PAISE, rupeeToPaise, toRupees } from "@/lib/money";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pharmacy/day-closing?date=YYYY-MM-DD
async function GET_impl(req: NextRequest) {
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
      db.dayClosing.findUnique({
        where: { branchId_closingDate: { branchId: ctx.branch.id, closingDate: date } },
      }),
    ]);

    const byMode = { cash: 0, upi: 0, card: 0, credit: 0 };
    /* Sale.total/cgst/sgst/discount and Purchase.total are INTEGER PAISE —
       these aggregates are exact integer sums, converted to rupees once below. */
    let cgstPaise = 0,
      sgstPaise = 0,
      discountPaise = 0,
      totalSalesPaise = 0;
    for (const s of sales) {
      byMode[s.payMode as keyof typeof byMode] =
        (byMode[s.payMode as keyof typeof byMode] || 0) + s.total;
      cgstPaise += s.cgst;
      sgstPaise += s.sgst;
      discountPaise += s.discount;
      totalSalesPaise += s.total;
    }
    const totalPurchasesPaise = purchases.reduce((s, p) => s + p.total, 0);
    const ru = (p: number) => p / 100;

    return NextResponse.json({
      date,
      closed: !!existing,
      invoiceCount: sales.length,
      cashSales: ru(byMode.cash),
      upiSales: ru(byMode.upi),
      cardSales: ru(byMode.card),
      creditSales: ru(byMode.credit),
      totalSales: ru(totalSalesPaise),
      cgstCollected: ru(cgstPaise),
      sgstCollected: ru(sgstPaise),
      totalGst: ru(cgstPaise + sgstPaise),
      totalDiscount: ru(discountPaise),
      totalPurchases: ru(totalPurchasesPaise),
      netProfit: ru(totalSalesPaise - discountPaise),
    });
  } catch (err) {
    log.error("pharmacy", "day_closing_list_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "day_closing_failed", detail: "The day summary could not be loaded. Please retry." },
      { status: 500 },
    );
  }
}

// POST — close the day (persist). Client sends the summary in RUPEES (same
// numbers the GET summary renders); persisted as integer paise. Explicit
// whitelist — the historical `...data` spread allowed mass assignment of
// arbitrary columns.
const DayCloseSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  data: z.object({
    cashSales: z.number().min(0).max(100_000_000).default(0),
    upiSales: z.number().min(0).max(100_000_000).default(0),
    cardSales: z.number().min(0).max(100_000_000).default(0),
    creditSales: z.number().min(0).max(100_000_000).default(0),
    totalSales: z.number().min(0).max(1_000_000_000).default(0),
    cgstCollected: z.number().min(0).max(100_000_000).default(0),
    sgstCollected: z.number().min(0).max(100_000_000).default(0),
    totalGst: z.number().min(0).max(100_000_000).default(0),
    totalPurchases: z.number().min(0).max(1_000_000_000).default(0),
    totalDiscount: z.number().min(0).max(100_000_000).default(0),
    netProfit: z.number().min(-100_000_000).max(1_000_000_000).default(0),
    invoiceCount: z.number().int().min(0).max(100_000).default(0),
    closedBy: z.string().trim().max(120).optional().nullable(),
  }),
});

async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const parsed = DayCloseSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", detail: "Invalid day-closing payload." },
        { status: 400 },
      );
    }
    const date = parsed.data.date || new Date().toISOString().slice(0, 10);
    const d = parsed.data.data;
    const data = {
      cashSales: rupeeToPaise(d.cashSales),
      upiSales: rupeeToPaise(d.upiSales),
      cardSales: rupeeToPaise(d.cardSales),
      creditSales: rupeeToPaise(d.creditSales),
      totalSales: rupeeToPaise(d.totalSales),
      cgstCollected: rupeeToPaise(d.cgstCollected),
      sgstCollected: rupeeToPaise(d.sgstCollected),
      totalGst: rupeeToPaise(d.totalGst),
      totalPurchases: rupeeToPaise(d.totalPurchases),
      totalDiscount: rupeeToPaise(d.totalDiscount),
      netProfit: rupeeToPaise(d.netProfit),
      invoiceCount: d.invoiceCount,
      closedBy: d.closedBy ?? null,
    };

    const closing = await db.dayClosing.upsert({
      where: { branchId_closingDate: { branchId: ctx.branch.id, closingDate: date } },
      create: { branchId: ctx.branch.id, closingDate: date, ...data },
      update: { ...data, closedAt: new Date() },
    });
    return NextResponse.json({ ok: true, closing: toRupees(closing, DAY_CLOSING_PAISE) });
  } catch (err) {
    log.error("pharmacy", "day_close_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "day_close_failed", detail: "The business day could not be closed. Please retry." },
      { status: 500 },
    );
  }
}

export const GET = withProductAuth("pharmacy.day-closing.GET", GET_impl);
export const POST = withProductAuth("pharmacy.day-closing.POST", POST_impl);
