/* ============================================================
 * PIE — Public API barrel
 * The engine ships as one importable intelligence layer.
 * ============================================================ */

// Phase 1 — Life Stream ingestion
export * from "./types";
export * from "./ingest/data-ingestion";
export * from "./ingest/nlp-notes";
export * from "./ingest/bio-signals";
export * from "./ingest/sdoh";
export * from "./ingest/adherence";
export * from "./graph/patient-graph";

// Phase 2 — Living Twin
export * from "./twin/digital-twin";
export * from "./twin/series";
export * from "./twin/risk";
export * from "./twin/counterfactual";

// Phase 3 — Pre-Emptive Protocols
export * from "./protocols/knowledge-base";
export * from "./protocols/generator";
export * from "./protocols/coordination";

// Phase 4 — Federated Learning
export * from "./federation/federated";

// Phase 6 — Governance
export * from "./governance/explain";
export * from "./governance/drift";

// Orchestration + persistence
export * from "./engine";
