import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";
import { CLINIC_INVOICE_PAISE, toRupees, toRupeesAll } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — billing summary + recent invoices
async function GET_impl() {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const [bills, paid, unpaid] = await Promise.all([
      db.clinicInvoice.findMany({ where: { clinicId: ctx.clinic.id }, orderBy: { createdAt: "desc" }, take: 30, include: { patient: { select: { id: true, mrn: true, name: true } } } }),
      db.clinicInvoice.aggregate({ where: { status: "paid" }, _sum: { total: true } }),
      db.clinicInvoice.aggregate({ where: { status: "unpaid" }, _sum: { total: true } }),
    ]);
    /* ClinicInvoice money is integer paise — sums are exact; serialize to rupees. */
    return NextResponse.json({
      bills: toRupeesAll(bills, CLINIC_INVOICE_PAISE),
      summary: { collected: (paid._sum.total ?? 0) / 100, outstanding: (unpaid._sum.total ?? 0) / 100, count: bills.length },
    });
  } catch (err) {
    log.error("clinic", "billing_list_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "clinic_billing_failed", detail: "Invoices could not be loaded. Please retry." }, { status: 500 });
  }
}

export const GET = withProductAuth("clinic.billing.GET", GET_impl);
