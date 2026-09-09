import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClinicContext } from "@/lib/clinic-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — billing summary + recent invoices
export async function GET() {
  try {
    const ctx = await getClinicContext();
    if (!ctx) return NextResponse.json({ error: "no_clinic" }, { status: 404 });
    const [bills, paid, unpaid] = await Promise.all([
      db.clinicInvoice.findMany({ where: { clinicId: ctx.clinic.id }, orderBy: { createdAt: "desc" }, take: 30, include: { patient: { select: { id: true, mrn: true, name: true } } } }),
      db.clinicInvoice.aggregate({ where: { status: "paid" }, _sum: { total: true } }),
      db.clinicInvoice.aggregate({ where: { status: "unpaid" }, _sum: { total: true } }),
    ]);
    return NextResponse.json({ bills, summary: { collected: paid._sum.total ?? 0, outstanding: unpaid._sum.total ?? 0, count: bills.length } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "clinic_billing_failed", detail: message }, { status: 500 });
  }
}
