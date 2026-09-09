import { db } from "@/lib/db";

/* ============================================================
   NEXURA OS — patient journey orchestration
   Stitches appointments, admissions, orders, results, notes,
   prescriptions and bills into one chronological journey with
   stage metadata (owner, status, delay, dependencies).
   ============================================================ */

export interface JourneyStage {
  key: string;
  stage: string;
  title: string;
  status: "completed" | "active" | "upcoming" | "delayed";
  at: string | null;
  owner: string;
  detail: string;
  relatedId?: string;
  kind: string;
}

const STAGE_ORDER = [
  "appointment",
  "registration",
  "triage",
  "consultation",
  "diagnostics",
  "treatment",
  "admission",
  "surgery",
  "recovery",
  "discharge",
  "followup",
];

export async function buildPatientJourney(hospitalId: string, patientId: string): Promise<JourneyStage[]> {
  const [patient, appointments, admissions, orders, prescriptions, bills] = await Promise.all([
    db.hospitalPatient.findUnique({ where: { id: patientId } }),
    db.hospitalAppointment.findMany({ where: { patientId }, orderBy: { date: "asc" }, include: { doctor: { select: { name: true } } } }),
    db.hospitalAdmission.findMany({ where: { patientId }, orderBy: { admissionDate: "asc" } }),
    db.hospitalOrder.findMany({ where: { patientId }, orderBy: { createdAt: "asc" }, include: { labResults: true } }),
    db.hospitalPrescription.findMany({ where: { patientId }, orderBy: { createdAt: "asc" } }),
    db.hospitalBill.findMany({ where: { patientId }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!patient) return [];

  const stages: JourneyStage[] = [];

  for (const appt of appointments) {
    stages.push({
      key: `appt-${appt.id}`,
      stage: "appointment",
      title: appt.chiefComplaint ? `OPD appointment — ${appt.chiefComplaint}` : "OPD appointment",
      status: appt.status === "completed" ? "completed" : appt.status === "cancelled" || appt.status === "no_show" ? "upcoming" : new Date(appt.date) >= new Date() ? "upcoming" : "completed",
      at: appt.date.toISOString(),
      owner: appt.doctor?.name || "OPD",
      detail: `${appt.appointmentType || "opd"} · token #${appt.tokenNumber} · ${appt.status}`,
      relatedId: appt.id,
      kind: "appointment",
    });
  }

  const labOrders = orders.filter((o) => o.orderType === "lab");
  if (labOrders.length > 0) {
    const latest = labOrders[labOrders.length - 1];
    const allFinal = labOrders.every((o) => o.status === "completed" || o.status === "cancelled");
    stages.push({
      key: `diagnostics-${patient.id}`,
      stage: "diagnostics",
      title: `Diagnostics — ${labOrders.length} order${labOrders.length > 1 ? "s" : ""}`,
      status: allFinal ? "completed" : "active",
      at: latest.createdAt.toISOString(),
      owner: "Laboratory & Imaging",
      detail: labOrders.map((o) => (JSON.parse(o.orderDetails || "{}") as { testName?: string }).testName || o.orderType).slice(0, 4).join(", "),
      kind: "diagnostics",
    });
  }

  for (const adm of admissions) {
    const discharged = Boolean(adm.actualDischargeDate);
    stages.push({
      key: `adm-${adm.id}`,
      stage: "admission",
      title: `${adm.admissionType === "emergency" ? "Emergency" : "Elective"} admission — ${adm.admissionDiagnosis || "inpatient care"}`,
      status: discharged ? "completed" : "active",
      at: adm.admissionDate.toISOString(),
      owner: "Attending team",
      detail: discharged ? `Discharged ${adm.actualDischargeDate?.toISOString().slice(0, 10)} · ${adm.dischargeStatus}` : "Currently admitted",
      relatedId: adm.id,
      kind: "admission",
    });

    const surg = await db.oTSurgery.findFirst({ where: { patientId: patient.id, admissionId: adm.id }, orderBy: { plannedStartTime: "asc" } });
    if (surg) {
      stages.push({
        key: `surg-${surg.id}`,
        stage: "surgery",
        title: `Surgery — ${surg.procedureName}`,
        status: surg.status === "completed" ? "completed" : surg.status === "in_progress" ? "active" : "upcoming",
        at: (surg.actualStartTime || surg.plannedStartTime)?.toISOString() || null,
        owner: "OT team",
        detail: `OT ${surg.otRoomNumber} · ${surg.status}`,
        relatedId: surg.id,
        kind: "surgery",
      });
    }

    if (discharged) {
      stages.push({
        key: `dis-${adm.id}`,
        stage: "discharge",
        title: "Discharge",
        status: "completed",
        at: adm.actualDischargeDate!.toISOString(),
        owner: "Attending team",
        detail: adm.dischargeSummary ? "Summary issued" : "Summary pending",
        relatedId: adm.id,
        kind: "discharge",
      });
    }
  }

  const fuTask = await db.nxTask.findFirst({ where: { patientId: patient.id, type: "followup", status: { not: "cancelled" } }, orderBy: { createdAt: "desc" } });
  if (fuTask) {
    stages.push({
      key: `fu-${fuTask.id}`,
      stage: "followup",
      title: fuTask.title,
      status: fuTask.status === "done" ? "completed" : "active",
      at: fuTask.createdAt.toISOString(),
      owner: fuTask.ownerRole || "Care team",
      detail: fuTask.reason || "Post-discharge coordination",
      relatedId: fuTask.id,
      kind: "followup",
    });
  }

  stages.sort((a, b) => {
    const ia = STAGE_ORDER.indexOf(a.stage);
    const ib = STAGE_ORDER.indexOf(b.stage);
    if (ia !== ib) return ia - ib;
    return new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime();
  });

  return stages;
}
