import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/nx/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — role workspace: everything the signed-in role needs on one surface. */
export async function GET(req: NextRequest) {
  const asDoctor = requireModule(req, "doctor");
  const asNurse = requireModule(req, "nurse");
  const gate = "session" in asDoctor ? asDoctor : asNurse;
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const session = gate.session;
  const hospitalId = session.hospitalId || (await db.hospital.findFirst())?.id;

  const ownerFilter: { ownerRole: string } | { ownerRole: { in: string[] } } =
    session.role === "nurse" ? { ownerRole: "nurse" } : { ownerRole: { in: ["doctor", "reception", "facilities", "admin"] } };
  const [myTasks, activeAdmissions, pendingOrders] = await Promise.all([
    db.nxTask.findMany({
      where: {
        hospitalId: hospitalId!,
        status: { in: ["open", "in_progress", "blocked"] },
        ...ownerFilter,
      },
      orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
      take: 15,
    }),
    db.hospitalAdmission.findMany({
      where: { hospitalId, dischargeStatus: "active" },
      include: {
        patient: { select: { id: true, fullName: true, uhid: true, age: true, gender: true, bloodGroup: true, allergy: true, chronicConditions: true } },
        bed: { include: { ward: true } },
        admittingDoctor: { select: { name: true } },
        orders: { where: { status: { in: ["ordered", "acknowledged", "in_progress"] } }, include: { labResults: true }, take: 5 },
        vitals: { orderBy: { recordedAt: "desc" }, take: 1 },
      },
      orderBy: { admissionDate: "desc" },
      take: 12,
    }),
    db.hospitalOrder.findMany({
      where: { hospitalId, status: { in: ["ordered", "acknowledged"] }, orderType: { in: ["lab", "imaging"] } },
      include: { patient: { select: { fullName: true, uhid: true } } },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 10,
    }),
  ]);

  const isNurse = session.role === "nurse";
  const myAdmissions = isNurse
    ? activeAdmissions.filter((a) => a.bed?.ward?.name)
    : activeAdmissions;

  // NEWS2-lite risk flags for nurse prioritization
  const riskSorted = [...myAdmissions].map((a) => {
    const v = a.vitals[0];
    let risk = 0;
    if (v) {
      if (v.spo2 != null && v.spo2 < 92) risk += 3;
      if (v.pulseRate != null && (v.pulseRate > 120 || v.pulseRate < 50)) risk += 3;
      if (v.temperatureC != null && (v.temperatureC >= 38.5 || v.temperatureC < 35.5)) risk += 2;
      if (v.bpSystolic != null && v.bpSystolic < 95) risk += 2;
      if (v.respiratoryRate != null && v.respiratoryRate > 24) risk += 2;
    }
    return { admissionId: a.id, risk };
  });
  const riskMap = new Map(riskSorted.map((r) => [r.admissionId, r.risk]));

  return NextResponse.json({
    workspace: isNurse ? "nurse" : "doctor",
    clinician: { name: session.name, role: session.role },
    tasks: myTasks,
    patients: myAdmissions
      .sort((a, b) => (riskMap.get(b.id) || 0) - (riskMap.get(a.id) || 0))
      .map((a) => ({
        admissionId: a.id,
        patient: a.patient,
        diagnosis: a.admissionDiagnosis,
        doctor: a.admittingDoctor?.name,
        location: a.bed ? `${a.bed.ward?.name} · ${a.bed.bedNumber}` : null,
        admittedAt: a.admissionDate,
        riskScore: riskMap.get(a.id) || 0,
        pendingOrders: a.orders.map((o) => ({ id: o.id, type: o.orderType, test: (() => { try { return (JSON.parse(o.orderDetails) as { testName?: string }).testName; } catch { return o.orderType; } })(), priority: o.priority, criticalResults: o.labResults.filter((r) => r.abnormalFlag !== "normal").length })),
        latestVitals: a.vitals[0] ? { bp: `${a.vitals[0].bpSystolic}/${a.vitals[0].bpDiastolic}`, pulse: a.vitals[0].pulseRate, spo2: a.vitals[0].spo2, temp: a.vitals[0].temperatureC, at: a.vitals[0].recordedAt } : null,
      })),
    pendingOrders,
    summary: {
      myTasks: myTasks.length,
      criticalTasks: myTasks.filter((t) => t.priority === "critical").length,
      patients: myAdmissions.length,
      criticalResults: myAdmissions.flatMap((a) => a.orders.flatMap((o) => o.labResults)).filter((r) => r.abnormalFlag === "critical").length,
    },
  });
}
