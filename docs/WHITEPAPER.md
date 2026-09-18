# Nexura Hospital OS — Technical Whitepaper (v5, condensed)

## 1. Thesis

Hospitals do not need another app; they need an operating system. Nexura Hospital OS is the first **browser-native hospital OS**: a windowed, role-aware desktop where every clinical and operational surface is an installable app over a shared real-time kernel (session, permissions, event bus, audit, automation). One URL boots the entire hospital — on a Tier-1 datacenter machine or a ₹10k Android tablet in a district facility.

## 2. Architecture

| Layer        | Implementation                                                                                                                                                            | Property                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Shell        | Next.js 16 App Router + React 19, code-split apps, window manager (zustand kernel)                                                                                        | boots in seconds, zero install, offline-capable (PWA + IndexedDB write buffer) |
| Domain       | 131 Prisma models, dialect-agnostic (SQLite dev / PostgreSQL prod)                                                                                                        | additive migrations, tenant-scoped                                             |
| Contracts    | dual-envelope `/api/nx/*` (ok/error + meta.requestId), OpenAPI v2, FHIR R4 + HL7 v2 + signed webhooks + DICOM registry                                                    | enterprise interoperability without framework lock-in                          |
| Trust        | JWT httpOnly sessions, RBAC-as-data + ABAC policies, step-up MFA, break-glass, hash-chained audit + Merkle block anchoring                                                | every action attributable, tamper-evident, externally verifiable               |
| Intelligence | deterministic automation engine (never AI for safety paths) + AI layer with confidence heuristics, consent gates, per-feature thresholds, human-in-the-loop feedback loop | explainable, governable, regulator-defensible                                  |

## 3. What makes it defensible

1. **OS metaphor, not SaaS grid.** Roles see different operating systems, not dashboards. RBAC filters both modules and data; ABAC narrows by ward, assignment, department and time-of-day. A night-shift nurse and a day-shift nurse genuinely use different machines.
2. **Deterministic-first automation.** Safety-critical flows (critical results, discharge cascades, sepsis bundle) are code, not prompts. AI summarizes, drafts and explains; it cannot act. Every AI output carries confidence, prompt/model version and a threshold verdict — below threshold, a human is the fail-safe.
3. **Interoperability as a first-class citizen.** FHIR R4 read APIs, HL7 v2 ADT/ORU in both directions, HMAC-signed webhooks with retries, DICOM registry with external viewer handoff. Hospitals keep their existing LIS/PACS; Nexura becomes the coordination layer.
4. **Frugal infrastructure.** SQLite→Postgres dialect switch is configuration; backup rotation + restore validation drills ship in-repo; offline write buffer keeps rural facilities working through outages. Designed for India's 4G reality, not just fiber datacenters.
5. **Governance built-in, not bolted-on.** Consent dashboard, retention engine, NABH/ISO metrics computed live from operational data, security posture scoring, and a Governance & Trust Center app that platform operators use daily — the audit evidence is the same data the ward sees.

## 4. Security model (summary)

Sessions: httpOnly JWT + server-side session records (idle timeout by role, remote logout, device labels). Privileged actions (billing approval, medication verification, prescription signing) require **step-up second factors**; DPCO-aligned prescriptions require **two-person integrity** (prescriber + independent verifier). Real-time alerts are **HMAC-signed per hospital** and verified client-side — injected code cannot spoof a critical result. PHI is redacted from structured logs at the logger boundary. Partner access runs through a sandboxed gateway: hashed API keys, scoped reads, per-key rate limits, tenant isolation.

## 5. Validation

Every capability ships with executable proof: unit suites (FHIR/HL7/ABAC/merkle/VC/settlement/decision-tree/redaction/i18n/i18n-fallback), an API smoke matrix (30+ assertions incl. security headers, embeddability, RBAC denials, state-machine rejections), and end-to-end clinical scenario playback on seeded Indian hospital data (23 inpatients, 15-patient OPD queue, ₹3,068 daily revenue, live escalation chains). CI gates: TypeScript strict (0 errors), ESLint clean, vitest, build, smoke.

## 6. Honest limitations

Merkle anchoring currently uses HMAC-based proofs (Ed25519 + public notary anchoring is Phase 5 infra); genomic vault partners, consumer-device vendor APIs, and certification audits are operational integrations — the contracts and abstractions ship today, the vendor paperwork does not. Single-region deployment; multi-region replication is un-exercised.

## 7. Roadmap snapshot

Phase 1 (foundation: tenancy, portability, FHIR/HL7) and Phase 2 (zero-trust clinical security) are implemented in this cycle; Phase 3 (governance-grade AI + offline edge) is implemented; Phase 4 (patient-owned identity, settlement, wearables, twin, genomics) ships as working PoCs; Phase 5 (plugins, event backbone, HaaS templates, hosted sandbox) lands the platform story. Detail: `docs/ROADMAP-5-PHASES.md`.
