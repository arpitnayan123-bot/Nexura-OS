import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BillingItem = {
  productId: string;
  batchId?: string;
  qtyStrips: number;
  qtyLoose?: number;
};

// POST /api/pharmacy/billing
export async function POST(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const items: BillingItem[] = Array.isArray(body?.items) ? body.items : [];
    const discountPct = Number(body?.discountPct) || 0;
    const payMode = typeof body?.payMode === "string" ? body.payMode : "cash";
    const customerPhone = typeof body?.customerPhone === "string" ? body.customerPhone.trim() : null;

    if (items.length === 0) {
      return NextResponse.json({ error: "empty_cart" }, { status: 400 });
    }

    // resolve products + batches (FEFO — first expiry first out, pick earliest)
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
      include: {
        batches: {
          where: { branchId: ctx.branch.id },
          orderBy: { expDate: "asc" },
        },
      },
    });

    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    const saleItems: {
      productId: string;
      batchId: string;
      qtyStrips: number;
      qtyLoose: number;
      mrpPerStrip: number;
      cgstRate: number;
      sgstRate: number;
      lineTotal: number;
    }[] = [];

    for (const it of items) {
      const product = products.find((p) => p.id === it.productId);
      if (!product) continue;

      // pick batch: explicit or FEFO
      let batch =
        product.batches.find((b) => b.id === it.batchId) ?? product.batches[0];
      if (!batch) continue;

      const qtyStrips = Math.max(0, it.qtyStrips || 0);
      const qtyLoose = Math.max(0, it.qtyLoose || 0);
      if (qtyStrips === 0 && qtyLoose === 0) continue;

      // line mrp: strips at mrp, loose at mrp/tabletsPerStrip
      const looseMrp = batch.mrp / product.tabletsPerStrip;
      const gross = qtyStrips * batch.mrp + qtyLoose * looseMrp;
      const lineCgst = (gross * product.cgstRate) / 100;
      const lineSgst = (gross * product.sgstRate) / 100;
      const lineTotal = gross + lineCgst + lineSgst;

      subtotal += gross;
      cgst += lineCgst;
      sgst += lineSgst;

      saleItems.push({
        productId: product.id,
        batchId: batch.id,
        qtyStrips,
        qtyLoose,
        mrpPerStrip: batch.mrp,
        cgstRate: product.cgstRate,
        sgstRate: product.sgstRate,
        lineTotal,
      });
    }

    const discount = (subtotal * discountPct) / 100;
    const taxableAfterDiscount = subtotal - discount;
    // recompute gst proportionally on discounted subtotal
    const cgstFinal = (cgst / (subtotal || 1)) * taxableAfterDiscount;
    const sgstFinal = (sgst / (subtotal || 1)) * taxableAfterDiscount;
    const grand = taxableAfterDiscount + cgstFinal + sgstFinal;
    const rounded = Math.round(grand);
    const roundOff = +(rounded - grand).toFixed(2);

    // customer (walk-in if none)
    let customer = await db.customer.findFirst({ where: { name: "Walk-in" } });
    if (customerPhone) {
      const found = await db.customer.findFirst({ where: { phone: customerPhone } });
      if (found) customer = found;
    }

    // invoice number
    const count = await db.sale.count();
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const sale = await db.sale.create({
      data: {
        invoiceNo,
        branchId: ctx.branch.id,
        staffId: ctx.staff?.id ?? null,
        customerId: customer?.id ?? null,
        subtotal: +subtotal.toFixed(2),
        discountPct,
        discount: +discount.toFixed(2),
        cgst: +cgstFinal.toFixed(2),
        sgst: +sgstFinal.toFixed(2),
        roundOff,
        total: rounded,
        payMode,
        status: "billed",
        items: {
          create: saleItems.map((si) => ({
            productId: si.productId,
            batchId: si.batchId,
            qtyStrips: si.qtyStrips,
            qtyLoose: si.qtyLoose,
            mrpPerStrip: si.mrpPerStrip,
            cgstRate: si.cgstRate,
            sgstRate: si.sgstRate,
            lineTotal: +si.lineTotal.toFixed(2),
          })),
        },
      },
      include: { items: { include: { product: true, batch: true } } },
    });

    // decrement batch stock (FEFO)
    for (const si of saleItems) {
      await db.productBatch.update({
        where: { id: si.batchId },
        data: {
          stockStrips: { decrement: si.qtyStrips },
          stockLoose: { decrement: si.qtyLoose },
        },
      });
    }

    return NextResponse.json({ ok: true, sale });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "billing_failed", detail: message }, { status: 500 });
  }
}

// GET /api/pharmacy/billing — recent invoices
export async function GET() {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const sales = await db.sale.findMany({
      where: { branchId: ctx.branch.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { items: { include: { product: true } } },
    });
    return NextResponse.json({ sales });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "billing_list_failed", detail: message }, { status: 500 });
  }
}
