<div align="center">

# Nexura OS

**A connected healthcare operating system for hospitals, clinics, pharmacies, and patients.**

Built on Next.js 16 with a real, auditable backend. 190 API routes, 165 Postgres models, 344 unit tests, and a unified platform layer connecting 15 distinct healthcare surfaces.

</div>

<div align="center">

[![CI](https://github.com/arpitnayan123-bot/Nexura-OS/actions/workflows/ci.yml/badge.svg)](https://github.com/arpitnayan123-bot/Nexura-OS/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/arpitnayan123-bot/Nexura-OS?logo=github&label=release)](https://github.com/arpitnayan123-bot/Nexura-OS/releases)
![Tests](https://img.shields.io/badge/tests-344%20passing-2EA043?logo=vitest&logoColor=white)
![API routes](https://img.shields.io/badge/API%20routes-190-0969DA)
![Data models](https://img.shields.io/badge/Prisma%20models-165-444DB4?logo=prisma&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-0969DA.svg)](LICENSE)

  <br/>

<a href="https://n13xb70qvnr0-d.space-z.ai/"><img src="https://img.shields.io/badge/Live_demo-open_the_platform-DC382D?logo=safari&logoColor=white" alt="Live demo — open the platform" height="40" /></a>&nbsp;&nbsp;<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farpitnayan123-bot%2FNexura-OS&env=DATABASE_URL%2CJWT_SECRET%2CREDIS_URL&project-name=nexura-os&repository-name=Nexura-OS"><img src="https://vercel.com/button" alt="Deploy with Vercel" height="40" /></a>&nbsp;&nbsp;<a href="#deployment"><img src="https://img.shields.io/badge/Docker-compose%20up%20--build-2496ED?logo=docker&logoColor=white" alt="Docker compose" height="28" /></a>

</div>

<div align="center">
  <img src="docs/screenshots/hero-banner.png" alt="Nexura OS — a calmer operating system for your health. 190 API routes, 165 Postgres models, 344 tests, 15 surfaces." width="100%" />
</div>

> **Evaluating the codebase?** Start with [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) — the current, single source of truth on production readiness.

---

## 1. The Healthcare Problem

Healthcare is severely fragmented. Hospitals, clinics, independent doctors, patients, pharmacies, and diagnostic laboratories often operate entirely disconnected systems. Administrative systems do not talk to patient-facing applications; AI tools operate in isolated silos without clinical context; and patient records are scattered across different platforms.

Nexura OS is designed to address this fragmentation by connecting these healthcare workflows through a common, auditable platform layer. It is not just an AI healthcare app—it is an entire ecosystem where intelligence is a native capability built into a broader healthcare operating structure.

---

## 2. What is Nexura OS?

Nexura OS is a multi-product healthcare ecosystem. It provides distinct product surfaces for different users (clinicians, pharmacists, patients, operations teams) that all share the same centralized platform infrastructure.

The distinction is clear:

- **Product Surfaces**: Hospital OS, Clinic OS, Pharmacy, Patient Portal, and consumer applications.
- **Shared Platform Infrastructure**: Identity, authentication, authorization (RBAC/ABAC), patient scope, audit trails, AI governance, background jobs, money integrity, and API observability.

---

## 3. The Nexura Ecosystem

Nexura OS is composed of several integrated products, all running from this repository and interacting with the same underlying platform core.

| Product              | Purpose                                                                                                                  | Primary Users                                |
| :------------------- | :----------------------------------------------------------------------------------------------------------------------- | :------------------------------------------- |
| **Hospital OS**      | Flagship command center with workspaces, bed-lifecycle maps, universal patient records, ED flow, and 23 integrated apps. | Hospital Administrators, Nurses, Specialists |
| **Clinic OS**        | Outpatient practice management with live queue, AI-assisted voice SOAP, and billing.                                     | Independent Doctors, Clinic Staff            |
| **Pharmacy**         | AI-powered inventory, voice billing, prescription OCR, and Schedule H / CDSCO compliance checking.                       | Pharmacists, Cashiers                        |
| **Patient Portal**   | Unified patient records, timelines, AI report interpretation, and DPDP consent self-service.                             | Patients                                     |
| **Know Your Health** | 15 AI consumer tools (symptom checker, disease risk, lab analyzer, diet planner) focused on health intelligence.         | Patients, General Consumers                  |
| **Global**           | Medical tourism desk with procedure catalogs, cost estimates (USD/INR), and care journey management.                     | Tourism Coordinators, International Patients |
| **Connect**          | Care communication channels, critical alerts, and cross-team notifications.                                              | Care Circle, Medical Teams                   |

<div align="center">
  <img src="docs/screenshots/hospital-command-center.png" alt="Hospital OS Command Center" width="840" /><br/><br/>
  <img src="docs/screenshots/hospital-patient-records.png" alt="Hospital OS Patient Records" width="840" /><br/><br/>
  <img src="docs/screenshots/clinic.png" alt="Nexura Clinic" width="840" /><br/><br/>
  <img src="docs/screenshots/pharmacy-inventory.png" alt="Nexura Pharmacia" width="840" /><br/><br/>
  <img src="docs/screenshots/portal-dashboard.png" alt="Patient Portal" width="840" /><br/><br/>
  <img src="docs/screenshots/know-your-health.png" alt="Know Your Health" width="840" /><br/><br/>
  <img src="docs/screenshots/global.png" alt="Nexura Global" width="840" /><br/><br/>
  <img src="docs/screenshots/connect.png" alt="Nexura Connect" width="840" />
</div>

<br/>

**Consumer & Public Surfaces:**

<div align="center">
  <table>
    <tr>
      <td align="center" width="33%"><img src="docs/screenshots/predictive.png" alt="Nexura Predictive" width="100%" /><sub><b>Nexura Predictive</b></sub></td>
      <td align="center" width="33%"><img src="docs/screenshots/care-circle.png" alt="Nexura Care Circle" width="100%" /><sub><b>Nexura Care Circle</b></sub></td>
      <td align="center" width="33%"><img src="docs/screenshots/diy.png" alt="Nexura DIY" width="100%" /><sub><b>Nexura DIY</b></sub></td>
    </tr>
  </table>
</div>

---

## 4. System at a Glance

The codebase scale and complexity as of the latest commit:

- **190 API Routes**: Covering the core platform and all product modules.
- **165 Database Models**: Covering complex relationships, integer money columns, and audit trails.
- **344 Unit Tests**: Comprehensive test suite over 22 files using real PostgreSQL and Redis.
- **8 Prisma Migrations**: Ordered, robust history with strict constraints.
- **30+ AI Call Sites**: All funneled through a central governance layer.

---

## 5. Product Demo

Every product mentioned above is a first-class surface in this repository.

**Running live right now:** the published platform preview serves this exact codebase at **[n13xb70qvnr0-d.space-z.ai](https://n13xb70qvnr0-d.space-z.ai/)** — same routes, same demo logins (password `Demo@12345`, staff PIN `2468`).

<div align="center">
  <img src="docs/screenshots/nexura-demo.gif" alt="Nexura OS product tour: homepage, Hospital OS command center, patient records, clinic, pharmacy inventory, Care Circle, patient portal, Know Your Health, Predictive, Global, Connect" width="840" />
</div>

<details>
<summary><b>Scroll the entire homepage</b> — the full marketing site, top to bottom</summary>
<br/>
<div align="center">
  <img src="docs/screenshots/homepage-full.png" alt="Full Nexura OS homepage scroll" width="840" />
</div>
</details>

---

## 6. Platform Core

The shared platform core is the engine of Nexura OS. It ensures consistency, security, and scalability across all product surfaces.

- **Authentication & Identity**: JWT session auth with HttpOnly cookies, distinct verifiers for staff vs. patients, session revocation, and device tracking.
- **RBAC & ABAC**: Granular role-based access control combined with attribute-based patient/department scoping.
- **Auditability**: Tamper-evident, hash-chained audit trails (`NxEventLog`) using `ON DELETE RESTRICT`.
- **AI Governance**: A central gateway metering usage, enforcing consent, tracking identity, and validating structure.
- **Money Integrity**: Deterministic integer-paise logic; no Float values in transactional data.
- **Durable Jobs**: PostgreSQL-backed job queue with `FOR UPDATE SKIP LOCKED` claiming and stale-claim reaping.
- **Observability**: Rate limiting, request IDs (`x-request-id`), structured JSON logging, and edge burst guards.

---

## 7. Architecture Diagram

```text
Users / Healthcare Organizations
               ↓
     Nexura Product Surfaces
   (Hospital, Clinic, Pharmacy, Portal)
               ↓
    Nexura Platform Core (Edge & API Layer)
      [ x-request-id / rate limits / auth gate ]
               ↓
Identity / Authorization / Audit / AI Governance /
Events / Jobs / Money Integrity / Interoperability
               ↓
    Data + Infrastructure + External Integrations
   [ PostgreSQL 17 / Redis 7 / OpenRouter / Next.js ]
```

---

## 8. Product Architecture vs Technical Architecture

**Product Architecture:** The capabilities exposed to the user. Includes the Hospital OS command center, Clinic queue, Pharmacy POS, Patient Portal, Care Circle, Predictive Intelligence, and Connect.

**Technical Architecture:** The underlying infrastructure.

- **Frontend**: Next.js 16 App Router (Turbopack), Tailwind 4, shadcn/ui.
- **Backend**: Next.js API Routes, heavily modularized service files, strict idempotency keys.
- **Data Access**: Prisma Client singleton.
- **System of Record**: PostgreSQL 17.
- **Ephemeral State**: Redis 7 for rate limits, event bus relay, and sync leases.
- **AI Gateway**: OpenRouter + direct z-ai SDK fallback.

---

## 9. AI / Generative AI Architecture

Nexura is an AI-native healthcare platform. Intelligence is structured as a controlled capability, not a random frontend call.

```text
User / Clinical Workflow
          ↓
    AI Capability
          ↓
  AI Governance (Consent enforced: LATEST-EVENT-WINS)
          ↓
    Authorization (Actor Attribution via AsyncLocalStorage)
          ↓
  Model Gateway (OpenRouter / Fallbacks)
          ↓
 Validation / Structured Output (JSON contracts)
          ↓
 Audit / Observability / Metering (Token & Micro-USD ledger)
          ↓
      Application
```

- **Metering**: Cost and token accounting tracked by `tokenSource` and `costSource`.
- **Identity**: Every request records the verified actor. Null is only used for true system calls.
- **No Prompt Storage**: Prompt content is not stored in the database, only operational metadata.

---

## 10. Generative AI Capabilities

Nexura OS includes numerous AI-assisted features integrated directly into clinical and consumer workflows:

- **Implemented**: Voice SOAP notes, prescription OCR, natural-language inventory query, symptom triage (demo), lab report interpretation.
- **Implemented (Consumer Tools)**: 15 specific tools including disease risk, BP analyzer, sleep quality, and diet planner.
- **Integration-dependent**: Some clinical fallback models and multimodal deep scans rely on external provider readiness.

---

## 11. AI Governance

AI operations follow a strict, auditable governance model:

- **Consent Enforcement**: AI usage requires DPDP consent. Withdrawing consent in the Patient Portal immediately revokes access, resulting in a real `403 ai_consent_required` block.
- **Capability-Level Controls**: Each AI call site is labeled.
- **HITL Loop**: Human-in-the-loop loops available for overrides and feedback (`NxAiFeedback`).
- **Thresholds**: Per-hospital thresholds for allowed, human-fallback, or blocked requests.

---

## 12. Healthcare Intelligence

Intelligence in Nexura OS is framed carefully:

- **Decision Support & Information**: Lab report decoding, AI-assisted charting, and risk trajectory models.
- **No Automated Diagnosis**: Nexura OS consumer tools operate strictly with "educational, not a diagnosis" framing. Triage features are explicitly labeled as keyword-triage, not clinical triage engines.

---

## 13. Healthcare Interoperability

Nexura OS is architected for integration, rather than being a closed ecosystem.

- **Implemented boundaries**: Support for HL7/FHIR interfaces exists in the architecture (`src/lib/nx/fhir.ts`, `hl7.ts`).
- **Integration-dependent**: ABDM/ABHA identity lookup is synthetically mocked in demo mode and clearly returns `501 Not Implemented` outside demo mode until actual registries are wired.

---

## 14. Security & Trust

Security is treated as infrastructure:

- **Authentication**: JWT session auth with HttpOnly cookies; legacy `/api/auth` login paths were deliberately removed.
- **Authorization boundaries**: Central `requirePermission` enforcer. `patientInScope` checks cross-family boundaries.
- **Environment Validation**: Boot sequence refuses to start production if secrets (PostgreSQL, JWT, Redis) are missing.
- **IDOR prevention**: Tenant boundaries and hospital contexts enforced failing-closed across the system.

---

## 15. Healthcare Data / Privacy / Compliance Posture

- **Architecture designed with consideration for**: DPDP consent tracking, append-only consent ledgers, granular auditability, and data minimization.
- **Controls currently implemented**: Technical controls such as immutable signed records, TLS support, session revocation, and explicit self-service consent workflows.
- **Certification / Approval not yet claimed**: The codebase provides the technical foundation but does **NOT** by itself make an organization HIPAA, DPDP, or ABDM compliant.

---

## 16. Engineering Principles

- **Fail Closed**: The system defaults to denying access if a condition (such as hospital context) cannot be verified.
- **Explicit Authorization**: Enforced by the `guard()` wrapper.
- **Idempotent Mutations**: Uses `NxIdempotency` (claim-then-execute) to prevent double-charging or duplicate writes.
- **Deterministic Money Handling**: Transactions settle in PostgreSQL with integer paise and cents, never floating-point decimals.
- **No Silent Fake Integrations**: Missing credentials or offline services do not simulate success in production.

---

## 17. Production Reality / Implementation Status

This repository represents a sophisticated, active development state:

- **Implemented**: Next.js App Router API, PostgreSQL schemas, RBAC, API rate limiting, AI governance funnel, deterministic money handling, test suite, and hospital/clinic/pharmacy frontend capabilities.
- **Production-ready / validated**: The technical boundaries, authentication, authorization, database concurrency, and CI testing pipeline.
- **Integration-dependent**: SMS/OTP providers, actual ABDM/ABHA registries, IRP/e-invoicing, and real payment gateways.
- **In active development**: Deep API endpoints for edge-case billing, read-replica routing (plumbed, but routes to primary).

See `PRODUCTION_STATUS.md` for full implementation details.

---

## 18. Honest Boundaries

Nexura OS operates with strict honest boundaries. The system will **fail loudly** rather than faking integration in a production environment:

- Unavailable external systems are represented honestly.
- Demo adapters (`DEMO_MODE=true`) are clearly distinguishable from production integrations and explicitly gated.
- Seed scripts refuse to run in `NODE_ENV=production` without explicit overrides.

---

## 19. Technology Stack

- **Application**: Next.js 16 (App Router), React, Tailwind CSS 4, shadcn/ui.
- **Backend / API**: Node.js, TypeScript.
- **Database**: PostgreSQL 17 (System of Record), Prisma (Data Access).
- **Real-time / Infrastructure**: Redis 7 (Distributed limiter, SSE bus, Jobs).
- **AI**: OpenRouter, z-ai SDK.
- **Testing**: Vitest, Playwright.
- **Deployment**: Vercel, Docker Compose.

---

## 20. Technology Decisions

- **Modular Monolith**: One Next.js 16 process allows any request to be debugged end-to-end without chasing microservices.
- **PostgreSQL as System of Record**: Ensures ACID compliance for transactional data (e.g., pharmacy inventory decrements).
- **Centralized AI Gateway**: Prevents uncontrolled prompt spraying; enables global metering, fallback routing, and DPDP consent enforcement.
- **Integer Money**: Eliminates floating-point rounding errors in GST calculations and financial ledgers.

---

## 21. API Architecture

- **Organization**: 190 routes under `src/app/api/**` (e.g., `/api/nx`, `/api/clinic`, `/api/pharmacy`).
- **Wrapper**: Legacy handlers have been wrapped in `withRoute` to enforce request IDs, latency logs, safe JSON 500s, and rate limits.
- **Rate Limiting**: Distributed rate-limit budget managed via Redis.
- **Documentation**: OpenAPI 3.1 available at `/api/nx/openapi`.

For full details, see the [API documentation](API.md).

---

## 22. Database / Data Architecture

- **System of record**: PostgreSQL.
- **Prisma schema**: `prisma/schema.prisma` contains 165 models.
- **Migrations**: 8 applied migrations (including strict AI ledger additions and integer money migrations).
- **Audit**: `NxEventLog` hash-chains audited events.

---

## 23. Testing / Technical Quality

The codebase is tested and continuously verifiable.

- **Unit Tests**: 344 unit tests across 22 files using real PostgreSQL and Redis datastores.
- **Integration / API Tests**: A 58-check API smoke suite validates live API behaviors.
- **E2E Tests**: Playwright role journeys validate frontend interactions.

<div align="center">
  <img src="https://img.shields.io/badge/tests-344%20passing-2EA043?logo=vitest&logoColor=white" alt="Tests 344 passing" />
</div>

---

## 24. Observability / Reliability

- **Request IDs**: Propagated via `x-request-id` headers for end-to-end tracing.
- **Logging**: Structured JSON errors prevent leaking sensitive internal stack traces to the client.
- **Resilience**: The durable job queue uses exponential backoff and a stale-claim reaper. The AI gateway incorporates a 45-second abort mechanism and model fallbacks.

---

## 25. Project Structure

```text
Nexura-OS/
├── src/
│   ├── app/
│   │   ├── hospital/ clinic/ pharmacy/ portal/ # Product surfaces
│   │   ├── connect/ know-your-health/ global/
│   │   └── api/                        # 190 API routes
│   ├── components/                     # Shared UI & Product-specific trees
│   ├── lib/
│   │   ├── nx/                         # PLATFORM CORE
│   │   │   ├── api.ts                  # withRoute wrapper
│   │   │   ├── session.ts              # auth verification / requirePermission
│   │   │   ├── ai-guard.ts             # AI governance
│   │   │   └── jobs/                   # Durable queue runner
│   │   ├── money.ts                    # Integer paise/cents boundary
│   │   ├── db.ts                       # Prisma singleton
│   │   └── openrouter.ts               # Canonical AI client
│   ├── proxy.ts                        # Edge middleware
│   └── instrumentation.ts              # Boot validation + background workers
├── prisma/
│   ├── schema.prisma                   # 165 models
│   └── migrations/                     # Real, ordered migration history
├── tests/
│   ├── unit/                           # 344 unit tests
│   ├── api-smoke.sh                    # API smoke suite
│   └── e2e/                            # Playwright testing
└── docs/                               # Extensive architecture & deployment docs
```

---

## 26. Quick Start

```bash
cp .env.example .env        # fill in DATABASE_URL / JWT_SECRET / REDIS_URL
npm install                 # install dependencies
npx prisma migrate deploy   # apply schema (PostgreSQL required)
npm run seed:suite          # complete demo dataset
npm run dev                 # Start dev server on http://localhost:3000
```

> **Note**: Seed scripts refuse to run under `NODE_ENV=production` without explicit overrides.

---

## 27. Environment Variables

The `.env.example` file contains all required configurations.

- **Required**: `DATABASE_URL` (PostgreSQL), `REDIS_URL` (Redis 7), `JWT_SECRET` (Secure secret ≥ 16 chars).
- **Optional**: `OPENROUTER_API_KEY` (AI models), `DEMO_MODE` (Controls demo adapters, secure default `false`).

---

## 28. Deployment

Three supported paths:

- **Vercel**: Deploy with one click. Automatic setup for Edge middleware and Serverless functions.
- **Docker**: `docker compose up --build -d` provisions Next.js, Postgres 17, and Redis 7.
- **Self-hosted**: Build via `npm run build:standalone`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for rollback, backup, and release-gate steps.

---

## 29. Documentation Hub

- [API](API.md) - Full API reference.
- [Architecture](docs/ARCHITECTURE.md) - System design and logic flow.
- [Production Status](PRODUCTION_STATUS.md) - Honest review of current implementation state.
- [Deployment](DEPLOYMENT.md) - Environment, Vercel, and Docker guides.
- [Security](docs/SECURITY.md) - Access controls and remaining compliance needs.
- [Roadmap](ROADMAP.md) - Future directions.

---

## 30. Roadmap

Nexura OS is expanding across three fronts:

- **Current Capabilities**: Fortifying the existing core (completed integer-money migrations and AI ledger tracking).
- **Near-term Work**: Bridging the integration-dependent gaps (payment gateways, real OTP providers).
- **Future**: Advanced healthcare interoperability endpoints (FHIR compliance).

For the full detailed plan, view [ROADMAP.md](ROADMAP.md).

---

## 31. Contributing

PRs are welcome—especially around our documented integration limitations.

1. Fork and branch from `main`.
2. Ensure you keep the verification gates green: `npm run typecheck && npm run lint && npm run test`.
3. Format with Prettier before committing.
4. Follow the PR template to maintain our "fail loudly" honesty checklist.

---

## 32. Project Status

**Active development / pre-production**

The architectural foundation (database schema, authentication, API routes, RBAC, CI tests) is robust and heavily tested. However, certain capabilities (like real medical interoperability layers and third-party SMS/Payment providers) remain integration-dependent. See [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) for the exact boundary of what is currently implemented.

---

## 33. Healthcare Safety / Medical Disclaimer

**Nexura OS is a healthcare technology platform.**
Any AI features, risk trajectories, or symptom checkers included in this repository are intended for **decision support and educational purposes only**. They do not constitute an automated medical diagnosis or treatment plan. Implementing organizations are responsible for clinical validation, regulatory compliance, and obtaining appropriate patient consents before deploying to a production environment.

<div align="center">
  <br/>
  <sub><b>Nexura OS</b> — a connected healthcare operating system.<br/>
  <a href="#nexura-os">back to top ↑</a></sub>
</div>
