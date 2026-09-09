import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/nx/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — revenue cycle: bills, claims, leakage signals. */
export async function GET(req: NextRequest) {
  const gate = requireModule(req, "billing");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;

  const [bills, claims] = await Promise.all([
    db.hospitalBill.findMany({
      where: { hospitalId },
      orderBy: { createdAt: "desc" },
      take: 60,
      include: { patient: { select: { fullName: true, uhid: true } }, admission: { select: { id: true } } },
    }),
    db.insuranceClaim.findMany({
      where: { hospitalId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { patient: { select: { fullName: true, uhid: true } } },
    }),
  ]);

  const totalBilled = bills.reduce((s, b) => s + b.totalPayable, 0);
  const collected = bills.filter((b) => b.paymentStatus === "paid").reduce((s, b) => s + b.totalPayable, 0);
  const pending = totalBilled - collected;

  return NextResponse.json({
    stats: {
      totalBilled,
      collected,
      pending,
      collectionPct: totalBilled ? Math.round((collected / totalBilled) * 100) : 0,
      claimsSubmitted: claims.length,
      claimsApproved: claims.filter((c) => c.preAuthStatus === "approved" || c.preAuthStatus === "partially_approved").length,
      claimsQuery: claims.filter((c) => c.preAuthStatus === "query_raised").length,
      claimsRejected: claims.filter((c) => c.preAuthStatus === "rejected").length,
    },
    bills: bills.map((b) => ({
      id: b.id, patient: b.patient, uhid: b.patientUhid, amount: b.totalPayable,
      paymentStatus: b.paymentStatus, paymentMode: b.paymentMode,
      createdAt: b.createdAt,
    })),
    claims: claims.map((c) => ({
      id: c.id, patient: c.patient, tpa: c.tpaCompany, policy: c.policyNumber, icd10: c.icd10Primary,
      estimated: c.estimatedCost, approved: c.approvedAmount, status: c.preAuthStatus,
      submittedAt: c.submittedAt, createdAt: c.createdAt,
    })),
  });
}
