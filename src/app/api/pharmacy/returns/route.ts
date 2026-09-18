import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { getDemoContext } from "@/lib/pharmacy-context";
import { withProductAuth } from "@/lib/nx/product-auth";
import {
  NEAR_EXPIRY_RETURN_ITEM_PAISE,
  NEAR_EXPIRY_RETURN_PAISE,
  gstOnPaise,
  paiseToRupee,
  rupeeToPaise,
  toRupees,
  toRupeesAll,
} from "@/lib/money";

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
      include: {
        batches: {
          where: { branchId: ctx.branch.id, stockStrips: { gt: 0 } },
          orderBy: { expDate: "asc" },
        },
      },
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
      .flatMap((p) =>
        p.batches.map((b) => ({
          product: {
            id: p.id,
            name: p.name,
            genericName: p.genericName,
            cgstRate: p.cgstRate,
            sgstRate: p.sgstRate,
            tabletsPerStrip: p.tabletsPerStrip,
          },
          batch: {
            id: b.id,
            batchNo: b.batchNo,
            expDate: b.expDate,
            mrp: paiseToRupee(b.mrp),
            stockStrips: b.stockStrips,
          },
        })),
      );

    const returns = await db.nearExpiryReturn.findMany({
      where: { branchId: ctx.branch.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { supplier: { select: { id: true, name: true } }, items: true },
    });

    return NextResponse.json({
      nearExpiry,
      returns: returns.map((r) => {
        const conv = toRupees(r, NEAR_EXPIRY_RETURN_PAISE);
        if (Array.isArray(conv.items))
          conv.items = toRupeesAll(conv.items, NEAR_EXPIRY_RETURN_ITEM_PAISE);
        return conv;
      }),
    });
  } catch (err) {
    log.error("pharmacy", "returns.list_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "returns_failed", detail: "Returns data could not be loaded. Please retry." },
      { status: 500 },
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
      const detail = parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return NextResponse.json({ error: "invalid_request", detail }, { status: 400 });
    }
    const { supplierId, reason, items } = parsed.data;

    const count = await db.nearExpiryReturn.count();
    const returnNo = `RET-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    /* Client sends mrp in rupees; math + storage are integer paise. */
    let cgstPaise = 0,
      sgstPaise = 0,
      totalPaise = 0;
    const lineItems = items.map((it) => {
      const mrpPaise = rupeeToPaise(it.mrp);
      const grossPaise = it.qtyStrips * mrpPaise;
      const cPaise = gstOnPaise(grossPaise, it.cgstRate);
      const sPaise = gstOnPaise(grossPaise, it.sgstRate);
      const lineTotalPaise = grossPaise + cPaise + sPaise;
      cgstPaise += cPaise;
      sgstPaise += sPaise;
      totalPaise += lineTotalPaise;
      return { ...it, mrpPaise, lineTotalPaise };
    });

    /* Return memo + stock decrement commit together; the decrement is
       conditional so a return can never drive batch stock negative. */
    const ret = await db.$transaction(async (tx) => {
      const created = await tx.nearExpiryReturn.create({
        data: {
          returnNo,
          branchId: ctx.branch.id,
          supplierId,
          reason: reason || "Near expiry",
          status: "initiated",
          cgst: cgstPaise,
          sgst: sgstPaise,
          total: totalPaise,
          items: {
            create: lineItems.map((it) => ({
              productId: it.productId,
              batchId: it.batchId,
              batchNo: it.batchNo,
              medicineName: it.medicineName,
              expDate: it.expDate,
              qtyStrips: it.qtyStrips,
              mrp: it.mrpPaise,
              cgstRate: it.cgstRate,
              sgstRate: it.sgstRate,
              lineTotal: it.lineTotalPaise,
            })),
          },
        },
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
        {
          error: "insufficient_stock",
          detail: "One or more batches do not have enough stock to return.",
        },
        { status: 422 },
      );
    }

    const conv = toRupees(ret, NEAR_EXPIRY_RETURN_PAISE);
    if (Array.isArray(conv.items))
      conv.items = toRupeesAll(conv.items, NEAR_EXPIRY_RETURN_ITEM_PAISE);
    return NextResponse.json({ ok: true, return: conv });
  } catch (err) {
    log.error("pharmacy", "returns.create_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "return_failed", detail: "The return could not be recorded. Please retry." },
      { status: 500 },
    );
  }
}

export const GET = withProductAuth("pharmacy.returns.GET", GET_impl);
export const POST = withProductAuth("pharmacy.returns.POST", POST_impl);
