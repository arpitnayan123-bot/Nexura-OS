import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/nx/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — Analytics & performance center. */
export async function GET(req: NextRequest) {
  const gate = await requireModule(req, "analytics");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalId = gate.session.hospitalId || (await db.hospital.findFirst())?.id;
  if (!hospitalId) return NextResponse.json({ error: "no_hospital" }, { status: 404 });

  const [admissions, discharged, orders, bills, appointments, incidents, tasks, beds] = await Promise.all([
    db.hospitalAdmission.findMany({ where: { hospitalId }, include: { patient: true, ward: true } }),
    db.hospitalAdmission.findMany({ where: { hospitalId, dischargeStatus: "discharged" } }),
    db.hospitalOrder.findMany({ where: { hospitalId }, include: { labResults: true } }),
    db.hospitalBill.findMany({ where: { hospitalId } }),
    db.hospitalAppointment.findMany({ where: { hospitalId } }),
    db.nxIncident.findMany({ where: { hospitalId } }),
    db.nxTask.findMany({ where: { hospitalId } }),
    db.hospitalBed.findMany({ where: { hospitalId }, include: { ward: true } }),
  ]);

  // ALOS
  const losList = discharged
    .filter((a) => a.actualDischargeDate)
    .map((a) => (new Date(a.actualDischargeDate!).getTime() - new Date(a.admissionDate).getTime()) / 86400000);
  const alos = losList.length ? losList.reduce((s, v) => s + v, 0) / losList.length : 0;

  // readmission: patients with >1 admission
  const perPatient = admissions.reduce<Record<string, number>>((acc, a) => {
    acc[a.patientId] = (acc[a.patientId] || 0) + 1;
    return acc;
  }, {});
  const readmitted = Object.values(perPatient).filter((n) => n > 1).length;
  const readmissionRate = admissions.length ? (readmitted / new Set(admissions.map((a) => a.patientId)).size) * 100 : 0;

  // order turnaround (completed orders)
  const completedOrders = orders.filter((o) => o.status === "completed");
  const tatByType: Record<string, { n: number; avgH: number }> = {};
  for (const o of completedOrders) {
    const events = await db.nxOrderEvent.findMany({ where: { orderId: o.id }, orderBy: { createdAt: "asc" } });
    const first = events[0]?.createdAt || o.createdAt;
    const last = events[events.length - 1]?.createdAt;
    if (!last) continue;
    const h = (new Date(last).getTime() - new Date(first).getTime()) / 3600000;
    tatByType[o.orderType] = tatByType[o.orderType] || { n: 0, avgH: 0 };
    tatByType[o.orderType].n++;
    tatByType[o.orderType].avgH += h;
  }
  for (const k of Object.keys(tatByType)) {
    tatByType[k].avgH = Math.round((tatByType[k].avgH / tatByType[k].n) * 10) / 10;
  }

  // 7-day revenue trend
  const revenueTrend: Array<{ day: string; revenue: number; collected: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = new Date(day.getTime() + 86400000);
    const dayBills = bills.filter((b) => b.createdAt >= day && b.createdAt < next);
    revenueTrend.push({
      day: day.toISOString().slice(5, 10),
      revenue: dayBills.reduce((s, b) => s + b.totalPayable, 0),
      collected: dayBills.filter((b) => b.paymentStatus === "paid").reduce((s, b) => s + b.totalPayable, 0),
    });
  }

  // 7-day admissions trend
  const admissionTrend: Array<{ day: string; emergency: number; elective: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const next = new Date(day.getTime() + 86400000);
    const dayAdm = admissions.filter((a) => a.admissionDate >= day && a.admissionDate < next);
    admissionTrend.push({
      day: day.toISOString().slice(5, 10),
      emergency: dayAdm.filter((a) => a.admissionType === "emergency").length,
      elective: dayAdm.filter((a) => a.admissionType !== "emergency").length,
    });
  }

  // ward occupancy (dedupe by ward id — each bed embeds its own ward object)
  const wardMap = new Map<string, { id: string; name: string }>();
  for (const b of beds) {
    if (b.ward && !wardMap.has(b.ward.id)) wardMap.set(b.ward.id, { id: b.ward.id, name: b.ward.name });
  }
  const wardOccupancy = Array.from(wardMap.values()).map((w) => {
    const wardBeds = beds.filter((b) => b.wardId === w.id);
    const occ = wardBeds.filter((b) => ["occupied", "discharge_pending"].includes(b.status)).length;
    return { ward: w.name, total: wardBeds.length, occupied: occ, pct: wardBeds.length ? Math.round((occ / wardBeds.length) * 100) : 0 };
  });

  // department doctor load
  const doctors = await db.hospitalDoctor.findMany({ where: { hospitalId }, include: { _count: { select: { appointments: true, admissions: true } } } });
  const doctorLoad = doctors
    .map((d) => ({ name: d.name, speciality: d.specialty, opd: (d as unknown as { _count: { appointments: number } })._count.appointments, ipd: (d as unknown as { _count: { admissions: number } })._count.admissions }))
    .sort((a, b) => b.opd + b.ipd - (a.opd + a.ipd))
    .slice(0, 8);

  // appointment access
  const noShows = appointments.filter((a) => a.status === "no_show").length;
  const completed = appointments.filter((a) => a.status === "completed").length;

  // safety events by category (30d)
  const safetyCats = incidents.reduce<Record<string, number>>((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});

  // task SLA compliance
  const doneTasks = tasks.filter((t) => t.status === "done" && t.dueAt);
  const onTime = doneTasks.filter((t) => t.completedAt && t.completedAt <= t.dueAt!).length;

  const occupiedBeds = beds.filter((b) => ["occupied", "discharge_pending"].includes(b.status)).length;

  return NextResponse.json({
    kpis: {
      alosDays: Math.round(alos * 10) / 10,
      readmissionPct: Math.round(readmissionRate * 10) / 10,
      occupancyPct: beds.length ? Math.round((occupiedBeds / beds.length) * 100) : 0,
      totalAdmissions: admissions.length,
      orderTatHours: tatByType,
      noShowPct: appointments.length ? Math.round((noShows / appointments.length) * 100) : 0,
      appointmentCompletionPct: appointments.length ? Math.round((completed / appointments.length) * 100) : 0,
      slaOnTimePct: doneTasks.length ? Math.round((onTime / doneTasks.length) * 100) : 100,
      openIncidents: incidents.filter((i) => !["resolved", "closed"].includes(i.status)).length,
      criticalResults: orders.flatMap((o) => o.labResults).filter((r) => r.abnormalFlag === "critical").length,
    },
    revenueTrend,
    admissionTrend,
    wardOccupancy,
    doctorLoad,
    safetyByCategory: safetyCats,
  });
}
