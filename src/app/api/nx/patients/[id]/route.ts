import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { requirePermission, hasPermission } from "@/lib/nx/session";
import { buildPatientJourney } from "@/lib/nx/journey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — Universal Patient Record v2.
 * Permission-aware: demographics vs clinical vs billing vs restricted.
 * Patient-role accounts are hard-scoped to their own linked record.
 * Every view is audited (access history powers the "who saw my record" trail).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requirePermission(req, "patient.demographics.view", { patientId: (await params).id });
  if ("error" in gate) return NextResponse.json({ error: gate.error, detail: gate.detail }, { status: gate.status });
  const { id } = await params;
  const { session, perms } = gate;

  // Patient-role scoping: can only ever load their own linked record
  if (session.role === "patient") {
    const self = await db.nxStaffUser.findUnique({ where: { id: session.userId }, select: { linkedPatientId: true } });
    if (!self?.linkedPatientId || self.linkedPatientId !== id) {
      return NextResponse.json({ error: "forbidden", detail: "patient_scoped_only" }, { status: 403 });
    }
  }

  const canClinical = hasPermission(perms, "patient.clinical.view") || session.breakGlass;
  const canBilling = hasPermission(perms, "billing.view");
  const canRestricted = hasPermission(perms, "patient.restricted.view") || session.breakGlass;

  if (!session.hospitalId && session.role !== "patient") {
    return NextResponse.json({ error: "no_hospital" }, { status: 400 });
  }

  // Tenant-scoped + id-or-UHID lookup (the UHID branch was previously dead code
  // because `id` in the OR made it unreachable).
  const patient = await db.hospitalPatient.findFirst({
    where: {
      OR: [{ id }, { uhid: id }],
      ...(session.hospitalId ? { hospitalId: session.hospitalId } : {}),
    },
    include: {
      admissions: {
        orderBy: { admissionDate: "desc" },
        include: {
          bed: { include: { ward: true } },
          admittingDoctor: true,
          orders: { orderBy: { createdAt: "desc" }, take: 20, include: { labResults: true, imagingReports: true, doctor: { select: { name: true } } } },
        },
      },
      appointments: { orderBy: { date: "desc" }, include: { doctor: { select: { name: true, specialty: true } } }, take: 10 },
      vitals: { orderBy: { recordedAt: "desc" }, take: 8 },
      clinicalNotes: { orderBy: { createdAt: "desc" }, take: 12 },
      prescriptions: { orderBy: { createdAt: "desc" }, take: 10 },
      ...(canClinical ? {
        consents: { orderBy: { grantedAt: "desc" } },
        medicationAdministrations: { orderBy: { scheduledAt: "desc" }, take: 30 },
      } : {}),
      ...(canBilling ? { bills: true } : {}),
    },
  });
  if (!patient) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Access audit — every read of a patient record leaves a trace
  if (session.hospitalId) {
    await audit({
      hospitalId: session.hospitalId,
      actorName: session.staffCode ?? session.name,
      actorRole: session.role,
      action: session.breakGlass ? "patient.view.breakglass" : "patient.view",
      entityType: "patient",
      entityId: patient.id,
      patientId: patient.id,
      detail: { clinical: canClinical, billing: canBilling },
    });
  }

  const journey = await buildPatientJourney(patient.hospitalId, patient.id);

  const activeAdmission = patient.admissions.find((a) => a.dischargeStatus === "active") || null;
  const openTasks = await db.nxTask.findMany({
    where: { patientId: patient.id, status: { in: ["new", "open", "assigned", "in_progress", "blocked", "waiting", "escalated"] } },
    orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
    take: 10,
  });

  // Access history: who opened this record (audit chain), most recent first
  const accessHistory = session.hospitalId
    ? await db.nxAuditEvent.findMany({
        where: { hospitalId: session.hospitalId, patientId: patient.id, action: { in: ["patient.view", "patient.view.breakglass", "note.sign", "breakglass.invoke"] } },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { actorName: true, actorRole: true, action: true, createdAt: true },
      })
    : [];

  const allergies = (patient.allergy || "").split(",").map((s) => s.trim()).filter(Boolean);
  const chronic = (patient.chronicConditions || "").split(",").map((s) => s.trim()).filter(Boolean);

  /* ---- Merged chronological timeline ---- */
  type TEvent = { at: string; kind: string; icon: string; title: string; sub?: string; state?: "critical" | "pending" | "verified" | "draft" | "signed" | "restricted" };
  const timeline: TEvent[] = [];
  for (const a of patient.admissions) {
    timeline.push({ at: a.admissionDate.toISOString(), kind: "admission", icon: "hospital", title: a.dischargeStatus === "active" ? "Admitted" : "Admission", sub: `${a.admissionType}${a.admissionDiagnosis ? ` · ${a.admissionDiagnosis}` : ""}`, state: a.dischargeStatus === "active" ? "pending" : "verified" });
    if (a.actualDischargeDate) timeline.push({ at: a.actualDischargeDate.toISOString(), kind: "discharge", icon: "logout", title: "Discharged", sub: a.dischargeStatus ?? undefined, state: "verified" });
  }
  for (const ap of patient.appointments) {
    timeline.push({ at: ap.date.toISOString(), kind: "appointment", icon: "calendar", title: "Appointment", sub: `${ap.doctor?.name ?? ""}${ap.chiefComplaint ? ` · ${ap.chiefComplaint}` : ""}`, state: ap.status === "completed" ? "verified" : ap.status === "no_show" ? "critical" : "pending" });
  }
  if (canClinical) {
    for (const v of patient.vitals) {
      const crit = (v.news2Score ?? 0) >= 7;
      timeline.push({ at: v.recordedAt.toISOString(), kind: "vitals", icon: "heart", title: `Vitals ${v.bpSystolic ?? "?"}/${v.bpDiastolic ?? "?"} · ${v.pulseRate ?? "?"}bpm · SpO₂ ${v.spo2 ?? "?"}%`, sub: v.news2Score != null ? `NEWS2 ${v.news2Score}` : undefined, state: crit ? "critical" : "verified" });
    }
    for (const n of patient.clinicalNotes) {
      timeline.push({ at: n.createdAt.toISOString(), kind: "note", icon: "file", title: `${n.noteType.toUpperCase()} note`, sub: n.signedByName ? `signed by ${n.signedByName}` : "draft", state: n.locked ? "signed" : n.restricted && !canRestricted ? "restricted" : "draft" });
    }
    for (const o of patient.admissions.flatMap((a) => a.orders)) {
      for (const r of o.labResults) {
        timeline.push({ at: (r.reportedAt ?? r.createdAt).toISOString(), kind: "lab", icon: "flask", title: `${r.testName}: ${r.resultValue ?? r.resultText ?? "—"}`, sub: `${r.verificationStatus}${r.abnormalFlag !== "normal" ? ` · ${r.abnormalFlag}` : ""}`, state: r.abnormalFlag === "critical" ? "critical" : r.verificationStatus === "verified" ? "verified" : "pending" });
      }
      for (const img of o.imagingReports) {
        timeline.push({ at: img.createdAt.toISOString(), kind: "imaging", icon: "scan", title: `${img.modality.toUpperCase()} report`, sub: `${img.status}${img.radiologistName ? ` · ${img.radiologistName}` : ""}`, state: img.status === "final" ? "signed" : "pending" });
      }
    }
    for (const m of ((patient as unknown as { medicationAdministrations?: Array<{ scheduledAt: Date; medicineName: string; status: string; administeredBy?: string | null }> }).medicationAdministrations) ?? []) {
      timeline.push({ at: m.scheduledAt.toISOString(), kind: "mar", icon: "pill", title: `${m.medicineName} — ${m.status}`, sub: m.administeredBy ?? undefined, state: m.status === "given" ? "verified" : m.status === "pending" ? "pending" : "critical" });
    }
    for (const c of ((patient as unknown as { consents?: Array<{ grantedAt: Date; type: string; status: string; recordedBy: string }> }).consents ?? [])) {
      timeline.push({ at: c.grantedAt.toISOString(), kind: "consent", icon: "shield", title: `Consent ${c.type} — ${c.status}`, sub: `by ${c.recordedBy}`, state: c.status === "granted" ? "verified" : "restricted" });
    }
  }
  timeline.sort((a, b) => (a.at < b.at ? 1 : -1));

  const billingSummary = canBilling
    ? await (async () => {
        const [bills, payments, charges] = await Promise.all([
          db.hospitalBill.aggregate({ where: { patientId: patient.id }, _sum: { totalPayable: true }, _count: true }),
          db.nxPayment.aggregate({ where: { patientId: patient.id, refundOfId: null }, _sum: { amount: true }, _count: true }),
          db.nxCharge.aggregate({ where: { patientId: patient.id, status: "pending" }, _sum: { unitPrice: true }, _count: true }),
        ]);
        return {
          bills: bills._count,
          billed: bills._sum.totalPayable ?? 0,
          paid: payments._sum.amount ?? 0,
          pendingCharges: charges._count,
          pendingAmount: charges._sum.unitPrice ?? 0,
        };
      })()
    : null;

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
      phone: canClinical || session.role !== "patient" ? patient.phone : maskPhone(patient.phone),
      dob: patient.dob,
      address: canClinical ? patient.address : null,
      city: patient.district,
      state: patient.state,
      language: patient.primaryLanguage,
      abhaId: patient.abhaId,
      insurance: { provider: patient.insuranceProvider, policyNo: patient.insurancePolicyNo, pmjay: patient.pmjayBeneficiary },
      allergies,
      chronic,
      emergencyContact: { name: patient.emergencyContactName, phone: patient.emergencyContactPhone },
    },
    viewer: { canClinical, canBilling, canRestricted, breakGlass: session.breakGlass },
    status: {
      isAdmitted: Boolean(activeAdmission),
      location: activeAdmission ? `${activeAdmission.bed?.ward?.name || "Ward"} · ${activeAdmission.bed?.bedNumber || "—"}` : null,
      attendingDoctor: activeAdmission?.admittingDoctor?.name || null,
      admissionDiagnosis: activeAdmission?.admissionDiagnosis || null,
      expectedDischarge: activeAdmission?.expectedDischargeDate || null,
    },
    journey,
    timeline: timeline.slice(0, 120),
    consents: canClinical ? ((patient as unknown as { consents?: unknown[] }).consents ?? []) : [],
    mar: canClinical ? (((patient as unknown as { medicationAdministrations?: Array<{ id: string; medicineName: string; dose: string | null; route: string | null; scheduledAt: Date; administeredAt: Date | null; administeredBy: string | null; status: string; controlled: boolean }> }).medicationAdministrations) ?? []).map((m) => ({ id: m.id, medicineName: m.medicineName, dose: m.dose, route: m.route, scheduledAt: m.scheduledAt, administeredAt: m.administeredAt, administeredBy: m.administeredBy, status: m.status, controlled: m.controlled })) : [],
    accessHistory,
    billing: billingSummary,
    openTasks,
    vitals: patient.vitals.map((v) => ({
      id: v.id, at: v.recordedAt, bp: `${v.bpSystolic || "?"}/${v.bpDiastolic || "?"}`, pulse: v.pulseRate,
      temp: v.temperatureC, spo2: v.spo2, rr: v.respiratoryRate, news2: v.news2Score, source: "bedside",
    })),
    orders: canClinical
      ? patient.admissions.flatMap((a) =>
          a.orders.map((o) => ({
            id: o.id, type: o.orderType, details: (() => { try { return JSON.parse(o.orderDetails); } catch { return {}; } })(),
            priority: o.priority, status: o.status, at: o.createdAt, doctor: o.doctor?.name,
            results: o.labResults.map((r) => ({ id: r.id, test: r.testName, value: r.resultValue, unit: r.unit, ref: `${r.refRangeMin ?? "—"}–${r.refRangeMax ?? "—"}`, flag: r.abnormalFlag, verification: r.verificationStatus, verifiedAt: r.verifiedAt, at: r.reportedAt })),
            imaging: o.imagingReports.map((i) => ({ id: i.id, modality: i.modality, status: i.status, findings: i.findings, impression: i.impression, radiologist: i.radiologistName, at: i.createdAt })),
          }))
        )
      : [],
    notes: canClinical
      ? patient.clinicalNotes.map((n) => ({
          id: n.id, type: n.noteType, status: n.status, locked: n.locked,
          signedAt: n.signedAt, signedBy: n.signedByName, signedByRole: n.signedByRole,
          version: n.currentVersion, restricted: n.restricted,
          body: canRestricted || !n.restricted ? n.fullText || n.assessment || n.subjective || "" : null,
          bodyRestricted: !canRestricted && n.restricted,
          at: n.createdAt,
        }))
      : [],
    prescriptions: canClinical
      ? patient.prescriptions.map((p) => {
          let meds: Array<{ name?: string; dose?: string; frequency?: string; duration?: string }> = [];
          try { meds = JSON.parse(p.items || "[]"); } catch { /* ignore */ }
          return { id: p.id, at: p.createdAt, meds };
        })
      : [],
    appointments: patient.appointments.map((a) => ({ id: a.id, at: a.date, doctor: a.doctor?.name, specialty: a.doctor?.specialty, type: a.appointmentType, status: a.status, complaint: a.chiefComplaint, checkedInAt: a.checkedInAt })),
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

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `••••••${digits.slice(-4)}`;
}
