/* ============================================================
 * PIE — Prisma persistence adapter
 * Bridges the pure engine modules to the live database:
 *   • buildTwinState: assembles the twin state vector from the
 *     Life Stream (vitals, labs, notes, bio-signals, adherence, SDoH)
 *   • persistAssessment / persistProtocol / coordination sink
 *   • GraphRepo implementation over PieGraphNode / PieGraphEdge
 * ============================================================ */

import { db } from "@/lib/db";
import type { GraphEdge, GraphNode, GraphRepo } from "./graph/patient-graph";
import type { CoordinationSink, CoordinationTask, NotificationStub } from "./protocols/coordination";
import type { BioSignalBatch, TwinStateVector } from "./types";
import { ingestBioBatch } from "./ingest/bio-signals";
import { adherenceScore, type AdherenceInput } from "./ingest/adherence";
import { dailySlope, ewma } from "./ingest/data-ingestion";
import { getSdoh, sdohRiskModifiers } from "./ingest/sdoh";

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const iso = (d: Date | string) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());

/**
 * Assemble the twin state vector for a patient from every silo.
 * Missing data degrades gracefully (nulls) and confidence falls.
 */
export async function buildTwinState(patientId: string): Promise<TwinStateVector | null> {
  const patient = await db.hospitalPatient.findUnique({ where: { id: patientId } });
  if (!patient) return null;

  const since = new Date(Date.now() - 30 * 86_400_000);
  const [vitals, bios, adherenceEvents, sdohRow, notes, labResults] = await Promise.all([
    db.hospitalVital.findMany({ where: { patientId, recordedAt: { gte: since } }, orderBy: { recordedAt: "asc" } }),
    db.pieBioSignal.findMany({ where: { patientId, capturedAt: { gte: since } }, orderBy: { capturedAt: "asc" } }),
    db.pieAdherenceEvent.findMany({ where: { patientId, ts: { gte: since } }, orderBy: { ts: "asc" } }),
    db.pieSdohProfile.findUnique({ where: { patientId } }),
    db.clinicalNote.findMany({ where: { patientId, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.labResult.findMany({
      where: { order: { patientId }, reportedAt: { gte: since } },
      orderBy: { reportedAt: "desc" },
      take: 80,
    }).catch(() => [] as Awaited<ReturnType<typeof db.labResult.findMany>>),
  ]);

  // Labs: map free-text test names onto the twin's lab fields (latest wins)
  const labNum = (s: string | null | undefined): number | null => {
    if (!s) return null;
    const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  };
  const LAB_MAP: { keys: RegExp; field: "wbc" | "creatinine" | "hba1c" | "glucose" | "potassium" | "ntProBnp" }[] = [
    { keys: /wbc|leucocyte|leukocyte|total count/i, field: "wbc" },
    { keys: /creatinine/i, field: "creatinine" },
    { keys: /hba1c|hba1|glycated/i, field: "hba1c" },
    { keys: /glucose|sugar/i, field: "glucose" },
    { keys: /potassium|k\+/i, field: "potassium" },
    { keys: /nt.?probnp|bnp/i, field: "ntProBnp" },
  ];
  const labs: Record<string, number> = {};
  for (const r of labResults) {
    const v = labNum(r.resultValue);
    if (v === null) continue;
    for (const m of LAB_MAP) {
      if (m.keys.test(r.testName) && labs[m.field] === undefined) {
        labs[m.field] = v;
        break;
      }
    }
  }

  const series = (metric: string) => vitals.map((v) => ({ ts: iso(v.recordedAt), value: pickVital(v, metric) })).filter((x): x is { ts: string; value: number } => x.value !== null);
  const bioSeries = (metric: string) => bios.filter((b) => b.metric === metric).map((b) => ({ ts: iso(b.capturedAt), value: b.value }));

  // Twin memory discipline: the CURRENT state comes from the recent
  // window (7d EWMA) and TRENDS from a 14d slope — a 30-day average
  // would dilute an acute 3-day deterioration until it is invisible.
  const withinDays = (pts: { ts: string; value: number }[], days: number) => {
    const cut = Date.now() - days * 86_400_000;
    return pts.filter((p) => new Date(p.ts).getTime() >= cut);
  };
  const recent = (pts: { ts: string; value: number }[], days = 7) => withinDays(pts, days);
  const trendWindow = (pts: { ts: string; value: number }[], days = 14) => withinDays(pts, days);

  const hrSeries = [...bioSeries("heart_rate"), ...series("pulseRate")];
  const sbpSeries = series("bpSystolic");
  const dbpSeries = series("bpDiastolic");
  const tempSeries = [...bioSeries("temp"), ...series("temperatureC")];
  const rrSeries = series("respiratoryRate");
  const spo2Series = [...bioSeries("spo2"), ...series("spo2")];
  const weightSeries = [...bioSeries("weight")];

  const conditions = parseList(patient.chronicConditions);
  const infectionTitles = notes
    .filter((n) => /infect|sepsis|pneumonia|uti|cellulitis/i.test(`${n.subjective ?? ""} ${n.assessment ?? ""} ${n.fullText ?? ""}`))
    .slice(0, 3)
    .map((n) => "documented infection");

  const sdoh = sdohRow
    ? { aqi: sdohRow.aqi, foodDesertKm: sdohRow.foodDesertKm, crimeIndex: sdohRow.crimeIndex }
    : (() => {
        const snap = getSdoh(patient.district ?? null) ?? getSdoh("560001");
        return snap ? { aqi: snap.aqi, foodDesertKm: snap.foodDesertKm, crimeIndex: snap.crimeIndex } : { aqi: null, foodDesertKm: null, crimeIndex: null };
      })();

  const adher = adherenceScore(adherenceEvents.map<AdherenceInput>((e) => ({ kind: e.kind as AdherenceInput["kind"], ts: iso(e.ts) })));

  return {
    patientId,
    age: patient.age ?? null,
    sex: (patient.gender as TwinStateVector["sex"]) ?? "other",
    weightKg: weightSeries.length ? Number(ewma(weightSeries.slice(-10).map((w) => w.value)).toFixed(1)) : null,
    hr: hrSeries.length ? Number(ewma(recent(hrSeries, 3).slice(-8).map((s) => s.value)).toFixed(1)) : null,
    sbp: sbpSeries.length ? Number(ewma(recent(sbpSeries, 3).slice(-6).map((s) => s.value)).toFixed(1)) : null,
    dbp: dbpSeries.length ? Number(ewma(recent(dbpSeries, 3).slice(-6).map((s) => s.value)).toFixed(1)) : null,
    rr: rrSeries.length ? Number(ewma(recent(rrSeries, 3).slice(-6).map((s) => s.value)).toFixed(1)) : null,
    tempC: tempSeries.length ? Number(ewma(recent(tempSeries, 3).slice(-8).map((s) => s.value)).toFixed(2)) : null,
    spo2: spo2Series.length ? Number(ewma(recent(spo2Series, 3).slice(-8).map((s) => s.value)).toFixed(1)) : null,
    wbc: labs.wbc ?? null,
    creatinine: labs.creatinine ?? null,
    hba1c: labs.hba1c ?? null,
    glucose: labs.glucose ?? null,
    potassium: labs.potassium ?? null,
    ntProBnp: labs.ntProBnp ?? null,
    hrTrend: Number(dailySlope(trendWindow(hrSeries)).toFixed(3)),
    tempTrend: Number(dailySlope(trendWindow(tempSeries)).toFixed(3)),
    wbcTrend: 0,
    weightTrend: Number(dailySlope(trendWindow(weightSeries)).toFixed(3)),
    creatinineTrend: 0,
    activeInfections: infectionTitles,
    medications: conditions.includes("E11") ? ["metformin"] : [],
    chronicConditions: conditions,
    geneticMarkers: [],
    adherenceScore: adher.score,
    sdoh,
    updatedAt: new Date().toISOString(),
  };

  function pickVital(v: Record<string, unknown>, metric: string): number | null {
    switch (metric) {
      case "pulseRate": return num(v.pulseRate);
      case "bpSystolic": return num(v.bpSystolic);
      case "bpDiastolic": return num(v.bpDiastolic);
      case "temperatureC": return num(v.temperatureC);
      case "respiratoryRate": return num(v.respiratoryRate);
      case "spo2": return num(v.spo2);
      default: return null;
    }
  }
  function parseList(s: string | null): string[] {
    if (!s) return [];
    try { const arr = JSON.parse(s); return Array.isArray(arr) ? arr.map(String) : s.split(",").map((x) => x.trim()).filter(Boolean); }
    catch { return s.split(",").map((x) => x.trim()).filter(Boolean); }
  }
}

/** Persist a bio batch; returns the ingest report. */
export async function storeBioBatch(batch: BioSignalBatch) {
  const { accepted, report } = ingestBioBatch(batch);
  if (accepted.length) {
    await db.pieBioSignal.createMany({
      data: accepted.map((s) => ({
        deviceId: batch.deviceId,
        patientId: batch.patientId ?? null,
        metric: s.metric,
        value: s.value,
        unit: s.unit ?? null,
        quality: s.quality ?? 1,
        capturedAt: new Date(s.capturedAt),
      })),
    });
  }
  return report;
}

/** GraphRepo over Prisma. */
export const prismaGraphRepo: GraphRepo = {
  async upsertNode(node: GraphNode) {
    await db.pieGraphNode.upsert({
      where: { label_key: { label: node.label, key: node.key } },
      create: { label: node.label, key: node.key, propsJson: node.props ? JSON.stringify(node.props) : null },
      update: { propsJson: node.props ? JSON.stringify(node.props) : undefined },
    });
    return node.key;
  },
  async upsertEdge(edge: GraphEdge) {
    const [from, to] = await Promise.all([
      db.pieGraphNode.findFirst({ where: { key: edge.fromKey } }),
      db.pieGraphNode.findFirst({ where: { key: edge.toKey } }),
    ]);
    if (!from || !to) return;
    await db.pieGraphEdge.upsert({
      where: { type_fromNodeId_toNodeId: { type: edge.type, fromNodeId: from.id, toNodeId: to.id } },
      create: { type: edge.type, fromNodeId: from.id, toNodeId: to.id, weight: edge.weight, propsJson: edge.props ? JSON.stringify(edge.props) : null },
      update: { weight: edge.weight, propsJson: edge.props ? JSON.stringify(edge.props) : null },
    });
  },
  async neighbors(key, opts) {
    const node = await db.pieGraphNode.findFirst({ where: { key } });
    if (!node) return [];
    const edges = await db.pieGraphEdge.findMany({
      where: {
        OR: [{ fromNodeId: node.id }, { toNodeId: node.id }],
        ...(opts?.edgeTypes ? { type: { in: opts.edgeTypes } } : {}),
        weight: { gte: opts?.minWeight ?? 0 },
      },
    });
    const ids = [...new Set(edges.flatMap((e) => [e.fromNodeId, e.toNodeId]))];
    const nodes = await db.pieGraphNode.findMany({ where: { id: { in: ids } } });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return edges
      .map((e) => {
        const otherId = e.fromNodeId === node.id ? e.toNodeId : e.fromNodeId;
        const n = byId.get(otherId);
        return n
          ? { edge: { type: e.type as GraphEdge["type"], fromKey: key, toKey: n.key, weight: e.weight }, node: { id: `${n.label}:${n.key}`, label: n.label as GraphNode["label"], key: n.key } }
          : null;
      })
      .filter((x): x is { edge: GraphEdge; node: GraphNode } => x !== null);
  },
};

/** Coordination sink — creates WorkQueue tasks + notifications. */
export const prismaCoordinationSink = (hospitalId: string): CoordinationSink => ({
  async createTasks(tasks: CoordinationTask[], ctx: { patientId: string; protocolId: string }) {
    const patient = await db.hospitalPatient.findUnique({ where: { id: ctx.patientId }, select: { fullName: true, uhid: true } });
    let created = 0;
    for (const t of tasks) {
      try {
        await db.nxTask.create({
          data: {
            hospitalId,
            title: t.title,
            detail: `${t.description} [PIE protocol ${t.sourceProtocol}]`,
            type: "task",
            category: "clinical",
            priority: t.priority === "stat" ? "critical" : "high",
            status: "new",
            ownerRole: t.assigneeRole,
            patientId: ctx.patientId,
            patientName: patient?.fullName ?? null,
            patientUhid: patient?.uhid ?? null,
            source: "pie",
          } as never,
        });
        created += 1;
      } catch {
        // NxTask.source may not exist across schema versions — retry minimal
        try {
          await db.nxTask.create({
            data: {
              hospitalId,
              title: t.title,
              detail: `${t.description} [PIE protocol ${t.sourceProtocol}]`,
              type: "task",
              category: "clinical",
              priority: t.priority === "stat" ? "critical" : "high",
              status: "new",
              ownerRole: t.assigneeRole,
              patientId: ctx.patientId,
              patientName: patient?.fullName ?? null,
              patientUhid: patient?.uhid ?? null,
            } as never,
          });
          created += 1;
        } catch { /* keep counting the rest */ }
      }
    }
    return created;
  },
  async notify(items: NotificationStub[], ctx: { patientId: string; protocolId: string }) {
    // notifications ride the existing event bus; persist as events for audit
    let n = 0;
    for (const item of items) {
      try {
        await db.nxEventLog.create({
          data: {
            hospitalId,
            aggregateType: "pie_protocol",
            aggregateId: ctx.protocolId,
            type: "notification",
            seq: n,
            payloadJson: JSON.stringify(item),
            actorName: "PIE",
          } as never,
        });
        n += 1;
      } catch { /* best effort */ }
    }
    return n;
  },
});

export { sdohRiskModifiers };
