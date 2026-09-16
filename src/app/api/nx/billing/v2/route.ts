import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { fail, guard, paginate, pageMeta, toCsv, withIdempotency, withRoute } from "@/lib/nx/api";
import { hasPermission } from "@/lib/nx/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   BILLING v2 — charges, payments, refunds, receipts, CSV export.
   Financial permissions are separate from clinical ones.
   Payments are idempotency-protected (x-idempotency-key).
   ============================================================ */

export const GET = withRoute("billing.v2.list", async (req: NextRequest) => {
  const g = await guard(req, "billing.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const p = paginate(req, { perPage: 25 });
  const kind = req.nextUrl.searchParams.get("kind") ?? "summary";
  const patientId = req.nextUrl.searchParams.get("patientId");

  if (kind === "export") {
    if (!hasPermission(g.perms, "reports.export")) return fail("forbidden", 403, "Export requires reports.export permission.");
    const rows = await db.hospitalBill.findMany({
      where: { hospitalId, ...(patientId ? { patientId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 2000,
      include: { patient: { select: { uhid: true, fullName: true } } },
    });
    const csv = toCsv(rows.map((b) => ({
      bill: b.id, uhid: b.patient.uhid, patient: b.patient.fullName,
      total: b.totalPayable, mode: b.paymentMode, paymentStatus: b.paymentStatus, date: b.billDate.toISOString(),
    })));
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="billing-export-${new Date().toISOString().slice(0, 10)}.csv"` },
    });
  }

  if (kind === "charges") {
    const [charges, total] = await Promise.all([
      db.nxCharge.findMany({ where: { hospitalId, ...(patientId ? { patientId } : {}) }, orderBy: { createdAt: "desc" }, skip: p.skip, take: p.take }),
      db.nxCharge.count({ where: { hospitalId, ...(patientId ? { patientId } : {}) } }),
    ]);
    const patientIds = Array.from(new Set(charges.map((c) => c.patientId)));
    const patients = await db.hospitalPatient.findMany({ where: { id: { in: patientIds } }, select: { id: true, uhid: true, fullName: true } });
    const pmap = new Map(patients.map((pt) => [pt.id, pt]));
    return NextResponse.json({
      data: {
        charges: charges.map((c) => ({ ...c, patient: pmap.get(c.patientId) ?? null })),
        meta: pageMeta(p, total),
      },
    });
  }

  if (kind === "payments") {
    const [payments, total] = await Promise.all([
      db.nxPayment.findMany({ where: { hospitalId, ...(patientId ? { patientId } : {}) }, orderBy: { receivedAt: "desc" }, skip: p.skip, take: p.take }),
      db.nxPayment.count({ where: { hospitalId, ...(patientId ? { patientId } : {}) } }),
    ]);
    const patientIds = Array.from(new Set(payments.map((c) => c.patientId)));
    const patients = await db.hospitalPatient.findMany({ where: { id: { in: patientIds } }, select: { id: true, uhid: true, fullName: true } });
    const pmap = new Map(patients.map((pt) => [pt.id, pt]));
    return NextResponse.json({
      data: {
        payments: payments.map((c) => ({ ...c, patient: pmap.get(c.patientId) ?? null })),
        meta: pageMeta(p, total),
      },
    });
  }

  const [billsAgg, pendingCharges, paymentsAgg, claims] = await Promise.all([
    db.hospitalBill.aggregate({ where: { hospitalId }, _sum: { totalPayable: true }, _count: true }),
    db.nxCharge.aggregate({ where: { hospitalId, status: "pending" }, _sum: { unitPrice: true }, _count: true }),
    db.nxPayment.aggregate({ where: { hospitalId, refundOfId: null }, _sum: { amount: true }, _count: true }),
    db.insuranceClaim.groupBy({ by: ["preAuthStatus"], where: { hospitalId }, _count: true }),
  ]);
  const billed = billsAgg._sum.totalPayable ?? 0;
  const collected = paymentsAgg._sum.amount ?? 0;
  return NextResponse.json({
    data: {
      summary: {
        billed,
        collected,
        outstanding: Math.max(0, billed - collected),
        bills: billsAgg._count,
        pendingCharges: pendingCharges._count,
        pendingAmount: (pendingCharges._sum.unitPrice ?? 0),
        payments: paymentsAgg._count,
        claimsByStatus: claims.reduce<Record<string, number>>((acc, c) => { acc[c.preAuthStatus] = c._count; return acc; }, {}),
      },
    },
  });
});

const ChargeSchema = z.object({
  patientId: z.string().min(3),
  description: z.string().min(2).max(300),
  quantity: z.number().int().min(1).max(1000).default(1),
  unitPrice: z.number().int().min(0).max(100_000_000), // paise
  category: z.enum(["room", "procedure", "pharmacy", "lab", "consultation", "consumable", "general"]).default("general"),
  code: z.string().max(40).optional(),
  encounterId: z.string().optional(),
});

export const POST = withRoute("billing.charge.create", async (req: NextRequest) => {
  const g = await guard(req, "billing.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = ChargeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);

  const patient = await db.hospitalPatient.findFirst({ where: { id: parsed.data.patientId, hospitalId }, select: { id: true, uhid: true } });
  if (!patient) return fail("not_found", 404, "Patient not found.");

  const charge = await db.nxCharge.create({
    data: {
      hospitalId, patientId: patient.id, patientUhid: patient.uhid,
      description: parsed.data.description, quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice, category: parsed.data.category,
      code: parsed.data.code, encounterId: parsed.data.encounterId,
      createdBy: g.session.name,
    },
  });
  await audit({ hospitalId, actorName: g.session.name, actorRole: g.session.role, action: "billing.charge.create", entityType: "nx_charge", entityId: charge.id, patientId: patient.id, detail: { amount: parsed.data.unitPrice * parsed.data.quantity, category: parsed.data.category } });
  return NextResponse.json({ data: { charge } }, { status: 201 });
});

const PaymentSchema = z.object({
  patientId: z.string().min(3),
  amount: z.number().int().min(1).max(100_000_000),
  mode: z.enum(["cash", "card", "upi", "netbanking", "insurance", "cheque"]).default("upi"),
  reference: z.string().max(80).optional(),
  billId: z.string().optional(),
  note: z.string().max(300).optional(),
  refundOfId: z.string().optional(),
});

export const PUT = withRoute("billing.payment.record", async (req: NextRequest) => {
  const g = await guard(req, "billing.manage");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital", 400);
  const parsed = PaymentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", 400, parsed.error.issues[0]?.message);

  const patient = await db.hospitalPatient.findFirst({ where: { id: parsed.data.patientId, hospitalId }, select: { id: true, uhid: true } });
  if (!patient) return fail("not_found", 404, "Patient not found.");
  if (parsed.data.refundOfId) {
    const original = await db.nxPayment.findFirst({ where: { id: parsed.data.refundOfId, hospitalId } });
    if (!original) return fail("not_found", 404, "Original payment not found for refund.");
    if (parsed.data.amount > original.amount) return fail("invalid_request", 422, "Refund cannot exceed the original payment.");
  }

  return withIdempotency(req, "billing.payment", async () => {
    /* Payment + bill-status recompute commit atomically: concurrent payments
       on one bill could otherwise leave a paid bill marked partial. The
       refund-cap check happens before this block; the recompute itself now
       cannot race with another payment's recompute. */
    const payment = await db.$transaction(async (tx) => {
      const created = await tx.nxPayment.create({
        data: {
          hospitalId, patientId: patient.id, patientUhid: patient.uhid,
          amount: parsed.data.amount, mode: parsed.data.mode, reference: parsed.data.reference,
          billId: parsed.data.billId, note: parsed.data.note, refundOfId: parsed.data.refundOfId,
          receivedBy: g.session.name,
        },
      });
      if (parsed.data.billId) {
        const bill = await tx.hospitalBill.findFirst({ where: { id: parsed.data.billId, hospitalId } });
        if (bill) {
          const payments = await tx.nxPayment.aggregate({ where: { billId: bill.id, refundOfId: null }, _sum: { amount: true } });
          const paid = payments._sum.amount ?? 0;
          await tx.hospitalBill.update({ where: { id: bill.id }, data: { paymentStatus: paid >= bill.totalPayable ? "paid" : paid > 0 ? "partial" : bill.paymentStatus } });
        }
      }
      return created;
    });
    await audit({ hospitalId, actorName: g.session.name, actorRole: g.session.role, action: parsed.data.refundOfId ? "billing.refund" : "billing.payment", entityType: "nx_payment", entityId: payment.id, patientId: patient.id, detail: { amount: parsed.data.amount, mode: parsed.data.mode } });
    return { status: 201, body: { data: { payment, receipt: { id: payment.id, amount: payment.amount, at: payment.receivedAt, receivedBy: payment.receivedBy, hospitalId } } } };
  }, { bodyForHash: parsed.data, callerId: g.session.userId });
});
void paginate; void pageMeta;
