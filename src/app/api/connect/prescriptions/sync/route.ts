import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { connectGate, doctorOnly } from "@/lib/nx/connect-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RxItem = {
  name: string;
  salt?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  quantity?: number | null;
};

// POST /api/connect/prescriptions/sync
// Body: {callId, items:[{name, salt?, dosage, frequency, duration, quantity}]}
// Creates a PharmaSale + SaleItems for matched products (best-effort match by name/salt).
// Updates ConnectCall.prescriptionSynced=true, pharmacySyncId=saleId.
// Returns {synced, saleId}.
export async function POST(req: NextRequest) {
  const __gate = connectGate(req);
  if (__gate) return __gate;
  const __denied = doctorOnly(req);
  if (__denied) return __denied;
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_pharmacy_branch" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const { callId, items } = body as { callId?: string; items?: RxItem[] };
    if (!callId) return NextResponse.json({ error: "no_call" }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "no_items" }, { status: 400 });
    }

    const call = await db.connectCall.findUnique({
      where: { id: callId },
      include: { connection: true },
    });
    if (!call) return NextResponse.json({ error: "call_not_found" }, { status: 404 });

    // Walk-in customer or matched by patient name
    let customer = await db.customer.findFirst({ where: { name: "Walk-in" } });
    if (call.connection?.patientName) {
      const found = await db.customer.findFirst({ where: { name: call.connection.patientName } });
      if (found) customer = found;
      else if (call.connection.patientPhone) {
        const byPhone = await db.customer.findFirst({ where: { phone: call.connection.patientPhone } });
        if (byPhone) customer = byPhone;
      }
    }

    // Resolve each Rx item to a Product + earliest-expiring batch (FEFO).
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
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    const matched: { name: string; productId: string | null }[] = [];

    for (const item of items) {
      const name = (item.name || "").trim();
      if (!name) continue;
      const qty = Math.max(1, Number(item.quantity) || 1);

      const product = await db.product.findFirst({
        where: {
          OR: [
            { name: { contains: name, mode: "insensitive" as const } },
            { genericName: { contains: name, mode: "insensitive" as const } },
            { brand: { contains: name, mode: "insensitive" as const } },
            { salts: { contains: name, mode: "insensitive" as const } },
          ],
        },
        include: {
          batches: {
            where: { branchId: ctx.branch.id, OR: [{ stockStrips: { gt: 0 } }, { stockLoose: { gt: 0 } }] },
            orderBy: { expDate: "asc" },
          },
        },
      });

      // Try salt fallback if no direct name match
      const finalProduct =
        product ||
        (item.salt
          ? await db.product.findFirst({
              where: { OR: [{ salts: { contains: item.salt, mode: "insensitive" as const } }, { genericName: { contains: item.salt, mode: "insensitive" as const } }] },
              include: {
                batches: {
                  where: { branchId: ctx.branch.id, OR: [{ stockStrips: { gt: 0 } }, { stockLoose: { gt: 0 } }] },
                  orderBy: { expDate: "asc" },
                },
              },
            })
          : null);

      if (!finalProduct || finalProduct.batches.length === 0) {
        matched.push({ name, productId: null });
        continue;
      }
      const batch = finalProduct.batches[0];
      const qtyStrips = qty;
      const qtyLoose = 0;
      const gross = qtyStrips * batch.mrp + qtyLoose * (batch.mrp / finalProduct.tabletsPerStrip);
      const lineCgst = (gross * finalProduct.cgstRate) / 100;
      const lineSgst = (gross * finalProduct.sgstRate) / 100;
      const lineTotal = gross + lineCgst + lineSgst;

      subtotal += gross;
      cgst += lineCgst;
      sgst += lineSgst;
      saleItems.push({
        productId: finalProduct.id,
        batchId: batch.id,
        qtyStrips,
        qtyLoose,
        mrpPerStrip: batch.mrp,
        cgstRate: finalProduct.cgstRate,
        sgstRate: finalProduct.sgstRate,
        lineTotal,
      });
      matched.push({ name, productId: finalProduct.id });
    }

    if (saleItems.length === 0) {
      // No products matched → still mark the call as "synced" with a note so the UI doesn't keep retrying.
      await db.connectCall.update({
        where: { id: callId },
        data: {
          prescriptionSynced: true,
          pharmacySyncId: null,
          prescriptionJson: JSON.stringify({ items, matched, note: "no_matching_products" }),
        },
      });
      return NextResponse.json({ synced: true, saleId: null, matched, note: "no_matching_products" });
    }

    const grand = subtotal + cgst + sgst;
    const rounded = Math.round(grand);
    const roundOff = +(rounded - grand).toFixed(2);

    const count = await db.sale.count();
    const invoiceNo = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const sale = await db.sale.create({
      data: {
        invoiceNo,
        branchId: ctx.branch.id,
        staffId: ctx.staff?.id ?? null,
        customerId: customer?.id ?? null,
        subtotal: +subtotal.toFixed(2),
        discountPct: 0,
        discount: 0,
        cgst: +cgst.toFixed(2),
        sgst: +sgst.toFixed(2),
        roundOff,
        total: rounded,
        payMode: "credit",
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

    // Decrement batch stock (FEFO)
    for (const si of saleItems) {
      await db.productBatch.update({
        where: { id: si.batchId },
        data: {
          stockStrips: { decrement: si.qtyStrips },
          stockLoose: { decrement: si.qtyLoose },
        },
      });
    }

    // Mark call as synced
    await db.connectCall.update({
      where: { id: callId },
      data: {
        prescriptionSynced: true,
        pharmacySyncId: sale.id,
        prescriptionJson: JSON.stringify({ items, matched, saleInvoiceNo: sale.invoiceNo, total: sale.total }),
      },
    });

    return NextResponse.json({
      synced: true,
      saleId: sale.id,
      saleInvoiceNo: sale.invoiceNo,
      total: sale.total,
      matched,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "prescription_sync_failed", detail: message }, { status: 500 });
  }
}
