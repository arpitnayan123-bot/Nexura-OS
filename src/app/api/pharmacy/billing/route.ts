import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { getDemoContext } from "@/lib/pharmacy-context";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Request contract (zod-validated — the historical handler dereferenced
   body fields raw, silently coerced garbage quantities and accepted an
   unbounded discountPct, letting a signed-in account inflate/deflate any
   invoice). Bounds mirror what the POS UI can actually produce. */
const BillingItemSchema = z.object({
  productId: z.string().min(1),
  batchId: z.string().min(1).optional(),
  qtyStrips: z.number().int().min(0).max(1000).default(0),
  qtyLoose: z.number().int().min(0).max(10_000).default(0),
  scheduleH: z.record(z.string(), z.unknown()).optional(),
});
const BillingSchema = z.object({
  items: z.array(BillingItemSchema).min(1, "cart cannot be empty").max(100),
  discountPct: z.number().min(0).max(100).default(0),
  payMode: z.enum(["cash", "upi", "card", "credit"]).default("cash"),
  customerPhone: z.string().trim().max(15).optional().nullable(),
});

type BillingItem = z.infer<typeof BillingItemSchema>;

// POST /api/pharmacy/billing
async function POST_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });

    const raw = await req.json().catch(() => null);
    const parsed = BillingSchema.safeParse(raw);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return NextResponse.json({ error: "invalid_request", detail }, { status: 400 });
    }
    const body = parsed.data;
    const items: BillingItem[] = body.items;
    const discountPct = body.discountPct;
    const payMode = body.payMode;
    const customerPhone = body.customerPhone || null;

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

      const qtyStrips = it.qtyStrips;
      const qtyLoose = it.qtyLoose;
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

    if (saleItems.length === 0) {
      return NextResponse.json({ error: "no_sellable_items" }, { status: 400 });
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

    /* One business operation = one transaction: the sale (+items), every
       stock decrement, and the Schedule H register rows commit together or
       not at all. Stock decrements are CONDITIONAL (updateMany with a
       stock-sufficiency guard) so two concurrent sales can never sell the
       same strips and drive stock negative — the loser of the race gets a
       422, not a silent negative balance. The invoice-number unique
       constraint is the serialization point: on a concurrent collision the
       transaction retries with a freshly-read number (3 attempts). */
    const MAX_ATTEMPTS = 3;
    let attempt = 0;
    for (;;) {
      attempt += 1;
      const count = await db.sale.count();
      const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
      try {
        const sale = await db.$transaction(async (tx) => {
          const created = await tx.sale.create({
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

          // conditional stock decrement (FEFO)
          for (const si of saleItems) {
            const dec = await tx.productBatch.updateMany({
              where: {
                id: si.batchId,
                branchId: ctx.branch.id,
                stockStrips: { gte: si.qtyStrips },
                stockLoose: { gte: si.qtyLoose },
              },
              data: {
                stockStrips: { decrement: si.qtyStrips },
                stockLoose: { decrement: si.qtyLoose },
              },
            });
            if (dec.count === 0) {
              throw new InsufficientStockError();
            }
          }

          /* Schedule H / H1 register — the UI collects prescriber and
             patient details for every controlled dispense; persist them
             here so the Drug-Inspector register actually populates. */
          const hReq = new Map<string, Record<string, unknown>>();
          for (const it of items as Array<Record<string, unknown>>) {
            if (it && typeof it === "object" && it.scheduleH && it.productId && it.batchId) {
              hReq.set(`${String(it.productId)}:${String(it.batchId)}`, it.scheduleH as Record<string, unknown>);
            }
          }
          const hSaleItems = created.items.filter(
            (si: (typeof created.items)[number]) =>
              (si.product as { schedule?: string }).schedule === "H" ||
              (si.product as { schedule?: string }).schedule === "H1"
          );
          if (hSaleItems.length > 0) {
            let serial = await tx.scheduleHEntry.count({ where: { branchId: ctx.branch.id } });
            await tx.scheduleHEntry.createMany({
              data: hSaleItems.map((si: (typeof created.items)[number]) => {
                const h = hReq.get(`${si.productId}:${si.batchId}`) ?? {};
                const prod = si.product as { name?: string; schedule?: string };
                serial += 1;
                return {
                  branchId: ctx.branch.id,
                  serialNo: serial,
                  saleId: created.id,
                  saleItemId: si.id,
                  saleDate: new Date(),
                  patientName: String(h.patientName ?? "Walk-in"),
                  patientAddress: (h.patientAddress as string) ?? null,
                  patientPhone: (h.patientPhone as string) ?? null,
                  doctorName: String(h.doctorName ?? "Unknown"),
                  doctorRegNo: String(h.doctorRegNo ?? "—"),
                  prescriptionDate: String(h.prescriptionDate ?? new Date().toISOString().slice(0, 10)),
                  medicineName: prod.name ?? "Unknown medicine",
                  batchNo: (si.batch as { batchNo?: string } | null)?.batchNo ?? null,
                  qtyStrips: si.qtyStrips,
                  qtyLoose: si.qtyLoose,
                  schedule: (prod.schedule ?? "H") as string,
                };
              }),
            });
          }

          return created;
        });
        return NextResponse.json({ ok: true, sale });
      } catch (txErr) {
        if (txErr instanceof InsufficientStockError) {
          return NextResponse.json(
            { error: "insufficient_stock", detail: "One or more items exceed available batch stock." },
            { status: 422 }
          );
        }
        if (
          txErr instanceof Prisma.PrismaClientKnownRequestError &&
          txErr.code === "P2002" &&
          attempt < MAX_ATTEMPTS
        ) {
          continue; // concurrent invoice-number collision — re-read and retry
        }
        throw txErr;
      }
    }
  } catch (err) {
    // Never leak internal error strings (Prisma/connection details) to clients.
    log.error("pharmacy", "billing.sale_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "billing_failed", detail: "The sale could not be completed. Please retry." },
      { status: 500 }
    );
  }
}

/** Internal control-flow marker: stock ran out mid-transaction. */
class InsufficientStockError extends Error {
  constructor() {
    super("insufficient_stock");
    this.name = "InsufficientStockError";
  }
}

// GET /api/pharmacy/billing — recent invoices
async function GET_impl() {
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
    log.error("pharmacy", "billing.list_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "billing_list_failed", detail: "Recent invoices could not be loaded. Please retry." },
      { status: 500 }
    );
  }
}

export const POST = withProductAuth("pharmacy.billing.POST", POST_impl);
export const GET = withProductAuth("pharmacy.billing.GET", GET_impl);
