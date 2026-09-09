// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/pharmacy/e-invoice  { saleId }
// Returns an Indian e-invoice JSON (IRN-ready) + e-way bill structure.
export async function POST(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const saleId = typeof body?.saleId === "string" ? body.saleId : null;
    if (!saleId) return NextResponse.json({ error: "no_saleId" }, { status: 400 });

    const sale = await db.sale.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { product: true, batch: true } },
        branch: { include: { company: true } },
        customer: true,
      },
    });
    if (!sale) return NextResponse.json({ error: "sale_not_found" }, { status: 404 });

    const company = sale.branch.company;

    // ---- Indian e-invoice JSON (NIRVin / GSTN schema subset) ----
    const eInvoice = {
      Version: "1.1",
      TranDtls: {
        TaxSch: "GST",
        SupTyp: "B2B",
        RegRev: "N",
      },
      DocDtls: {
        Typ: "INV",
        No: sale.invoiceNo,
        Dt: sale.createdAt.toISOString().slice(0, 10).replace(/-/g, ""),
      },
      SellerDtls: {
        Gstin: company.gstin || sale.branch.gstin || "",
        LglNm: company.name,
        Addr1: sale.branch.address || "",
        Loc: sale.branch.city || "",
        Pin: sale.branch.pincode || "",
        Stcd: stateCode(sale.branch.state),
        Ph: company.phone || "",
        Em: company.email || "",
      },
      BuyerDtls: {
        Gstin: sale.customer?.gstin || "URP",
        LglNm: sale.customer?.name || "Walk-in Customer",
        Addr1: sale.customer?.address || "Retail Sale",
        Loc: sale.branch.city || "",
        Pin: sale.branch.pincode || "000000",
        Stcd: stateCode(sale.branch.state),
        Pos: stateCode(sale.branch.state),
      },
      ItemList: sale.items.map((it, i) => ({
        SlNo: String(i + 1),
        PrdDesc: it.product.name,
        HsnCd: it.product.hsn || "30049099",
        Qty: it.qtyStrips + it.qtyLoose / (it.product.tabletsPerStrip || 10),
        Unit: "BOX",
        UnitPrice: +it.mrpPerStrip.toFixed(2),
        TotAmt: +((it.qtyStrips * it.mrpPerStrip + it.qtyLoose * (it.mrpPerStrip / (it.product.tabletsPerStrip || 10)))).toFixed(2),
        Discount: +it.discount.toFixed(2),
        AssAmt: +((it.qtyStrips * it.mrpPerStrip) - it.discount).toFixed(2),
        GstRt: it.cgstRate + it.sgstRate,
        IgstAmt: 0,
        CgstAmt: +(((it.qtyStrips * it.mrpPerStrip - it.discount) * it.cgstRate) / 100).toFixed(2),
        SgstAmt: +(((it.qtyStrips * it.mrpPerStrip - it.discount) * it.sgstRate) / 100).toFixed(2),
        TotItemVal: +it.lineTotal.toFixed(2),
        BchDtls: {
         Nm: it.batch.batchNo,
         Exp: it.batch.expDate.replace("-", "") + "00",
        },
      })),
      ValDtls: {
        AssVal: +sale.subtotal.toFixed(2),
        CgstVal: +sale.cgst.toFixed(2),
        SgstVal: +sale.sgst.toFixed(2),
        IgstVal: 0,
        Discount: +sale.discount.toFixed(2),
        OthChrg: 0,
       RndOff: +sale.roundOff.toFixed(2),
        TotInvVal: +sale.total.toFixed(2),
      },
      // IRN placeholder (would be returned by IRP after submission)
      irn: null,
      ackNo: null,
      ackDt: null,
    };

    // ---- E-way bill (if value > ₹50,000) ----
    const ewayBill =
      sale.total > 50000
        ? {
            docType: "INV",
            docNo: sale.invoiceNo,
            docDate: sale.createdAt.toISOString().slice(0, 10).replace(/-/g, ""),
            transactionType: 1, // regular
            fromGstin: company.gstin || "",
            fromTrdName: company.name,
            fromAddr1: sale.branch.address || "",
            fromPlace: sale.branch.city || "",
            fromPincode: sale.branch.pincode || "",
            fromStateCode: stateCode(sale.branch.state),
            actFromStateCode: stateCode(sale.branch.state),
            toGstin: sale.customer?.gstin || "URP",
            toTrdName: sale.customer?.name || "Walk-in",
            toAddr1: sale.customer?.address || "Retail",
            toPlace: sale.branch.city || "",
            toPincode: sale.branch.pincode || "000000",
            toStateCode: stateCode(sale.branch.state),
            actToStateCode: stateCode(sale.branch.state),
            totalValue: +sale.subtotal.toFixed(2),
            cgstValue: +sale.cgst.toFixed(2),
            sgstValue: +sale.sgst.toFixed(2),
            igstValue: 0,
            nonTaxableValue: 0,
            docDate: sale.createdAt.toISOString().slice(0, 10).replace(/-/g, ""),
            vehicleType: "R",
            vehicleNo: "MH02AB1234",
            transMode: "1",
            mainHsnCode: sale.items[0]?.product.hsn || "30049099",
            itemList: sale.items.map((it) => ({
              hsnCode: it.product.hsn || "30049099",
              quantity: it.qtyStrips + it.qtyLoose / (it.product.tabletsPerStrip || 10),
              taxableAmount: +((it.qtyStrips * it.mrpPerStrip) - it.discount).toFixed(2),
              cgstRate: it.cgstRate,
              sgstRate: it.sgstRate,
              igstRate: 0,
            })),
          }
        : null;

    return NextResponse.json({
      ok: true,
      invoiceNo: sale.invoiceNo,
      total: sale.total,
      eInvoice,
      ewayBill,
      eligibleEwayBill: !!ewayBill,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "einvoice_failed", detail: message }, { status: 500 });
  }
}

function stateCode(state?: string | null): string {
  const map: Record<string, string> = {
    Maharashtra: "27",
    Gujarat: "24",
    Karnataka: "29",
    Delhi: "07",
    "Tamil Nadu": "33",
    "Uttar Pradesh": "09",
    Rajasthan: "08",
    "West Bengal": "19",
  };
  return map[state || ""] || "27";
}
