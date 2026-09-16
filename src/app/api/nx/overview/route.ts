import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireHospitalContext } from "@/lib/nx/api";
import { requireModule } from "@/lib/nx/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — Command Center aggregate: one live picture of the hospital. */
export async function GET(req: NextRequest) {
  const gate = await requireModule(req, "command-center");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const hospitalCtx = await requireHospitalContext(gate.session);
  if ("response" in hospitalCtx) return hospitalCtx.response;
  const hospitalId = hospitalCtx.hospitalId;
  if (!hospitalId) return NextResponse.json({ error: "no_hospital" }, { status: 404 });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [beds, wards, admissions, todayAdmissions, surgeries, incidents, staff, equipment, criticalTasks, cleaningTasks, recentAudit, billsToday] =
    await Promise.all([
      db.hospitalBed.findMany({ where: { hospitalId }, include: { ward: true } }),
      db.hospitalWard.findMany({ where: { hospitalId } }),
      db.hospitalAdmission.findMany({ where: { hospitalId, dischargeStatus: "active" }, include: { patient: true, bed: { include: { ward: true } }, admittingDoctor: true } }),
      db.hospitalAdmission.count({ where: { hospitalId, admissionDate: { gte: startOfDay } } }),
      db.oTSurgery.findMany({ where: { hospitalId, plannedStartTime: { gte: new Date(Date.now() - 12 * 3600000) } }, include: { surgeon: true }, orderBy: { plannedStartTime: "asc" } }),
      db.nxIncident.findMany({ where: { hospitalId, status: { in: ["open", "acknowledged", "investigating"] } }, orderBy: [{ severity: "asc" }, { createdAt: "desc" }], take: 10 }),
      db.nxStaffUser.findMany({ where: { hospitalId } }),
      db.nxEquipment.findMany({ where: { hospitalId, status: { in: ["fault", "maintenance"] } } }),
      db.nxTask.findMany({ where: { hospitalId, priority: "critical", status: { in: ["open", "in_progress", "blocked"] } }, orderBy: { dueAt: "asc" }, take: 8 }),
      db.nxTask.findMany({ where: { hospitalId, type: "cleaning", status: { in: ["open", "in_progress"] } } }),
      db.nxAuditEvent.findMany({ where: { hospitalId }, orderBy: { createdAt: "desc" }, take: 12 }),
      db.hospitalBill.findMany({ where: { hospitalId, createdAt: { gte: startOfDay } } }),
    ]);

  const bedCounts = beds.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});
  const occupied = (bedCounts.occupied || 0) + (bedCounts.discharge_pending || 0);
  const totalBeds = beds.length || 1;

  // delayed discharges: expected discharge date passed, still active
  const now = new Date();
  const delayedDischarges = admissions.filter((a) => a.expectedDischargeDate && new Date(a.expectedDischargeDate) < now);

  const orBoard = {
    planned: surgeries.filter((s) => s.status === "planned").length,
    inProgress: surgeries.filter((s) => s.status === "in_progress").length,
    completed: surgeries.filter((s) => s.status === "completed").length,
    upcoming: surgeries.filter((s) => s.status === "planned").slice(0, 5).map((s) => ({
      id: s.id, room: s.otRoomNumber, procedure: s.procedureName, patientUhid: s.patientUhid,
      start: s.plannedStartTime, surgeon: s.surgeon?.name || "TBD", status: s.status,
    })),
  };

  const edActive = admissions.filter((a) => a.admissionType === "emergency");
  const edWaiting = criticalTasks.filter((t) => t.sourceModule === "ed").length;

  const byRole = staff.reduce<Record<string, number>>((acc, s) => {
    if (s.onDuty) acc[s.role] = (acc[s.role] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    hospital: { id: hospitalId, name: (await db.hospital.findUnique({ where: { id: hospitalId } }))?.name },
    census: {
      admitted: admissions.length,
      admittedToday: todayAdmissions,
      icu: admissions.filter((a) => a.bed?.ward?.name?.toUpperCase().includes("ICU")).length,
      edActive: edActive.length,
      delayedDischarges: delayedDischarges.map((a) => ({
        id: a.id, patient: a.patient.fullName, uhid: a.patientUhid,
        expected: a.expectedDischargeDate, diagnosis: a.admissionDiagnosis, daysOver: Math.floor((now.getTime() - new Date(a.expectedDischargeDate!).getTime()) / 86400000),
      })),
    },
    beds: {
      total: beds.length,
      occupancyPct: Math.round((occupied / totalBeds) * 100),
      counts: {
        occupied: bedCounts.occupied || 0,
        discharge_pending: bedCounts.discharge_pending || 0,
        cleaning_required: bedCounts.cleaning_required || 0,
        cleaning_in_progress: bedCounts.cleaning_in_progress || 0,
        inspection_required: bedCounts.inspection_required || 0,
        ready: bedCounts.ready || 0,
        reserved: bedCounts.reserved || 0,
        available: bedCounts.available || 0,
      },
      cleaningQueue: cleaningTasks.length,
      wards: wards.map((w) => ({
        id: w.id, name: w.name,
        total: beds.filter((b) => b.wardId === w.id).length,
        occupied: beds.filter((b) => b.wardId === w.id && ["occupied", "discharge_pending"].includes(b.status)).length,
      })),
    },
    ed: {
      active: edActive.length,
      waiting: edWaiting,
      pressure: edActive.length >= 6 ? "high" : edActive.length >= 3 ? "moderate" : "normal",
      cases: edActive.slice(0, 8).map((a) => ({
        id: a.id, patient: a.patient.fullName, uhid: a.patientUhid, diagnosis: a.admissionDiagnosis,
        since: a.admissionDate, bed: a.bed?.bedNumber,
      })),
    },
    or: orBoard,
    staffing: { onDuty: Object.values(byRole).reduce((a, b) => a + b, 0), byRole },
    equipmentOutages: equipment.map((e) => ({ id: e.id, name: e.name, status: e.status, location: e.location })),
    criticalAlerts: criticalTasks.map((t) => ({
      id: t.id, title: t.title, dueAt: t.dueAt, ownerRole: t.ownerRole, ownerName: t.ownerName,
      escalationLevel: t.escalationLevel, reason: t.reason,
    })),
    incidents: incidents.map((i) => ({
      id: i.id, severity: i.severity, status: i.status, category: i.category, title: i.title, location: i.location, createdAt: i.createdAt,
    })),
    revenueToday: {
      collected: billsToday.filter((b) => b.paymentStatus === "paid").reduce((s, b) => s + b.totalPayable, 0),
      pending: billsToday.filter((b) => b.paymentStatus !== "paid").reduce((s, b) => s + b.totalPayable, 0),
    },
    activityFeed: recentAudit.map((a) => ({
      id: a.id, actor: a.actorName, role: a.actorRole, action: a.action, detail: a.detail, at: a.createdAt,
    })),
    bottlenecks: [
      ...(delayedDischarges.length > 0 ? [{ area: "Discharge", detail: `${delayedDischarges.length} patient(s) past expected discharge date`, severity: "high" }] : []),
      ...(bedCounts.cleaning_required ? [{ area: "Bed turnaround", detail: `${bedCounts.cleaning_required} bed(s) awaiting cleaning`, severity: "medium" }] : []),
      ...(equipment.length ? [{ area: "Equipment", detail: `${equipment.length} asset(s) in fault/maintenance`, severity: "medium" }] : []),
      ...(orBoard.planned >= 3 ? [{ area: "Operating rooms", detail: `${orBoard.planned} cases scheduled — watch turnover`, severity: "low" }] : []),
    ],
  });
}
