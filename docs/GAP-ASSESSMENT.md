# Nexura Hospital OS — Chief Future Architect Gap Assessment

Date: 2026-09-10 · Baseline: commit `f4afd73` · Gates at assessment: tsc 0 · eslint clean · vitest 47/47 · smoke 30/30

## Scope of assessment

The platform today is a browser-native hospital operating system: Next.js 16 App Router standalone build, 107 Prisma models on SQLite, a desktop-shell UX (window manager, dock, launcher, ⌘K palette, notification center, themes), 23 installable OS apps, ~40 `/api/nx/*` routes with a dual-envelope contract, JWT httpOnly sessions, RBAC-as-data (role assignments + permission grants + delegation + break-glass), TOTP MFA plumbing, hash-chained audit, deterministic automation engine, SSE bus with per-user caps and channel privacy, rate limiting, idempotency keys, and AI calls funneled through a guard (`ai-guard`) with interaction logging. A prior hardening round (`f2640bc`) closed IDOR holes, added global rate limits, per-window error boundaries, code splitting, and CI.

This document inventories what stands between the current prototype and a market-ready, scalable product for Indian and international deployments, including blind spots that are not yet visible in day-to-day demos.

## 1. Database scalability & reliability — GAP: HIGH

SQLite in file mode is single-writer; enterprise concurrency (hundreds of concurrent clinicians, night batch jobs, analytics scans) will saturate it. There is no connection-pooling configuration layer, no read/write separation story, no backup rotation, no point-in-time recovery, and no restore validation. Prisma abstracts the dialect but the codebase assumes `file:` URLs and SQLite quirks (e.g., JSON-in-String columns are fine on both, but transaction behavior differs).

**Blind spots:** no long-running query budget, no slow-query telemetry, no migration rehearsal against a second dialect, seeds assume single hospital.

## 2. Multi-tenancy — GAP: HIGH

The data model is hospital-scoped (`hospitalId` on every Nx model) but there is no **Tenant** aggregate above hospitals: no tenant branding, no per-tenant module activation, no custom domains, no tenant-scoped partner access. Platform operators cannot onboard a hospital group or an NGO network without code changes. UI has zero tenancy surface.

**Blind spots:** cross-tenant leakage through global searches, per-tenant rate limits, tenant-level feature flags vs existing global `NxFeatureFlag`.

## 3. Interoperability — GAP: HIGH (adoption blocker for large hospitals)

All entities are internal JSON. Large hospitals run HIS/LIS/PACS systems that speak **HL7 v2** and **FHIR R4**; imaging requires a **DICOM** story. Without FHIR resources (Patient, Encounter, Observation, MedicationRequest) and a CapabilityStatement, enterprise procurement will disqualify the product. No inbound webhook contract for LIS/PACS to push structured results; no outbound webhook dispatcher with signing/retries.

## 4. AI transparency & governance — GAP: HIGH (regulatory exposure)

`NxAIInteraction` logs inputs/outputs, but there is no **confidence score**, no **prompt/model version tracking**, no **consent flag** per patient, no human-override/correction feedback loop, no per-feature confidence thresholds with fail-safe fallback, no daily AI performance report. Under EU AI Act / India DPDP and upcoming CDSCO SaMD guidance, this is a legal gap.

## 5. Security beyond RBAC — GAP: MEDIUM-HIGH

RBAC-as-data + break-glass + TOTP exist. Missing: **ABAC** (ward visibility, patient-assignment scope, department restriction, time-windowed access during shift handover), **step-up verification for privileged actions** (billing approval, medication verification — PIN re-auth exists at login only), session **idle timeout/rotation/remote logout** (sessions are recorded but not lifecycle-enforced end-to-end), **signed SSE notifications** (any injected frame could spoof an alert), PHI redaction in logs.

## 6. Clinical workflow rigor — GAP: MEDIUM-HIGH

Work queues and automation rules exist, but there is no **clinical pathway engine** (e.g., sepsis bundle, discharge checklist as executable DSL), no **escalation tree** (alerts escalate by level/time to on-call chains), no **two-step digital signature on prescriptions** (DPCO/narcotics expects signer + verifier), no pathway-skip prevention.

## 7. Observability — GAP: MEDIUM

Structured logs with request IDs exist; missing module-level health aggregation for the command center/notification/automation services, SSE client status monitoring and graceful reconnection semantics, alert runbooks, and a security posture dashboard (dependency vulns, threat-scan results, posture score) surfaced to leadership.

## 8. Accessibility / i18n / multi-device — GAP: MEDIUM

Keyboard access and labeled fields landed recently, but no systematic ARIA audit, no reduced-motion support, no **tablet/kiosk modes** for ward devices, and **no localization** beyond English — India deployments need Hindi + regional languages (Tamil, Telugu, Gujarati, Marathi) with localized date/time and legal notices.

## 9. Offline & edge — GAP: HIGH for rural India

No PWA manifest, no service worker, no offline read caching, no write buffer. Rural facilities lose connectivity for hours; triage and prescription capture must keep working and flush when online.

## 10. Compliance & regulatory — GAP: MEDIUM-HIGH

`NxConsent` exists; missing consent dashboard UX, retention policy engine, PHI export/erasure support (DPDP rights), and NABH/ISO/CBHI certification tooling that generates audit-ready documentation.

## 11. Collaboration & EHR versioning — GAP: MEDIUM

`NxNoteVersion` covers note versioning; missing collaborative annotations on the journey timeline, tracked co-authored SBAR edits, and decision logs.

## 12. Futureproofing (blind spots) — GAP: STRATEGIC

- **Decentralized identity**: patients have no portable, patient-owned identity (W3C Verifiable Credentials / ABDM Health ID alignment).
- **Immutable anchoring**: audit chain is hash-linked but not periodically Merkle-anchored into verifiable "blocks" a third party can check.
- **Smart-contract-style insurance**: claims are passive records; milestone-linked settlement state machines cut fraud and reconciliation cost.
- **Wearables/IoT**: no ingestion pipeline for consumer devices feeding remote monitoring.
- **Digital twin**: no chronic-care simulation for outcome projection.
- **Genomics**: no vault or risk profiling.
- **Plugin extensibility**: third-party AI/diagnostic tools require source-code changes.
- **Event sourcing**: command center aggregates are computed, not projected from an event log, limiting replay/audit/performance work.

## Priority ranking (correctness > usability > performance > maintainability)

| P | Area | Rationale |
|---|------|-----------|
| P0 | Tenancy, DB portability, FHIR/HL7, ABAC+step-up, pathway/escalation/signing | Adoption + safety blockers |
| P1 | AI governance, offline/PWA, observability, compliance tooling, webhooks | Regulatory + reliability |
| P2 | i18n, a11y, tablet/kiosk, collaboration, posture dashboard | Market readiness |
| P3 | VC identity, Merkle anchoring, settlement, wearables, twin, genomics, plugins, event sourcing | Differentiation / futureproofing (PoC-grade now, productionized per roadmap) |

All remediation in this cycle is additive and backward compatible: new models, new routes, feature-flagged or conditional behaviors, no breaking contract changes (see `docs/ROADMAP-5-PHASES.md`).
