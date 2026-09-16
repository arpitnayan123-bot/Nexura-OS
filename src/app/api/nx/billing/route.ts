import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireHospitalContext, withRoute } from "@/lib/nx/api";
import { requireModule } from "@/lib/nx/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — revenue cycle: bills, claims, leakage signals. */
export const GET = withRoute("nx.billing.revenue", async (req: NextRequest) => {
  const gate = await requireModule(req, "billing");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalCtx = await requireHospitalContext(gate.session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;

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

  /* totalPayable is integer paise — exact integer sums, rupees at the wire. */
  const totalBilledPaise = bills.reduce((s, b) => s + b.totalPayable, 0);
  const collectedPaise = bills.filter((b) => b.paymentStatus === "paid").reduce((s, b) => s + b.totalPayable, 0);
  const totalBilled = totalBilledPaise / 100;
  const collected = collectedPaise / 100;
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
      id: b.id, patient: b.patient, uhid: b.patientUhid, amount: b.totalPayable / 100,
      paymentStatus: b.paymentStatus, paymentMode: b.paymentMode,
      createdAt: b.createdAt,
    })),
    claims: claims.map((c) => ({
      id: c.id, patient: c.patient, tpa: c.tpaCompany, policy: c.policyNumber, icd10: c.icd10Primary,
      estimated: c.estimatedCost / 100, approved: c.approvedAmount / 100, status: c.preAuthStatus,
      submittedAt: c.submittedAt, createdAt: c.createdAt,
    })),
  });
});
