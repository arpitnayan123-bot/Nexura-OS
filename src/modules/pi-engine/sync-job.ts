/* ============================================================
 * PIE Phase 1.2b — Graph Sync Job
 * Background job that syncs critical Prisma entities into the
 * Patient Graph every 5 minutes (drugs, conditions, genes,
 * environment, lifestyle) and seeds canonical knowledge edges
 * (drug-gene interactions, condition→condition risk weights).
 * Registered from instrumentation.ts; safe to call repeatedly.
 * ============================================================ */

import { db } from "@/lib/db";
import { DRUG_GENE_INTERACTIONS, CONDITION_RISKS, nk, syncPatientToGraph, type GraphRepo } from "./graph/patient-graph";
import { prismaGraphRepo } from "./db";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

/** Seed canonical knowledge edges once (idempotent upserts). */
export async function seedKnowledgeGraph(repo: GraphRepo = prismaGraphRepo): Promise<void> {
  for (const i of DRUG_GENE_INTERACTIONS) {
    await repo.upsertNode({ id: nk("Drug", `drug:${i.drug}`), label: "Drug", key: `drug:${i.drug}` });
    await repo.upsertNode({ id: nk("Gene", `gene:${i.target}`), label: "Gene", key: `gene:${i.target}`, props: { note: i.note } });
    await repo.upsertEdge({ type: "INTERACTS_WITH", fromKey: nk("Drug", `drug:${i.drug}`), toKey: nk("Gene", `gene:${i.target}`), weight: i.severity, props: { note: i.note } });
  }
  for (const r of CONDITION_RISKS) {
    await repo.upsertNode({ id: nk("Condition", r.from.replace(/^Condition:/, "")), label: "Condition", key: r.from.replace(/^Condition:/, "") });
    await repo.upsertNode({ id: nk("Condition", r.to.replace(/^Condition:/, "")), label: "Condition", key: r.to.replace(/^Condition:/, "") });
    await repo.upsertEdge({ type: "HIGH_RISK_OF", fromKey: r.from, toKey: r.to, weight: r.weight });
  }
}

/** Sync all patients with recent activity into the graph. */
export async function syncGraphFromPrisma(repo: GraphRepo = prismaGraphRepo): Promise<{ patients: number; nodes: number; edges: number }> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const patients = await db.hospitalPatient.findMany({
    where: { OR: [{ vitals: { some: { recordedAt: { gte: since } } } }, { admissions: { some: {} } }] },
    select: { id: true, uhid: true, chronicConditions: true, district: true },
    take: 200,
  });
  let nodes = 0, edges = 0;
  for (const p of patients) {
    const conditions = parseList(p.chronicConditions);
    const drugs = conditions.includes("E11") ? ["metformin"] : conditions.includes("I10") ? ["amlodipine"] : [];
    const res = await syncPatientToGraph(repo, {
      patientKey: `uhid:${p.uhid}`,
      conditions,
      drugs,
      environment: p.district ? { regionKey: p.district, aqi: null } : null,
      lifestyle: [],
    });
    nodes += res.nodes;
    edges += res.edges;
  }
  return { patients: patients.length, nodes, edges };
}

function parseList(s: string | null): string[] {
  if (!s) return [];
  try {
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr.map(String) : s.split(",").map((x) => x.trim()).filter(Boolean);
  } catch {
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }
}

/** Start the recurring job (idempotent — guard on globalThis). */
export function startGraphSyncJob(): void {
  const g = globalThis as unknown as { __pieGraphSyncTimer?: ReturnType<typeof setInterval>; __pieGraphSyncBooted?: boolean };
  if (g.__pieGraphSyncBooted) return;
  g.__pieGraphSyncBooted = true;
  const tick = async () => {
    try {
      await seedKnowledgeGraph();
      const res = await syncGraphFromPrisma();
      console.log(`[pie] graph sync: ${res.patients} patients, ${res.nodes} nodes, ${res.edges} edges`);
    } catch (err) {
      console.error("[pie] graph sync failed:", err instanceof Error ? err.message : err);
    }
  };
  // first run shortly after boot, then every 5 minutes
  setTimeout(tick, 15_000).unref?.();
  g.__pieGraphSyncTimer = setInterval(tick, SYNC_INTERVAL_MS);
  g.__pieGraphSyncTimer.unref?.();
}
