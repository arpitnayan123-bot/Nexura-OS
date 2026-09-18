/* ============================================================
 * PIE — Vitest suite
 * Model accuracy checks, fail-safe gates, counterfactual
 * invariants, federation math, bias auditing and the full
 * Alert → Approve → Execute coordination flow (with an
 * in-memory sink — no database required).
 * ============================================================ */

import { describe, expect, it } from "vitest";
import type { TwinStateVector } from "@/modules/pi-engine/types";
import {
  cleanseSeries,
  dailySlope,
  ewma,
  median,
  modifiedZScores,
  toLifeStreamPoint,
  unifyStream,
} from "@/modules/pi-engine/ingest/data-ingestion";
import {
  ingestBioBatch,
  nightSummary,
  variabilityFeatures,
} from "@/modules/pi-engine/ingest/bio-signals";
import { extractFromNote } from "@/modules/pi-engine/ingest/nlp-notes";
import { adherenceScore, engagementCollapse } from "@/modules/pi-engine/ingest/adherence";
import { getSdoh, sdohRiskModifiers, bundledProvider } from "@/modules/pi-engine/ingest/sdoh";
import {
  syncPatientToGraph,
  similarPatients,
  DRUG_GENE_INTERACTIONS,
  type GraphRepo,
  type GraphEdge,
  type GraphNode,
} from "@/modules/pi-engine/graph/patient-graph";
import {
  computeBaseline,
  decayOneDay,
  egfr2021,
  meanArterialPressure,
} from "@/modules/pi-engine/twin/digital-twin";
import {
  featurize,
  predictScore,
  trainStep,
  defaultWeights,
} from "@/modules/pi-engine/twin/series";
import { bandOfScore, sepsisRisk, stratify } from "@/modules/pi-engine/twin/risk";
import {
  INTERVENTION_CATALOG,
  simulateIntervention,
} from "@/modules/pi-engine/twin/counterfactual";
import { decideProtocol, protocolFor } from "@/modules/pi-engine/protocols/generator";
import {
  planCoordination,
  executeCoordination,
  type CoordinationSink,
} from "@/modules/pi-engine/protocols/coordination";
import {
  federatedAverage,
  validateDeltaPrivacy,
  sanitizeOutgoingDelta,
  applyGlobalUpdate,
} from "@/modules/pi-engine/federation/federated";
import { explain, attributionBars } from "@/modules/pi-engine/governance/explain";
import {
  updateDrift,
  biasAudit,
  enforceConfidenceGate,
  SAMD_REGISTRY,
} from "@/modules/pi-engine/governance/drift";

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

function baseState(over: Partial<TwinStateVector> = {}): TwinStateVector {
  return {
    patientId: "p_test",
    age: 54,
    sex: "male",
    weightKg: 78,
    hr: 76,
    sbp: 124,
    dbp: 78,
    rr: 14,
    tempC: 36.7,
    spo2: 98,
    wbc: 7.2,
    creatinine: 1.0,
    hba1c: 6.8,
    glucose: 120,
    potassium: 4.1,
    ntProBnp: 140,
    hrTrend: 0.2,
    tempTrend: 0.01,
    wbcTrend: 0.01,
    weightTrend: 0,
    creatinineTrend: 0.002,
    activeInfections: [],
    medications: ["metformin"],
    chronicConditions: ["E11"],
    geneticMarkers: [],
    adherenceScore: 0.85,
    sdoh: { aqi: 90, foodDesertKm: 0.9, crimeIndex: 35 },
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

/** Trajectory factory: days of hourly observations worsening at `rate`. */
function septicState(dayDelta = 3, rate = 1): TwinStateVector {
  return baseState({
    hr: 76 + dayDelta * 6 * rate,
    hrTrend: 4.8 * rate,
    tempC: 36.7 + dayDelta * 0.35 * rate,
    tempTrend: 0.3 * rate,
    wbc: 7.2 + dayDelta * 1.6 * rate,
    wbcTrend: 1.2 * rate,
    rr: 14 + dayDelta * 1.4 * rate,
    spo2: 98 - dayDelta * 1.1 * rate,
    sbp: 124 - dayDelta * 4 * rate,
    activeInfections: dayDelta > 1 ? ["urinary tract infection"] : [],
  });
}

describe("PIE Phase 1 — data ingestion", () => {
  it("median + modified z-scores flag injected outliers", () => {
    expect(median([3, 1, 4, 1, 5])).toBe(3);
    const xs = [72, 74, 73, 71, 75, 74, 72, 300, 73, 74];
    const mz = modifiedZScores(xs);
    expect(Math.abs(mz[7])).toBeGreaterThan(3.5);
    const { clean, outliers } = cleanseSeries(xs);
    expect(outliers).toEqual([7]);
    expect(clean).not.toContain(300);
  });

  it("toLifeStreamPoint cleanses against the patient series and flags it", () => {
    const p = toLifeStreamPoint(
      {
        source: "vitals",
        kind: "observation",
        title: "Heart rate",
        value: 280,
        ts: new Date().toISOString(),
      },
      [72, 74, 73, 71, 75, 74],
    );
    expect(p.outlier).toBe(true);
    expect(p.data?.method).toBe("modified_z_mad");
  });

  it("unifyStream sorts multi-source events chronologically", () => {
    const a = {
      source: "labs" as const,
      kind: "result" as const,
      title: "HbA1c",
      value: 7.1,
      ts: daysAgo(1),
    };
    const b = {
      source: "vitals" as const,
      kind: "observation" as const,
      title: "BP",
      value: 128,
      ts: daysAgo(2),
    };
    const merged = unifyStream([a], [b]);
    expect(merged[0].title).toBe("BP");
  });

  it("dailySlope recovers a synthetic per-day trend", () => {
    const pts = [0, 1, 2, 3, 4].map((d) => ({ ts: daysAgo(4 - d), value: 70 + d * 5 }));
    expect(Math.abs(dailySlope(pts) - 5)).toBeLessThan(0.01);
  });

  it("bio batch ingestion rejects implausible + outlier readings", () => {
    const batch = {
      deviceId: "dev1",
      samples: [
        { metric: "heart_rate" as const, value: 74, capturedAt: daysAgo(0) },
        { metric: "heart_rate" as const, value: 76, capturedAt: daysAgo(0) },
        { metric: "heart_rate" as const, value: 75, capturedAt: daysAgo(0) },
        { metric: "heart_rate" as const, value: 74.5, capturedAt: daysAgo(0) },
        { metric: "heart_rate" as const, value: 76, capturedAt: daysAgo(0) },
        { metric: "heart_rate" as const, value: 990, capturedAt: daysAgo(0) }, // implausible
        { metric: "spo2" as const, value: 97, capturedAt: daysAgo(0) },
      ],
    };
    const { accepted, report } = ingestBioBatch(batch);
    expect(report.rejectedImplausible).toBe(1);
    expect(accepted.every((s) => s.value !== 990));
  });

  it("night summary computes deep/REM percentages and awakenings", () => {
    const samples = Array.from({ length: 84 }, (_, i) => ({
      metric: "sleep_stage" as const,
      value: i < 20 ? 1 : i < 62 ? 2 : i < 76 ? 3 : 0,
      capturedAt: daysAgo(0),
    }));
    const ns = nightSummary(samples);
    expect(ns.deepPct).toBeCloseTo(23.8, 0);
    expect(ns.awakenings).toBeGreaterThan(0);
    expect(ns.totalMinutes).toBe(420);
  });

  it("variability features widen in deterioration", () => {
    const calm = variabilityFeatures([70, 71, 70, 72, 71]);
    const wild = variabilityFeatures([70, 96, 62, 104, 68]);
    expect(wild.cv).toBeGreaterThan(calm.cv);
  });

  it("clinical NLP extracts SNOMED/ICD concepts + deterioration signals", () => {
    const ex = extractFromNote(
      "Patient reports worsening shortness of breath and fever. Non-adherent with metformin. Smoker.",
    );
    const codes = ex.concepts.map((c) => c.code);
    expect(codes).toContain("267036007"); // dyspnea SNOMED
    expect(codes).toContain("Z720"); // tobacco ICD10
    expect(codes).toContain("Z9114"); // non-adherence
    expect(ex.deteriorationSignals.length).toBeGreaterThan(0);
  });

  it("adherence EWMA: recent misses pull the score down; collapse detected after silence", () => {
    const good = adherenceScore([
      { kind: "med_logged", ts: daysAgo(1) },
      { kind: "med_logged", ts: daysAgo(2) },
    ]);
    const bad = adherenceScore([
      { kind: "med_missed", ts: daysAgo(1) },
      { kind: "med_missed", ts: daysAgo(1.1) },
    ]);
    expect(good.score).toBeGreaterThan(bad.score);
    const silent = engagementCollapse([{ kind: "app_login", ts: daysAgo(9) }]);
    expect(silent.collapsed).toBe(true);
  });

  it("SDoH provider resolves regions and modifies risk sensibly", () => {
    const delhi = getSdoh("110001");
    expect(delhi?.aqi).toBe(165);
    const mods = sdohRiskModifiers(delhi);
    expect(mods.cardiopulmonary).toBeGreaterThan(1);
    expect(sdohRiskModifiers(null).cardiopulmonary).toBe(1);
    expect(bundledProvider.fetch("999999")).toBeNull();
  });
});

describe("PIE Phase 1.2 — patient graph", () => {
  it("syncs patient entities and knowledge edges through the repo", async () => {
    const nodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const repo: GraphRepo = {
      async upsertNode(n) {
        nodes.set(n.id, n);
        return n.key;
      },
      async upsertEdge(e) {
        edges.push(e);
      },
      async neighbors() {
        return [];
      },
    };
    const res = await syncPatientToGraph(repo, {
      patientKey: "uhid:HX1",
      conditions: ["E11", "I10"],
      drugs: ["metformin"],
      genes: ["cyp2c19_lof"],
      environment: { regionKey: "560001", aqi: 95 },
      lifestyle: ["sedentary"],
    });
    expect(res.nodes).toBeGreaterThanOrEqual(7);
    expect(edges.some((e) => e.type === "HAS_CONDITION")).toBe(true);
    expect(edges.some((e) => e.type === "TAKES_DRUG")).toBe(true);
    expect(edges.some((e) => e.type === "CARRIES_GENE")).toBe(true);
    expect(DRUG_GENE_INTERACTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it("swarm cohort finds similar gene-drug profiles above the overlap floor", () => {
    const index = {
      patientKey: "p1",
      concepts: new Set(["icd:E11", "drug:metformin", "gene:cyp2c19_lof"]),
    };
    const cohort = [
      { patientKey: "p2", concepts: new Set(["icd:E11", "drug:metformin", "gene:cyp2c19_lof"]) },
      { patientKey: "p3", concepts: new Set(["icd:J44", "drug:salbutamol"]) },
    ];
    const hits = similarPatients(index, cohort);
    expect(hits[0]?.patientKey).toBe("p2");
    expect(hits.find((h) => h.patientKey === "p3")).toBeUndefined();
  });
});

describe("PIE Phase 2 — living twin", () => {
  it("physics baselines follow clinical formulas", () => {
    expect(meanArterialPressure(120, 80)).toBeCloseTo(93.3, 1);
    const e = egfr2021(55, "male", 1.0);
    expect(e).toBeGreaterThan(80);
    expect(egfr2021(80, "female", 3.0)).toBeLessThan(30);
    const b = computeBaseline(baseState({ weightKg: 80, hr: 80, sbp: 140, dbp: 90 }));
    expect(b.map).toBeCloseTo(106.7, 0);
    expect(b.cardiacOutput).toBeGreaterThan(4);
    expect(b.svr).toBeGreaterThan(800);
  });

  it("SEPSIS ACCURACY: deteriorating trajectories cross red early; stable stay green", () => {
    const septic = septicState(3);
    const s = sepsisRisk(septic);
    // 12–24h ahead of classic criteria: day-3 trajectory must be red
    expect(s.score).toBeGreaterThanOrEqual(71);
    const early = septicState(2);
    expect(sepsisRisk(early).score).toBeGreaterThanOrEqual(41); // at least yellow 12h ahead
    const stable = baseState();
    const ss = sepsisRisk(stable);
    expect(ss.score).toBeLessThanOrEqual(30);
    // separation margin
    expect(s.score - ss.score).toBeGreaterThan(50);
  });

  it("readmission risk rewards adherence and punishes degradation", () => {
    const low = baseState({
      adherenceScore: 0.3,
      creatinineTrend: 0.05,
      weightTrend: -0.3,
      chronicConditions: ["E11", "I50", "N18"],
    });
    const good = baseState({ adherenceScore: 0.95 });
    expect(bandOfScore(0)).toBe("green");
    const lowScore = stratify(low).byDomain.readmission.score;
    const goodScore = stratify(good).byDomain.readmission.score;
    expect(lowScore).toBeGreaterThan(goodScore + 20);
  });

  it("chronic decay rises with cumulative exposure and SDoH burden", () => {
    const exposure = baseState({
      hba1c: 9.4,
      sbp: 168,
      creatinine: 1.9,
      adherenceScore: 0.4,
      sdoh: { aqi: 180, foodDesertKm: 2.5, crimeIndex: 60 },
    });
    const controlled = baseState({ hba1c: 6.2, sbp: 122 });
    expect(stratify(exposure).byDomain.chronic_deterioration.score).toBeGreaterThan(
      stratify(controlled).byDomain.chronic_deterioration.score + 25,
    );
  });

  it("composite Time-to-Decay bands follow the 30/70 rule", () => {
    expect(bandOfScore(30)).toBe("green");
    expect(bandOfScore(31)).toBe("yellow");
    expect(bandOfScore(70)).toBe("yellow");
    expect(bandOfScore(71)).toBe("red");
  });

  it("series model trains toward targets and stays explainable", () => {
    let w = defaultWeights();
    const examples = [
      { state: septicState(3), target: 85 },
      { state: baseState(), target: 15 },
      { state: septicState(2), target: 60 },
    ];
    for (let i = 0; i < 40; i++) w = trainStep(w, examples, 0.05);
    const predSeptic = predictScore(w, septicState(3));
    const predStable = predictScore(w, baseState());
    expect(predSeptic).toBeGreaterThan(predStable + 30);
    expect(Object.keys(featurize(baseState())).length).toBe(15);
    expect(w.trainedSamples).toBe(defaultWeights().trainedSamples + 120);
  });

  it("decay dynamics: lower adherence accelerates chronic drift", () => {
    const adherent = decayOneDay(baseState({ hba1c: 7 }), { adherence: 0.95 });
    const nonAdherent = decayOneDay(baseState({ hba1c: 7 }), { adherence: 0.3 });
    expect(nonAdherent.hba1c! - 7).toBeGreaterThan(adherent.hba1c! - 7);
  });
});

describe("PIE Phase 2.3 — counterfactual engine", () => {
  it("metformin escalation lowers HbA1c and chronic risk", () => {
    const s = baseState({ hba1c: 8.4, creatinine: 1.1 });
    const met = INTERVENTION_CATALOG.find((i) => i.id === "metformin_up")!;
    const out = simulateIntervention(s, met);
    const hba1cLine = out.outcomeLines.find((l) => l.label === "HbA1c")!;
    expect(hba1cLine.direction).toBe("better");
    expect(out.riskDelta).toBeLessThan(0);
  });

  it("renal impairment surfaces a metformin caveat (explainability)", () => {
    const s = baseState({ creatinine: 1.8 });
    const met = INTERVENTION_CATALOG.find((i) => i.id === "metformin_up")!;
    const out = simulateIntervention(s, met);
    expect(out.caveats.some((c) => c.toLowerCase().includes("renal"))).toBe(true);
  });

  it("walking 30 min daily improves the projected curve", () => {
    const s = baseState({ hba1c: 7.8 });
    const walk = INTERVENTION_CATALOG.find((i) => i.id === "walk_30")!;
    expect(simulateIntervention(s, walk).riskDelta).toBeLessThanOrEqual(0.05);
  });
});

describe("PIE Phase 3 — pre-emptive protocols", () => {
  it("red zone + confidence ≥ 0.8 generates the guideline protocol", () => {
    const a = stratify(septicState(3)).composite;
    const forced = { ...a, band: "red" as const, score: 82, confidence: 0.92 };
    const d = decideProtocol(forced, false);
    expect(d.action).toBe("generate");
    expect(d.protocol?.code).toBe("sepsis_bundle");
  });

  it("FAIL-SAFE: confidence < 0.8 never auto-generates — manual review flag", () => {
    const a = stratify(baseState()).composite;
    const forced = { ...a, band: "red" as const, score: 85, confidence: 0.62 };
    const d = decideProtocol(forced, false);
    expect(d.action).toBe("uncertain_manual_review");
    expect(d.reason).toContain("Manual Review");
  });

  it("yellow/green never generates; open protocol prevents alert storms", () => {
    const a = stratify(baseState()).composite;
    expect(
      decideProtocol({ ...a, band: "yellow", score: 50, confidence: 0.95 }, false).action,
    ).toBe("below_threshold");
    const red = { ...a, band: "red" as const, score: 90, confidence: 0.95 };
    expect(decideProtocol(red, true).action).toBe("existing_protocol_active");
  });

  it("domain→protocol mapping is clinically coherent", () => {
    expect(protocolFor("sepsis", [])?.code).toBe("sepsis_bundle");
    expect(protocolFor("cardiac", [])?.code).toBe("hf_exacerbation");
    expect(
      protocolFor("chronic_deterioration", ["Cumulative glycemic exposure — HbA1c 9%"])?.code,
    ).toBe("dka_risk");
    expect(protocolFor("readmission", [])).toBeNull();
  });
});

describe("PIE Phase 3.2 — Alert → Approve → Execute coordination", () => {
  it("approval plan routes tasks to nurse/pharmacy/lab/doctor with priorities", () => {
    const sepsis = protocolFor("sepsis", [])!;
    const plan = planCoordination(sepsis, "Ramesh Patel (UHID-1)");
    const roles = new Set(plan.tasks.map((t) => t.assigneeRole));
    expect(roles.has("nurse")).toBe(true);
    expect(roles.has("lab")).toBe(true);
    expect(plan.tasks.some((t) => t.priority === "stat")).toBe(true);
    expect(plan.notifications.length).toBe(2);
  });

  it("full flow: alert → approve → tasks materialize in the sink", async () => {
    const created: { title: string; role: string }[] = [];
    const notified: string[] = [];
    const sink: CoordinationSink = {
      async createTasks(tasks) {
        tasks.forEach((t) => created.push({ title: t.title, role: t.assigneeRole }));
        return tasks.length;
      },
      async notify(items) {
        items.forEach((i) => notified.push(i.audience));
        return items.length;
      },
    };
    const hf = protocolFor("cardiac", [])!;
    const res = await executeCoordination(sink, hf, {
      patientId: "p1",
      patientLabel: "Test Patient",
      protocolId: "prot1",
    });
    expect(res.tasks).toBeGreaterThan(0);
    expect(created.length).toBe(res.tasks);
    expect(notified).toContain("attending_physician");
  });
});

describe("PIE Phase 4 — federated learning", () => {
  it("FedAvg weights tenants by sample count", () => {
    const g = federatedAverage(
      "sepsis_early_warning",
      [
        {
          tenantId: "rural",
          modelId: "sepsis_early_warning",
          versionBase: "1.2.0",
          versionNew: "1.2.0",
          weights: { hr_dev: 0.1 },
          samples: 100,
        },
        {
          tenantId: "mumbai",
          modelId: "sepsis_early_warning",
          versionBase: "1.2.0",
          versionNew: "1.2.0",
          weights: { hr_dev: 0.02 },
          samples: 300,
        },
      ],
      "1.2.0",
    );
    expect(g).not.toBeNull();
    // 0.10*(100/400) + 0.02*(300/400) = 0.04
    expect(g!.weights.hr_dev).toBeCloseTo(0.04, 3);
    expect(g!.version).toBe("1.2.1");
    expect(g!.contributingTenants).toBe(2);
  });

  it("PRIVACY: oversized deltas are rejected as possible data leaks", () => {
    expect(
      validateDeltaPrivacy({
        tenantId: "t",
        modelId: "m",
        versionBase: "1",
        versionNew: "1",
        weights: { hr_dev: 0.01 },
        samples: 10,
      }).ok,
    ).toBe(true);
    expect(
      validateDeltaPrivacy({
        tenantId: "t",
        modelId: "m",
        versionBase: "1",
        versionNew: "1",
        weights: { hr_dev: 99 },
        samples: 10,
      }).ok,
    ).toBe(false);
    expect(
      validateDeltaPrivacy({
        tenantId: "t",
        modelId: "m",
        versionBase: "1",
        versionNew: "1",
        weights: {},
        samples: 0,
      }).ok,
    ).toBe(false);
  });

  it("outgoing deltas are clipped + noised; global updates apply bounded", () => {
    const s = sanitizeOutgoingDelta({ hr_dev: 4, temp_dev: -0.4 }, 1.0, 0.01);
    expect(Math.abs(s.hr_dev)).toBeLessThanOrEqual(1.01);
    const local = defaultWeights();
    const g = federatedAverage(
      "m",
      [
        {
          tenantId: "t",
          modelId: "m",
          versionBase: local.version,
          versionNew: local.version,
          weights: { hr_dev: 0.05 },
          samples: 10,
        },
      ],
      local.version,
    )!;
    const updated = applyGlobalUpdate(local, g, 0.5);
    expect(updated.w.hr_dev).toBeCloseTo(local.w.hr_dev + 0.025, 3);
  });
});

describe("PIE Phase 6 — governance", () => {
  it("every assessment explains its WHY with ranked factors", () => {
    const a = stratify(septicState(3)).composite;
    const e = explain(a, "Test Patient");
    expect(e.topFactors.length).toBeGreaterThan(0);
    expect(e.topFactors[0].rank).toBe(1);
    expect(e.summary).toContain(e.topFactors[0].feature.toLowerCase());
    const bars = attributionBars(a.drivers);
    expect(Math.max(...bars.map((b) => Math.abs(b.normalized)))).toBeCloseTo(1, 1);
  });

  it("drift detection fires below baseline − ε", () => {
    const okRun = updateDrift(0.85, 0.86, 0.87);
    expect(okRun.driftDetected).toBe(false);
    const drift = updateDrift(0.85, 0.81, 0.6);
    expect(drift.driftDetected).toBe(true);
    expect(drift.message).toContain("drift");
  });

  it("bias audit enforces the four-fifths rule", () => {
    const fair = biasAudit("gender", { male: 0.3, female: 0.28 });
    expect(fair[0].pass).toBe(true);
    const unfair = biasAudit("gender", { male: 0.5, female: 0.25 });
    expect(unfair[0].pass).toBe(false);
    expect(unfair[0].ratio).toBeCloseTo(0.5, 2);
  });

  it("confidence gate blocks automation below 0.8", () => {
    expect(enforceConfidenceGate(0.79).allowed).toBe(false);
    expect(enforceConfidenceGate(0.81).allowed).toBe(true);
  });

  it("SaMD registry declares Class II, intended use and limitations", () => {
    expect(SAMD_REGISTRY.length).toBeGreaterThanOrEqual(3);
    for (const m of SAMD_REGISTRY) {
      expect(m.samdClass).toBe("Class II SaMD");
      expect(m.intendedUse.length).toBeGreaterThan(20);
      expect(m.limitations.length).toBeGreaterThan(0);
      expect(m.validation.n).toBeGreaterThan(0);
    }
  });
});
