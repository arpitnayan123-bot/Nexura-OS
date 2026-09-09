import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModule } from "@/lib/nx/session";
import { buildPatientJourney } from "@/lib/nx/journey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — Universal Patient Record: profile + timeline + journey + open items. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireModule(req, "patients");
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const { id } = await params;

  const patient = await db.hospitalPatient.findFirst({
    where: { id, OR: [{ id }, { uhid: id }] },
    include: {
      admissions: {
        orderBy: { admissionDate: "desc" },
        include: {
          bed: { include: { ward: true } },
          admittingDoctor: true,
          orders: { orderBy: { createdAt: "desc" }, include: { labResults: true, doctor: { select: { name: true } } } },
          bills: true,
        },
      },
      appointments: { orderBy: { date: "desc" }, include: { doctor: { select: { name: true, specialty: true } } }, take: 10 },
      vitals: { orderBy: { recordedAt: "desc" }, take: 8 },
      clinicalNotes: { orderBy: { createdAt: "desc" }, take: 6 },
      prescriptions: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!patient) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const journey = await buildPatientJourney(patient.hospitalId, patient.id);

  const activeAdmission = patient.admissions.find((a) => a.dischargeStatus === "active") || null;
  const openTasks = await db.nxTask.findMany({
    where: { patientId: patient.id, status: { in: ["open", "in_progress", "blocked"] } },
    orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
    take: 10,
  });
  const pendingResults = patient.admissions
    .flatMap((a) => a.orders)
    .filter((o) => o.status === "ordered" || o.status === "acknowledged" || o.status === "in_progress")
    .map((o) => ({ id: o.id, test: (JSON.parse(o.orderDetails || "{}") as { testName?: string }).testName || o.orderType, type: o.orderType, priority: o.priority, status: o.status, at: o.createdAt }));

  const allergies = (patient.allergy || "").split(",").map((s) => s.trim()).filter(Boolean);
  const chronic = (patient.chronicConditions || "").split(",").map((s) => s.trim()).filter(Boolean);

  // "what changed recently" — events in the last 48h
  const cutoff = new Date(Date.now() - 48 * 3600000);
  const recentOrders = patient.admissions.flatMap((a) => a.orders).filter((o) => o.createdAt >= cutoff);
  const recentVitals = patient.vitals.filter((v) => v.recordedAt >= cutoff);

  return NextResponse.json({
    profile: {
      id: patient.id,
      uhid: patient.uhid,
      name: patient.fullName,
      age: patient.age,
      gender: patient.gender,
      bloodGroup: patient.bloodGroup,
      phone: patient.phone,
      dob: patient.dob,
      address: patient.address,
      city: patient.district,
      state: patient.state,
      language: patient.primaryLanguage,
      abhaId: patient.abhaId,
      insurance: { provider: patient.insuranceProvider, policyNo: patient.insurancePolicyNo, pmjay: patient.pmjayBeneficiary },
      allergies,
      chronic,
      emergencyContact: { name: patient.emergencyContactName, phone: patient.emergencyContactPhone },
    },
    status: {
      isAdmitted: Boolean(activeAdmission),
      location: activeAdmission ? `${activeAdmission.bed?.ward?.name || "Ward"} · ${activeAdmission.bed?.bedNumber || "—"}` : null,
      attendingDoctor: activeAdmission?.admittingDoctor?.name || null,
      admissionDiagnosis: activeAdmission?.admissionDiagnosis || null,
      expectedDischarge: activeAdmission?.expectedDischargeDate || null,
    },
    journey,
    openTasks,
    pendingResults,
    vitals: patient.vitals.map((v) => ({
      id: v.id, at: v.recordedAt, bp: `${v.bpSystolic || "?"}/${v.bpDiastolic || "?"}`, pulse: v.pulseRate,
      temp: v.temperatureC, spo2: v.spo2, rr: v.respiratoryRate, news2: v.news2Score, source: "bedside",
    })),
    orders: patient.admissions.flatMap((a) =>
      a.orders.map((o) => ({
        id: o.id, type: o.orderType, details: (() => { try { return JSON.parse(o.orderDetails); } catch { return {}; } })(),
        priority: o.priority, status: o.status, at: o.createdAt, doctor: o.doctor?.name,
        results: o.labResults.map((r) => ({ id: r.id, test: r.testName, value: r.resultValue, unit: r.unit, ref: `${r.refRangeMin ?? "—"}–${r.refRangeMax ?? "—"}`, flag: r.abnormalFlag, at: r.reportedAt })),
      }))
    ),
    notes: patient.clinicalNotes.map((n) => ({ id: n.id, type: n.noteType, body: n.fullText || n.assessment || n.subjective || "", at: n.createdAt })),
    prescriptions: patient.prescriptions.map((p) => {
      let meds: Array<{ name?: string; dose?: string; frequency?: string; duration?: string }> = [];
      try { meds = JSON.parse(p.items || "[]"); } catch { /* ignore */ }
      return { id: p.id, at: p.createdAt, meds };
    }),
    appointments: patient.appointments.map((a) => ({ id: a.id, at: a.date, doctor: a.doctor?.name, specialty: a.doctor?.specialty, type: a.appointmentType, status: a.status, complaint: a.chiefComplaint })),
    admissions: patient.admissions.map((a) => ({
      id: a.id, at: a.admissionDate, type: a.admissionType, diagnosis: a.admissionDiagnosis, doctor: a.admittingDoctor?.name,
      dischargeStatus: a.dischargeStatus, dischargeDate: a.actualDischargeDate,
      bed: a.bed ? `${a.bed.ward?.name} · ${a.bed.bedNumber}` : null,
    })),
    whatChanged: {
      orders: recentOrders.length,
      vitals: recentVitals.length,
      tasks: openTasks.filter((t) => t.createdAt >= cutoff).length,
    },
  });
}
