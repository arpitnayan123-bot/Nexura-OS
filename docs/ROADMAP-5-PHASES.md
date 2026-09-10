# Nexura Hospital OS — Strategic Roadmap (12–18 months, 5 phases)

Companion to `docs/GAP-ASSESSMENT.md`. Every phase ships end-to-end demonstrable increments on the existing stack (`/api/nx/*`, seed chain, worklog), is backward compatible, and lands behind env switches/feature flags where behavior changes.

Guiding rule: **nothing breaks existing tenants; every enhancement is additive, optional, or conditionally enabled.**

---

## Phase 1 — Foundation: Tenancy, Data Portability, Trust (Months 0–3)

**Business goals:** onboard hospital groups (not single hospitals); survive enterprise procurement reviews; make deployments reversible and safe.
**Technical scope:** `NxTenant` aggregate + hospital→tenant binding; tenant management APIs + Governance UI; tenant-scoped partner API gateway (API keys, scopes, per-key rate limits); DB abstraction layer (Postgres-ready provider config, pooling, read/write split plan) with SQLite preserved for dev/seeds; backup rotation + restore validation scripts; FHIR R4 read APIs (Patient, Encounter, Observation, MedicationRequest) + CapabilityStatement; HL7 v2 (ADT^A01/A08, ORU^R01) inbound parse + outbound serialize; webhook endpoints with HMAC signing + retries; DICOM study registry with external viewer abstraction.
**Security/Regulatory impact:** tenant isolation prevents cross-hospital leakage (DPDP); FHIR/HL7 enables legal interoperability; gateway keys introduce first partner trust boundary; backups = data durability due diligence.
**QA plan:** vitest for FHIR mapping, HL7 parser round-trip, gateway key auth + rate limit, tenancy scoping; smoke additions per new route family; migration rehearsal documented.
**Demo plan:** create tenant → bind hospital → issue partner key → pull FHIR Patient bundle → push HL7 ORU result into a patient record → watch webhook fire — all live on seeded Indian data.

## Phase 2 — Zero-Trust Clinical Security & Workflow Rigor (Months 3–6)

**Business goals:** pass hospital infosec audits; eliminate preventable clinical-safety incidents; DPCO-ready pharmacy.
**Technical scope:** ABAC engine (department, ward, patient-assignment, time-window policies) enforced in sensitive routes; step-up verification (TOTP/PIN) for billing approval + medication verification; session idle timeout, rotation, remote logout; HMAC-signed SSE notifications; PHI redaction in logs; consent dashboard; retention policy engine + job; NABH/ISO/CBHI compliance tracker; clinical pathway DSL (sepsis, discharge, chest-pain) + runner; alert escalation tree; e-prescription digital signature with 2-step verification.
**Security/Regulatory impact:** ABAC shrinks blast radius of stolen sessions; step-up satisfies "two-person integrity" for high-risk actions; signed alerts stop notification spoofing; redaction minimizes PHI exposure in logs (DPDP data minimization).
**QA plan:** unit tests for ABAC matrix edges (shift boundaries, ward transfer), escalation resolution, pathway DSL execution, signature verify; regression suite for access control; smoke asserts denials.
**Demo plan:** night-shift nurse loses ward scope after shift end; billing approval demands step-up; unsigned prescription cannot dispense; sepsis pathway auto-creates tasks with reasons; critical result escalates L0→L1→L2 with audit trail.

## Phase 3 — Governance-Grade AI & Offline Edge (Months 6–9)

**Business goals:** defensible AI; rural-readiness; leadership trust dashboards.
**Technical scope:** AI telemetry upgrade (confidence, consent flags, prompt/model versions); HITL feedback loop (corrections logged → daily AI performance report: accuracy/overrides/confidence); per-feature confidence thresholds with fail-safe to human; automation explainability + self-driving mode with human checkpoints; i18n engine (en/hi/ta/te/gu/mr) with locale formats; ARIA/reduced-motion pass; tablet + kiosk modes; PWA + service worker read caching; IndexedDB write buffer with auto-flush; offline triage + prescription capture; SSE heartbeat/reconnect/buffering; module health aggregation + runbooks; security posture dashboard.
**Security/Regulatory impact:** AI governance aligns with EU AI Act transparency + DPDP consent; offline queue preserves data integrity during outages; posture dashboard feeds management review (ISO 27001 §9.3).
**QA plan:** fail-safe unit tests (threshold boundary), i18n fallback tests, SW cache unit tests where feasible, smoke for AI report + offline sync endpoints.
**Demo plan:** switch UI to தமிழ்; go offline in devtools → capture triage → reconnect → buffer flushes; AI suggestion below threshold routes to clinician; daily AI report shows override rate per feature.

## Phase 4 — Patient-Centric & Flagship Differentiators (Months 9–14)

**Business goals:** patient-owned data story; payer integration; continuous monitoring; genomic medicine pilot.
**Technical scope:** W3C Verifiable Credential issuance/verification for patient identity (ABDM-aligned); Merkle-block anchoring of the audit chain (verifiable third-party proofs); milestone-linked insurance settlement state machine; wearable ingestion + insights; digital twin chronic-care projection; telehealth protocol layer (doctor-on-demand routing algorithm, low-bandwidth mode, e-consent + e-sign cross-border); genomic vault + risk profiling in Know Your Health; adaptive symptom decision trees + synthetic patient simulations; predicted care journey with custom nodes + outcome tracking.
**Security/Regulatory impact:** VCs give patients data ownership (consent scopes); Merkle anchoring gives external verifiability without storing PHI on-chain (no PHI leaves premises); genomic vault designed for GDPR/HIPAA/DPDP (explicit consent, vault-ref only).
**QA plan:** VC sign/verify property tests, settlement machine transition tests, twin projection sanity bounds, decision-tree determinism, telehealth routing fairness tests.
**Demo plan:** issue patient VC → verify at desk; anchor audit block → verify external proof; claim settles automatically on treatment milestones; Apple-Health-style sample ingests → risk insight appears in patient record.

## Phase 5 — Platformization: HaaS, Plugins, Event Backbone (Months 14–18)

**Business goals:** productized hospital-in-a-box; ecosystem extensibility; ultra-scale audit.
**Technical scope:** Hospital-as-a-Service templates (multi-specialty, single-doctor clinic, NGO/rural, Tier-2 nursing home) + onboarding wizard; containerized deployment (Docker/compose with Postgres profile, managed-cloud story); plugin system (manifests, permission grants, sandboxed loaders, registry UI) with 2 sample plugins; event sourcing/CQRS-lite backbone for Command Center + Scheduling; partner API gateway separation; OpenAPI v2 + hosted sandbox; whitepaper + investor demo playback script.
**Security/Regulatory impact:** plugins run under explicit permission grants (no silent capability escalation); event log gives replayable audit; template deployments inherit hardened defaults.
**QA plan:** template application idempotency tests, plugin manifest validation tests, event log sequence tests, full e2e scenario playback.
**Demo plan:** apply "NGO rural" template to a fresh hospital → localized, module-scoped OS boots in minutes; enable sample plugin; replay a day of command-center events from the event log at a pitch event.

---

## Deliverable checklist at month 12 (from the brief)

- [x] SQLite→Postgres migration path implemented and tested with demo data (provider layer + runbook + restore validation)
- [x] Multi-tenant configuration panels + isolated scoping
- [x] FHIR-compliant APIs for Patient/Encounter/MedicationRequest/Observation
- [x] Updated OpenAPI spec (v2, includes all new route families)
- [x] Blockchain-linked (Merkle-block) audit trail PoC
- [x] Production-deployable Docker image story (Dockerfile + compose + registry docs)
- [x] End-to-end clinical scenario playback on seeded Indian hospital data
- [x] White-label + language customization story (tenant branding + 6 languages)
- [x] Risk-stratified AI recommendation system with explainability + feedback
- [x] 5-phase roadmap with business/spec/security/QA/demo per phase (this document)

## Known limitations after Phase 1–5 implementation in this cycle

Real PostgreSQL cluster, live HL7 interface engines, on-chain anchoring, genomic lab integrations, consumer-device vendor APIs and regulatory certifications are operational integrations: the codebase ships working abstractions, contracts, PoCs and seed-backed demos; productionizing them is vendor/infra work tracked in Phase notes above. AI features degrade gracefully to deterministic logic without external keys.
