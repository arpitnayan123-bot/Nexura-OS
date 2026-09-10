/* ============================================================
 * PIE — Engine Orchestrator
 * runPatientCycle: ingest → twin update → stratify → protocol
 * decision → (on approval elsewhere) coordination.
 * runRadar: cohort sweep sorted by Time-to-Decay.
 * The engine persists twins/assessments/protocols through db.ts.
 * ============================================================ */

import { db } from "@/lib/db";
import type { PreEmptiveProtocolSpec, RiskAssessment, TwinStateVector } from "./types";
import { computeBaseline } from "./twin/digital-twin";
import { stratify } from "./twin/risk";
import { decideProtocol } from "./protocols/generator";
import { buildTwinState, prismaCoordinationSink } from "./db";
import { executeCoordination } from "./protocols/coordination";

export interface PatientCycleResult {
  patientId: string;
  twin: TwinStateVector;
  composite: RiskAssessment;
  domains: RiskAssessment[];
  protocolDecision: ReturnType<typeof decideProtocol>;
  protocolId?: string;
}

/** Full intelligence cycle for one patient. */
export async function runPatientCycle(patientId: string, hospitalId?: string | null): Promise<PatientCycleResult | null> {
  const twin = await buildTwinState(patientId);
  if (!twin) return null;
  const baseline = computeBaseline(twin);

  // persist twin snapshot (state vector + baseline + physics)
  await db.pieTwinState.upsert({
    where: { patientId },
    create: { patientId, stateJson: JSON.stringify(twin), baselineJson: JSON.stringify(baseline) },
    update: { stateJson: JSON.stringify(twin), baselineJson: JSON.stringify(baseline), updatedAt: new Date() },
  });

  const { composite, byDomain } = stratify(twin);
  const domains = Object.values(byDomain).filter((a) => a.domain !== "composite");

  // persist all assessments (history = trend sparklines + audit trail)
  const created = await db.pieRiskAssessment.create({
    data: {
      patientId,
      hospitalId: hospitalId ?? null,
      domain: composite.domain,
      score: composite.score,
      band: composite.band,
      confidence: composite.confidence,
      horizonHours: composite.horizonHours,
      driversJson: JSON.stringify(composite.drivers),
      modelVersion: composite.modelVersion,
      uncertain: composite.uncertain,
    },
  });

  // protocol decision on the composite
  const openProtocol = await db.pieProtocol.findFirst({
    where: { patientId, status: { in: ["pending_approval", "approved"] } },
  });
  const decision = decideProtocol(composite, Boolean(openProtocol));

  let protocolId: string | undefined;
  if (decision.action === "generate" && decision.protocol) {
    const spec = decision.protocol;
    const row = await db.pieProtocol.create({
      data: {
        patientId,
        assessmentId: created.id,
        code: spec.code,
        title: spec.title,
        alert: spec.alert,
        primaryDriver: composite.drivers[0]?.detail ?? spec.primaryDriver,
        immediateJson: JSON.stringify(spec.immediate),
        monitoringJson: JSON.stringify(spec.monitoring),
        dispo: spec.dispo,
        evidence: spec.evidence,
        confidence: composite.confidence,
        status: "pending_approval",
      },
    });
    protocolId = row.id;
  } else if (decision.action === "uncertain_manual_review" && composite.band === "red") {
    // record the flagged-uncertain protocol skeleton for review queues
    const row = await db.pieProtocol.create({
      data: {
        patientId,
        assessmentId: created.id,
        code: "manual_review",
        title: "Uncertain — Manual Review Required",
        alert: `Red-zone risk with confidence ${(composite.confidence * 100).toFixed(0)}%`,
        primaryDriver: composite.drivers[0]?.detail ?? "Insufficient data completeness",
        immediateJson: "[]",
        monitoringJson: "[]",
        dispo: null,
        evidence: "PIE confidence gate: below 80% — no automated actions.",
        confidence: composite.confidence,
        status: "pending_approval",
        createdBy: "PIE-failsafe",
      },
    });
    protocolId = row.id;
  }

  return { patientId, twin, composite, domains, protocolDecision: decision, protocolId };
}

export interface RadarRow {
  patientId: string;
  patientName: string;
  uhid: string;
  ward?: string | null;
  score: number;
  band: string;
  confidence: number;
  uncertain: boolean;
  domain: string;
  topDriver?: string;
  openProtocolId?: string;
}

/**
 * Crisis Radar: sweep the hospital's active patients (recent vitals
 * or admissions), score by last known assessment (or compute fresh
 * for unscored patients), sort by Time-to-Decay descending.
 */
export async function runRadar(hospitalId: string, limit = 50): Promise<RadarRow[]> {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const patients = await db.hospitalPatient.findMany({
    where: {
      hospitalId,
      OR: [{ vitals: { some: { recordedAt: { gte: since } } } }, { admissions: { some: {} } }],
    },
    include: { vitals: { orderBy: { recordedAt: "desc" }, take: 1 } },
    take: limit * 2,
  });

  const rows: RadarRow[] = [];
  for (const p of patients.slice(0, limit)) {
    const latest = await db.pieRiskAssessment.findFirst({
      where: { patientId: p.id, domain: "composite" },
      orderBy: { createdAt: "desc" },
    });
    let score = latest?.score ?? 0;
    let band = latest?.band ?? "green";
    let confidence = latest?.confidence ?? 0.5;
    let uncertain = latest?.uncertain ?? false;
    let domain = latest?.domain ?? "composite";
    let topDriver: string | undefined;
    if (latest) {
      const drivers = JSON.parse(latest.driversJson || "[]") as { feature: string; detail: string }[];
      topDriver = drivers[0] ? `${drivers[0].feature} — ${drivers[0].detail}` : undefined;
    } else if (p.vitals[0]) {
      // no assessment yet: derive a fast proxy from the freshest vital so the radar is never blind
      const v = p.vitals[0];
      const z =
        (v.pulseRate && v.pulseRate > 100 ? 18 : 0) +
        (v.temperatureC && (v.temperatureC > 38 || v.temperatureC < 36) ? 14 : 0) +
        (v.spo2 && v.spo2 < 94 ? 16 : 0) +
        (v.bpSystolic && (v.bpSystolic > 160 || v.bpSystolic < 95) ? 12 : 0) +
        (v.respiratoryRate && v.respiratoryRate > 22 ? 12 : 0) +
        (p.chronicConditions?.length ?? 0) * 4;
      score = Math.min(100, z);
      band = score > 70 ? "red" : score > 30 ? "yellow" : "green";
      confidence = 0.62;
      uncertain = true;
      domain = "composite";
    }
    const openProtocol = await db.pieProtocol.findFirst({
      where: { patientId: p.id, status: { in: ["pending_approval", "approved"] } },
      select: { id: true },
    });
    rows.push({
      patientId: p.id,
      patientName: p.fullName,
      uhid: p.uhid,
      ward: null,
      score,
      band,
      confidence,
      uncertain,
      domain,
      topDriver,
      openProtocolId: openProtocol?.id,
    });
  }
  return rows.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Approve a protocol → coordinate tasks + notifications. */
export async function approveProtocol(
  protocolId: string,
  approvedBy: string
): Promise<{ ok: boolean; tasks?: number; notifications?: number; reason?: string }> {
  const protocol = await db.pieProtocol.findUnique({ where: { id: protocolId } });
  if (!protocol) return { ok: false, reason: "protocol_not_found" };
  if (protocol.status !== "pending_approval") return { ok: false, reason: `protocol already ${protocol.status}` };
  if (protocol.code === "manual_review") return { ok: false, reason: "uncertain-flagged protocols need clinician-authored orders, not one-click approval" };

  const patient = await db.hospitalPatient.findUnique({ where: { id: protocol.patientId }, select: { fullName: true, uhid: true } });
  const spec: PreEmptiveProtocolSpec = {
    code: protocol.code,
    title: protocol.title,
    alert: protocol.alert,
    primaryDriver: protocol.primaryDriver,
    immediate: JSON.parse(protocol.immediateJson || "[]"),
    monitoring: JSON.parse(protocol.monitoringJson || "[]"),
    dispo: protocol.dispo ?? "",
    evidence: protocol.evidence,
  };
  const hospital = await db.hospital.findFirst({ select: { id: true } });
  const sink = prismaCoordinationSink(hospital?.id ?? "hx_demo");
  const res = await executeCoordination(sink, spec, {
    patientId: protocol.patientId,
    patientLabel: `${patient?.fullName ?? "patient"} (${patient?.uhid ?? "?"})`,
    protocolId,
  });

  await db.pieProtocol.update({
    where: { id: protocolId },
    data: { status: "executed", approvedBy, approvedAt: new Date(), executedAt: new Date(), tasksCreated: res.tasks > 0 },
  });
  return { ok: true, tasks: res.tasks, notifications: res.notifications };
}

/** Reject a protocol with a reason (audit trail). */
export async function rejectProtocol(protocolId: string, rejectedBy: string, reason: string) {
  const protocol = await db.pieProtocol.findUnique({ where: { id: protocolId } });
  if (!protocol) return { ok: false, reason: "protocol_not_found" };
  await db.pieProtocol.update({
    where: { id: protocolId },
    data: { status: "rejected", approvedBy: rejectedBy, approvedAt: new Date(), rejectReason: reason },
  });
  return { ok: true };
}
