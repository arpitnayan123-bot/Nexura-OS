/* ============================================================
 * PIE Phase 1.2 — Unified Patient Graph (hybrid architecture)
 * Property-graph semantics over the relational store: nodes,
 * weighted directed edges, k-hop neighborhood walks and cohort
 * ("swarm intelligence") queries. Scales to Neo4j behind the
 * same interface — see PatientGraphAdapter.
 * Pure functions over injected repositories — no direct IO.
 * ============================================================ */

export interface GraphNode {
  id: string;
  label:
    "Patient" | "Condition" | "Gene" | "Drug" | "LifestyleFactor" | "Environment" | "Observation";
  key: string; // stable business key: "uhid:XYZ", "drug:metformin"
  props?: Record<string, unknown>;
}

export interface GraphEdge {
  type:
    | "HIGH_RISK_OF"
    | "INTERACTS_WITH"
    | "HAS_CONDITION"
    | "TAKES_DRUG"
    | "EXPOSED_TO"
    | "SIMILAR_TO"
    | "IMPROVES"
    | "WORSENS"
    | "CARRIES_GENE";
  fromKey: string; // node key
  toKey: string;
  weight: number; // risk correlation strength 0..1+
  props?: Record<string, unknown>;
}

/** Minimal persistence surface — SQLite today, Neo4j tomorrow. */
export interface GraphRepo {
  upsertNode(node: GraphNode): Promise<string>; // returns node key
  upsertEdge(edge: GraphEdge): Promise<void>;
  neighbors(
    key: string,
    opts?: { edgeTypes?: GraphEdge["type"][]; minWeight?: number },
  ): Promise<{ edge: GraphEdge; node: GraphNode }[]>;
  allEdgesOf?(key: string): Promise<GraphEdge[]>;
}

/** Full node key helper — e.g. nk("Patient", "uhid:HX123") */
export const nk = (label: GraphNode["label"], key: string) => `${label}:${key}`;

/**
 * Sync critical entities into the graph. Called by the background
 * job every 5 minutes. Idempotent — upserts only.
 */
export async function syncPatientToGraph(
  repo: GraphRepo,
  patient: {
    patientKey: string; // e.g. "uhid:HX1042"
    conditions: string[]; // ["E11", "I10"]
    drugs: string[];
    genes?: string[];
    environment?: { regionKey: string; aqi: number | null } | null;
    lifestyle?: string[]; // ["sedentary", "smoker"]
  },
): Promise<{ nodes: number; edges: number }> {
  let nodes = 0,
    edges = 0;
  const pKey = nk("Patient", patient.patientKey);
  await repo.upsertNode({ id: pKey, label: "Patient", key: patient.patientKey });
  nodes += 1;

  for (const cond of patient.conditions) {
    const cKey = nk("Condition", `icd:${cond}`);
    await repo.upsertNode({
      id: cKey,
      label: "Condition",
      key: `icd:${cond}`,
      props: { icd: cond },
    });
    await repo.upsertEdge({ type: "HAS_CONDITION", fromKey: pKey, toKey: cKey, weight: 1 });
    nodes += 1;
    edges += 1;
  }
  for (const drug of patient.drugs) {
    const dKey = nk("Drug", `drug:${drug.toLowerCase()}`);
    await repo.upsertNode({ id: dKey, label: "Drug", key: `drug:${drug.toLowerCase()}` });
    await repo.upsertEdge({ type: "TAKES_DRUG", fromKey: pKey, toKey: dKey, weight: 1 });
    nodes += 1;
    edges += 1;
  }
  for (const gene of patient.genes ?? []) {
    const gKey = nk("Gene", `gene:${gene.toLowerCase()}`);
    await repo.upsertNode({ id: gKey, label: "Gene", key: `gene:${gene.toLowerCase()}` });
    await repo.upsertEdge({ type: "CARRIES_GENE", fromKey: pKey, toKey: gKey, weight: 1 });
    nodes += 1;
    edges += 1;
  }
  if (patient.environment) {
    const eKey = nk("Environment", `region:${patient.environment.regionKey}`);
    await repo.upsertNode({
      id: eKey,
      label: "Environment",
      key: `region:${patient.environment.regionKey}`,
      props: { aqi: patient.environment.aqi },
    });
    await repo.upsertEdge({
      type: "EXPOSED_TO",
      fromKey: pKey,
      toKey: eKey,
      weight: patient.environment.aqi ? Math.min(1.5, patient.environment.aqi / 100) : 0.5,
    });
    nodes += 1;
    edges += 1;
  }
  for (const lf of patient.lifestyle ?? []) {
    const lKey = nk("LifestyleFactor", `life:${lf.toLowerCase()}`);
    await repo.upsertNode({ id: lKey, label: "LifestyleFactor", key: `life:${lf.toLowerCase()}` });
    await repo.upsertEdge({ type: "EXPOSED_TO", fromKey: pKey, toKey: lKey, weight: 0.8 });
    nodes += 1;
    edges += 1;
  }
  return { nodes, edges };
}

/** Canonical clinical interaction/risk knowledge — seeds graph edges. */
export const DRUG_GENE_INTERACTIONS: {
  drug: string;
  target: string;
  severity: number;
  note: string;
}[] = [
  {
    drug: "clopidogrel",
    target: "cyp2c19_lof",
    severity: 0.9,
    note: "loss-of-function allele → reduced antiplatelet effect",
  },
  { drug: "warfarin", target: "vkorc1_variant", severity: 0.8, note: "dose sensitivity variant" },
  {
    drug: "metformin",
    target: "oct1_variant",
    severity: 0.4,
    note: "reduced uptake → attenuated response",
  },
  { drug: "simvastatin", target: "slco1b1_variant", severity: 0.85, note: "myopathy risk allele" },
  {
    drug: "codeine",
    target: "cyp2d6_um",
    severity: 0.7,
    note: "ultrarapid metabolizer → toxicity risk",
  },
];

export const CONDITION_RISKS: { from: string; to: string; weight: number }[] = [
  { from: "icd:E11", to: "icd:N18", weight: 0.62 }, // T2DM → CKD
  { from: "icd:E11", to: "icd:I50", weight: 0.41 }, // T2DM → HF
  { from: "icd:I10", to: "icd:I63", weight: 0.48 }, // HTN → stroke
  { from: "icd:I50", to: "icd:A41", weight: 0.3 }, // HF → sepsis susceptibility
  { from: "icd:J44", to: "icd:J96", weight: 0.55 }, // COPD → respiratory failure
  { from: "icd:N18", to: "icd:I50", weight: 0.37 }, // CKD → HF
];

/**
 * "Swarm Intelligence" — find patients with similar risk signatures.
 * Two patients are similar when they share conditions/drugs/genes/
 * environment with Jaccard-style weighted overlap. Pure function over
 * pre-fetched patient signatures.
 */
export interface PatientSignature {
  patientKey: string;
  concepts: Set<string>; // node keys (conditions ∪ drugs ∪ genes ∪ lifestyle)
  band?: "green" | "yellow" | "red";
}

export function similarPatients(
  indexPatient: PatientSignature,
  cohort: PatientSignature[],
  minOverlap = 0.25,
): { patientKey: string; overlap: number; shared: string[] }[] {
  const out: { patientKey: string; overlap: number; shared: string[] }[] = [];
  for (const c of cohort) {
    if (c.patientKey === indexPatient.patientKey) continue;
    const shared = [...indexPatient.concepts].filter((x) => c.concepts.has(x));
    const union = new Set([...indexPatient.concepts, ...c.concepts]);
    const jaccard = union.size ? shared.length / union.size : 0;
    if (jaccard >= minOverlap)
      out.push({ patientKey: c.patientKey, overlap: Number(jaccard.toFixed(3)), shared });
  }
  return out.sort((a, b) => b.overlap - a.overlap);
}
