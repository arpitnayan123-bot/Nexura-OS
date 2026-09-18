<div align="center">

# Nexura OS — Multi-Product Healthcare Platform

**A production-grade healthcare operating ecosystem: seven staff-facing products, eight consumer health surfaces, and a shared platform layer — 189 API routes, 165 Postgres models, 345 unit tests.**

Built on Next.js 16 with a real, auditable backend. Dark, cinematic, command-center interfaces for clinicians, nurses, pharmacists, administrators, operations teams, patients and executives.

</div>

<div align="center">

[![CI](https://github.com/arpitnayan123-bot/Nexura-OS/actions/workflows/ci.yml/badge.svg)](https://github.com/arpitnayan123-bot/Nexura-OS/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/arpitnayan123-bot/Nexura-OS?logo=github&label=release)](https://github.com/arpitnayan123-bot/Nexura-OS/releases)
![Tests](https://img.shields.io/badge/tests-345%20passing-2EA043?logo=vitest&logoColor=white)
![API routes](https://img.shields.io/badge/API%20routes-189-0969DA)
![Data models](https://img.shields.io/badge/Prisma%20models-165-444DB4?logo=prisma&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-0969DA.svg)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-2EA043.svg)](#contributing)

  <br/>

[The demo](#the-demo--a-30-second-tour) · [Products](#the-products) · [Platform](#the-platform-layer-shared-by-every-product) · [Backend](#the-backend--whats-actually-implemented) · [Quick start](#quick-start) · [Ship it](#ship-your-own-instance) · [Quality gates](#quality-gates--the-lock-chain) · [Docs](#documentation) · [Contributing](#contributing)

  <br/>

<a href="https://preview-7f3bab5c-5dbf-45f9-8222-047951c49f1c.space-z.ai/"><img src="https://img.shields.io/badge/Live_demo-open_the_platform-DC382D?logo=safari&logoColor=white" alt="Live demo — open the platform" height="40" /></a>&nbsp;&nbsp;<a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farpitnayan123-bot%2FNexura-OS&env=DATABASE_URL%2CJWT_SECRET%2CREDIS_URL&project-name=nexura-os&repository-name=Nexura-OS"><img src="https://vercel.com/button" alt="Deploy with Vercel" height="40" /></a>&nbsp;&nbsp;<a href="#2--docker-one-command"><img src="https://img.shields.io/badge/Docker-compose%20up%20--build-2496ED?logo=docker&logoColor=white" alt="Docker compose" height="28" /></a>&nbsp;&nbsp;<a href="#ship-your-own-instance"><img src="https://img.shields.io/badge/self--host-standalone%20build-2EA043" alt="Self-host" height="28" /></a>

</div>

<div align="center">
  <img src="docs/screenshots/hero-banner.png" alt="Nexura OS — a calmer operating system for your health. 189 API routes, 165 Postgres models, 345 tests, 15 surfaces." width="100%" />
</div>

**Stack:** Next.js 16 (App Router, Turbopack) · TypeScript (strict, zero suppressions) · Tailwind 4 + shadcn/ui · Prisma + PostgreSQL (165 models) · Redis (distributed rate limiting, event bus, sync leases) · JWT session auth (HttpOnly cookies) · SSE real-time · zod validation · Vitest (345 tests) + Playwright.

> **Evaluating the codebase?** Start with [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) — the current, single source of truth on production readiness.

---

## Table of contents

- [The demo — a 30-second tour](#the-demo--a-30-second-tour)
- [The products](#the-products) — Hospital OS · Clinic · Pharmacia · Portal · Know Your Health · Global · Connect · consumer surfaces
- [The platform layer](#the-platform-layer-shared-by-every-product) — auth, RBAC, AI governance, money integrity, real-time
- [The backend — what's actually implemented](#the-backend--whats-actually-implemented)
- [Quick start](#quick-start) (demo credentials included)
- [Ship your own instance](#ship-your-own-instance) — Vercel one-click · Docker · any PaaS
- [Quality gates & the lock chain](#quality-gates--the-lock-chain)
- [Documentation](#documentation)
- [Repository layout](#repository-layout)
- [Compliance posture](#compliance-posture-read-this)
- [Contributing](#contributing) · [Contributors](#contributors) · [License](#license)

---

## The demo — a 30-second tour

Eleven surfaces, one platform. No mockups — every frame below is a live route in this repo.

**Running live right now:** the published platform preview serves this exact codebase at **[preview-7f3bab5c-5dbf-45f9-8222-047951c49f1c.space-z.ai](https://preview-7f3bab5c-5dbf-45f9-8222-047951c49f1c.space-z.ai/)** — same routes, same demo logins (password `Demo@12345`, staff PIN `2468`). Prefer clicking over cloning? Start there.

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

## The Products

Every product below is a first-class surface in this repo — **not a mockup**. Each runs on the shared platform layer with real auth, RBAC scoping, audit trails and the same money/AI governance rules.

### 🏥 Hospital OS — the flagship

A full hospital operating system: boot sequence, login, workspaces, window manager, dock, launcher, ⌘K palette, app switcher, lock screen, Files & Console system apps, and **23 registered apps**.

<div align="center">
  <img src="docs/screenshots/hospital-command-center.png" alt="Hospital OS Command Center — live census, bed lifecycle, ED, operating rooms, critical alerts" width="840" />
</div>

- **Command Center** — live census, bed-lifecycle map across 8 wards, ED pressure, OR schedule, critical-alert escalation with acknowledgement SLAs, flow-bottleneck detection, audited activity feed
- **Patient Records** — universal records with care timeline, consents, MAR, and per-patient access history

<div align="center">
  <img src="docs/screenshots/hospital-patient-records.png" alt="Hospital OS Patient Records — 24 patients with diagnoses, allergies and UHIDs" width="840" />
</div>

- **Also inside:** Work Queue · Crisis Radar · Operating Rooms · Emergency · Beds & Rooms (8-state lifecycle) · Scheduling with waitlist & conflict detection · Care Communication · Pharmacy with MAR/allergy guard · Laboratory with verify + critical escalation · Revenue Cycle · Inventory & Procurement · Staff Operations · Analytics · tamper-evident Audit Trail · Administration with the permission matrix · Automations · AI-assisted workspaces

### 🩺 Nexura Clinic

Simple Clinic OS for outpatient practices — the whole practice on one screen.

- **Today's Queue** — live appointment flow with status chips (done · no-show · waiting), per-doctor filters and one-tap consult start
- **Encounters** — voice SOAP (AI) with draft→sign discipline, drug autocomplete with interaction guard, ABHA lookup (simulated outside demo mode)
- **Also inside:** Prescriptions · Billing with integer-GST math (paise-exact) · public booking page · Reports · patients, appointments and pricing all on real API routes

<div align="center">
  <img src="docs/screenshots/clinic.png" alt="Nexura Clinic — Dr. Rao Family Clinic with today's queue" width="840" />
</div>

### 💊 Nexura Pharmacia

AI-Powered Pharmacy OS — built for Indian pharmacies, not adapted to them.

- **Billing-first POS** — voice billing, prescription OCR, GST e-invoice payloads; Schedule-H checks are applied at billing time, not audited after
- **Inventory that thinks** — batch/expiry tracking with near-expiry warnings, reorder guardrails, natural-language AI query over stock, predictive analytics
- **Also inside:** Purchases & supplier payments with atomic settlement · online medicine orders with Rx verification · Schedule-H / NPPA / CDSCO compliance register · curated India medicine reference (brand, salt, HSN) maintained in-platform

<div align="center">
  <img src="docs/screenshots/pharmacy-inventory.png" alt="Nexura Pharmacia — inventory with batches, Schedule H badges, near-expiry warnings" width="840" />
</div>

### 🔐 Patient Portal

Patients' own window: unified records and timeline, appointments, AI assistant and report interpretation, blood tests at home — and a **Privacy tab** where patients grant/withdraw their DPDP consents themselves (append-only ledger, revocation enforced end-to-end).

<div align="center">
  <img src="docs/screenshots/portal-dashboard.png" alt="Patient Portal — unified health view with insights and care timeline" width="840" />
</div>

### 🧠 Know Your Health

Consumer AI health hub with **15 tools**: symptom checker, disease risk, lab analyzer, BP analyzer, food scan, derma scan, x-ray reader, diet planner, medication interaction, mental wellness, sleep quality, diabetes care, women's care, Ayurveda, health quiz — all server-side AI with honest "educational, not a diagnosis" framing.

<div align="center">
  <img src="docs/screenshots/know-your-health.png" alt="Know Your Health — 15 AI tools hub" width="840" />
</div>

### ✈️ Nexura Global

Medical tourism desk — destination hospitals, procedure catalog with integer USD/INR quotes, cost estimates (surgeon/room/nursing breakdown), inquiries, billed totals.

<div align="center">
  <img src="docs/screenshots/global.png" alt="Nexura Global — medical tourism desk" width="840" />
</div>

### 💬 Nexura Connect

Care communication: channels, mentions, receipts, critical alerts across the care circle.

<div align="center">
  <img src="docs/screenshots/connect.png" alt="Nexura Connect — care communication" width="840" />
</div>

### Consumer & public surfaces

| Surface                | Route                                                                          | What it is                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nexura Care Circle** | `/care`                                                                        | One circle, every generation — family care coordination across generations                                                                                 |
| **Nexura Vitals**      | `/vitals`                                                                      | Your body, in real time — vitals capture and visualization                                                                                                 |
| **Nexura DIY**         | `/diy`                                                                         | Calm wellness roadmap with explicit safety guardrails (unit-tested: unsafe requests get routed to professionals, not plans)                                |
| **Nexura Predictive**  | `/predictive`                                                                  | Health Foresight engine — domain risk models, red-flag detection, foresight workspace (dedicated unit-test suite: domains / engine / redflags / workspace) |
| **Nexura Labs**        | `/labs`                                                                        | Diagnostics, decoded — patient-friendly lab test explorer                                                                                                  |
| **Nexura Emergency**   | `/emergency`                                                                   | Seconds, respected — emergency guidance surface                                                                                                            |
| **Pi engine**          | rendered via widgets                                                           | Protocol intelligence: protocol cards, risk badges, digital-twin simulator (unit-tested engine)                                                            |
| **Site & marketing**   | `/`, `/pricing`, `/compliance`, `/investors`, `/founder`, `/privacy`, `/terms` | Honest-CTA marketing site, compliance posture, investor deck, founder page                                                                                 |

<div align="center">
  <table>
    <tr>
      <td align="center" width="33%"><img src="docs/screenshots/predictive.png" alt="Nexura Predictive — Health Foresight" width="100%" /><sub><b>Nexura Predictive</b> — Health Foresight engine</sub></td>
      <td align="center" width="33%"><img src="docs/screenshots/care-circle.png" alt="Nexura Care Circle" width="100%" /><sub><b>Nexura Care Circle</b> — family care coordination</sub></td>
      <td align="center" width="33%"><img src="docs/screenshots/diy.png" alt="Nexura DIY" width="100%" /><sub><b>Nexura DIY</b> — calm wellness roadmap</sub></td>
    </tr>
  </table>
</div>

## The Platform Layer (shared by every product)

- **Auth suite** — email+password & staff-code+PIN, TOTP MFA, progressive lockout, revocable sessions (per-device + all), password reset, email verification, break-glass emergency access, audited logins; separate signed portal-token sessions for patients; transactional email via a real SMTP transport (`src/lib/mailer.ts`, console transport in demo)
- **RBAC as data** — 20 roles → 36 permissions, hospital/department/patient scoping, explicit allow/deny grants with TTL, delegations, permission matrix UI
- **AI governance** — every AI call flows through a single funnel (`callOR`): capability-labelled (30+ call sites), metered to an append-only ledger (tokens + integer micro-USD cost, honest `tokenSource`/`costSource` separation — provider-reported vs estimated, never guessed silently), **attributed to the verified caller** per request via AsyncLocalStorage (null = system call, stated honestly), and gated by consent — DPDP consent with latest-event-wins resolution means a withdrawn consent produces a real 403, not a no-op
- **Money integrity** — every money column schema-wide is an integer minor unit (paise or cents); `src/lib/money.ts` is the canonical boundary (rupee wire / paise storage, USD cents for tourism) with exact conversions and no Float money anywhere; integer GST math and quote math throughout
- **Rate limiting** — default limiter on every `withRoute` API route: in-process pre-filter absorbs bursts, and when `REDIS_URL` is configured the authoritative budget is consumed from Redis so horizontally scaled instances share one limit (fail-closed on Redis errors)
- **Real-time** — SSE stream with auth-at-subscribe, reconnect, dedupe; live notifications, critical-lab alerts, urgent messages
- **Durable jobs** — Postgres-backed queue (`FOR UPDATE SKIP LOCKED` claiming, dedupe, stale-claim reaper, self-healing chain, retention purge), booted from instrumentation with an env kill switch
- **Observability** — `/api/health`, `/api/ready`, structured JSON logs, request IDs, maintenance mode + incident banners, startup env validation
- **Auditability** — tamper-evident (hash-chained) audit trail, append-only consent ledger, AI usage ledger queryable per capability/provider/user (`/api/nx/ai/usage`, `audit.view`-gated)
- **Ops** — Dockerfile + compose, GitHub Actions CI (`.github/workflows/ci.yml`), OpenAPI 3.1 at `/api/nx/openapi`, deploy-preview verification script, DB backup/restore + validation scripts, idempotent demo seeds

## The Backend — what's actually implemented

Nothing on this list is "designed in chat" — it is code in the tree, running against Postgres + Redis:

| Layer             | Reality in the repo                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API routes        | **189 route handlers** across `/api/nx` (Hospital OS core), `/api/clinic`, `/api/pharmacy`, `/api/portal`, `/api/connect`, `/api/know-your-health`, `/api/diy`, `/api/global` and friends — the overwhelming majority execute real Prisma queries behind RBAC/ABAC guards |
| Data              | **165 Prisma models**, 8 applied migrations (baseline + AI ledger + identity attribution + integer money + telemedicine + integrity indexes + online orders)                                                                                                              |
| Platform services | JWT auth (bcrypt(12), token-family separation, lazy secret resolution), session revocation, ABAC engine, hash-chained audit, Redis rate limiting, durable job queue, idempotency keys (claim-then-execute)                                                                |
| AI surface        | 30+ capability-labelled AI call sites through one governance funnel: per-IP rate limits, consent enforcement, response-shape validation, metering + identity attribution                                                                                                  |
| Tests             | **345 unit tests / 30 files** (real Postgres + Redis where honest: job queue, rate limiter, security, permissions, consent, money) + 49-check API smoke suite + Playwright e2e                                                                                            |

**Honest boundaries (fail loudly, never fake):** ABDM/ABHA lookup returns 501 outside demo mode until the real registry is wired; IRN for e-invoices is issued by the IRP portal, so it stays `null` until that integration; SMS/WhatsApp OTP delivery needs a provider account (email goes through the SMTP mailer now); the clinic's cohort matcher reports "too few visits" instead of inventing statistics. Every demo-only behavior is labelled in the response `source` field.

## Quick start

```bash
cp .env.example .env        # fill in DATABASE_URL / JWT_SECRET / REDIS_URL
npm install                 # deps (bun also works)
npx prisma migrate deploy   # apply schema (PostgreSQL required)
npm run seed:suite          # complete demo dataset — base hospital, staff, pharmacy, clinic, all surfaces
npm run dev                 # http://localhost:3000
```

| Command                                                                       | What it does                                                                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`                                                                 | Dev server on :3000 (guardian wrapper)                                                       |
| `npm run dev:real`                                                            | Plain `next dev` on :3000                                                                    |
| `npm run typecheck`                                                           | `tsc --noEmit` gate (src must be clean)                                                      |
| `npm run lint`                                                                | ESLint                                                                                       |
| `npm run test`                                                                | Vitest unit suite (345 tests, 30 files — incl. real-DB tests that clean up after themselves) |
| `npm run test:api`                                                            | API smoke suite, 49 checks (needs dev server running)                                        |
| `npm run test:e2e`                                                            | Playwright                                                                                   |
| `npm run db:migrate` / `db:migrate:deploy`                                    | Apply Prisma migrations                                                                      |
| `npm run db:generate` / `db:push` / `db:reset`                                | Client gen / schema push / reset                                                             |
| `npm run seed:demo` / `seed:nx` / `seed:hospital` / `seed:all` / `seed:suite` | Demo seeds (`seed:suite` = everything, fresh-DB safe)                                        |
| `npm run build` / `start`                                                     | Production build / start (`build:standalone` for Docker/self-host)                           |
| `npm run smoke`                                                               | Smoke suite via scripts                                                                      |

**Demo sign-in:** open `/hospital` → "Explore demo roles" fills credentials → Sign in.
All accounts use password `Demo@12345`; legacy staff-code + PIN `2468` also works.
Full list: [docs/DEMO_CREDENTIALS.md](docs/DEMO_CREDENTIALS.md).

## Ship your own instance

Three supported paths — all running the same code, all gated by the same boot check. The production boot gate (`assertProductionEnv`, wired from `src/instrumentation.ts`) refuses to serve unless `DATABASE_URL`, `JWT_SECRET` and `REDIS_URL` are present and well-formed. That is deliberate: a healthcare platform should never silently boot half-configured. Builds, by contrast, need **no secrets at all** — `next build` completes with every variable masked, verified.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farpitnayan123-bot%2FNexura-OS&env=DATABASE_URL%2CJWT_SECRET%2CREDIS_URL&project-name=nexura-os&repository-name=Nexura-OS)

**Step-by-step walkthrough** — click-by-click, free tiers, ~15 minutes to a live URL: [docs/DEPLOY_WALKTHROUGH.md](docs/DEPLOY_WALKTHROUGH.md)

### 1 · Vercel (one click)

The button forks the repo into your workspace and prompts for the three variables. Pair it with a hosted Postgres (Neon, Vercel Postgres or Supabase) and Upstash Redis — both available from the Vercel **Storage** tab. Vercel auto-detects **bun** from `bun.lock` and runs `prisma generate` + `next build` (see `vercel.json`: `bom1` region, 60s function budget). One step from your machine initializes the database schema:

```bash
DATABASE_URL="postgresql://…your-neon-or-vercel-pg-url…" npx prisma migrate deploy
DATABASE_URL="…same url…" npm run seed:suite        # complete demo dataset — 21 staff, patients, pharmacy, clinic, all surfaces
```

Sign in at `https://your-deployment.vercel.app/hospital` → "Explore demo roles".

### 2 · Docker (one command)

The stack pairs the app (multi-stage image, non-root, healthchecked) with Postgres 17 and Redis 7 and a persistent `pg-data` volume:

```bash
docker compose up --build -d
docker compose exec app npx prisma migrate deploy          # apply schema inside the container
DATABASE_URL=postgresql://nexura:nexura-local-only@localhost:5432/nexura npm run seed:suite
```

### 3 · Any PaaS / self-host

`npm run build` (platform-neutral: prisma generate + next build) or `npm run build:standalone` (self-host packaging: static + public copied into `.next/standalone`), then `npx prisma migrate deploy` as a release-gate step. Rollback, backups and the deployment checklist live in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md).

| Variable          | Required | Purpose                                                                                                                                        |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | **yes**  | Postgres 17 — Neon / Vercel Postgres / Supabase / your own. Accepted schemes: `postgres://`, `postgresql://`, `prisma+postgres://` (pgbouncer) |
| `JWT_SECRET`      | **yes**  | `openssl rand -hex 32` (≥ 16 chars). Runtime-only — never used at build time                                                                   |
| `REDIS_URL`       | **yes**  | Distributed rate limiting (`nx:rl:*`), SSE event bus (`nx:bus`), sync leases. Upstash works                                                    |
| `DEMO_MODE`       | no       | Demo affordances: synthetic ABDM lookup, demo OTP code, demo quick-login. Secure default `false` — never enable on real patient data           |
| `EMAIL_TRANSPORT` | no       | `console` (prints OTP/reset links to server log — demo default) or `smtp` (real mail via nodemailer)                                           |

## Quality gates & the lock chain

Six gates are run fresh at every lock point: `prisma validate` · `tsc --noEmit` · `eslint` · `vitest run` · `tests/api-smoke.sh` (49 checks against a live server) · `scripts/deploy-preview.sh` (must print `DEPLOY VERIFIED`).

Current status at `main`: **all six green** — prisma OK · tsc 0 · eslint 0 · vitest 345/345 · smoke 49/49 · DEPLOY VERIFIED.

Tagged, gate-verified lock points (the audit trail):

| Tag                                | Commit    | What was locked                                                                                                        |
| ---------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `hardening-locked-final`           | `e28dfa5` | 20-phase refactor + hardening pass                                                                                     |
| `money-paise-locked-final`         | `ee94cba` | Legacy money Float → integer paise (45 cols / 18 models), canonical money boundary, integer GST                        |
| `consent-selfservice-locked-final` | `179912a` | AI cost/token metering + portal consent self-service with enforced revocation                                          |
| `deferred-closeouts-locked-final`  | `59de443` | Distributed route rate limiting, per-request AI identity attribution, tourism integer money — deferred backlog emptied |

## Documentation

Root: [API.md](API.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [BUSINESS.md](BUSINESS.md) · [COMPLIANCE.md](COMPLIANCE.md) · [DEPLOYMENT.md](DEPLOYMENT.md) · [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) · [PITCH.md](PITCH.md) · [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) · [ROADMAP.md](ROADMAP.md)

| Doc                                                          | Contents                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                 | System design, layers, data flow, honest capability statements |
| [docs/DATABASE.md](docs/DATABASE.md)                         | Schema map, conventions, retention                             |
| [docs/DATABASE-OPERATIONS.md](docs/DATABASE-OPERATIONS.md)   | Backup, restore, validation procedures                         |
| [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md)             | Auth flows, sessions, MFA, break-glass                         |
| [docs/AUTHORIZATION_MATRIX.md](docs/AUTHORIZATION_MATRIX.md) | Full role → permission matrix                                  |
| [docs/NEXURA_INTEGRATION.md](docs/NEXURA_INTEGRATION.md)     | Platform contracts & adapters                                  |
| [docs/API.md](API.md)                                        | API reference (also `/api/nx/openapi`)                         |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                     | Deploy, env, rollback, backups, Vercel                         |
| [docs/DEPLOY_WALKTHROUGH.md](docs/DEPLOY_WALKTHROUGH.md)     | Click-by-click guide: Vercel + Neon + Upstash, $0, ~15 min     |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)                   | Every environment variable                                     |
| [docs/SECURITY.md](docs/SECURITY.md)                         | Controls + what's still required                               |
| [docs/TESTING.md](docs/TESTING.md)                           | Test strategy + how to run                                     |
| [docs/DEMO_CREDENTIALS.md](docs/DEMO_CREDENTIALS.md)         | Accounts + what each sees                                      |
| [docs/INCIDENT_RESPONSE.md](docs/INCIDENT_RESPONSE.md)       | Runbook                                                        |
| [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md)       | Honest gaps & integration points                               |
| [docs/GAP-ASSESSMENT.md](docs/GAP-ASSESSMENT.md)             | Gap assessment                                                 |
| [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) | Go-live checklist                                              |
| [docs/ROADMAP-5-PHASES.md](docs/ROADMAP-5-PHASES.md)         | Phased roadmap                                                 |
| [docs/WHITEPAPER.md](docs/WHITEPAPER.md)                     | Platform whitepaper                                            |

## Repository layout

```
src/app/            one route tree per product (hospital, clinic, pharmacy,
                    portal, connect, know-your-health, global) + consumer
                    surfaces (care, vitals, diy, predictive, labs, emergency)
                    + site pages (pricing, compliance, investors, founder)
src/app/api/        version-routed APIs under /api/nx + per-product routes
                    (189 route handlers)
src/components/     per-product UI + shared nx platform components + ui kit
src/lib/            platform layer: auth, nx/api (withRoute+guard), money.ts,
                    consent.ts, ai-usage.ts, ai-actor.ts, rate-limit.ts,
                    redis.ts, openrouter.ts, mailer.ts, portal-session.ts,
                    logger, env
prisma/             schema (165 models) + 8 applied migrations
tests/              30 unit test files (345 tests, real-DB where honest) +
                    api-smoke.sh (49 checks) + Playwright e2e
scripts/            deploy-preview, api-smoke, db-backup/restore, guardians,
                    seeds, codemods
docs/               the full documentation set (table above) + screenshots/
```

## Compliance posture (read this)

This codebase implements **technical controls** — auditability, access control, encryption in transit (TLS at the hosting layer), lockout, session revocation, immutability of signed records, DPDP consent self-service with enforced revocation, integer money integrity, AI usage attribution. It does **NOT** by itself make you HIPAA/ABHA/GDPR/DPDP-compliant: organizational policies, BAAs, formal risk assessments, hosting controls and certification remain your responsibility. See [docs/SECURITY.md](docs/SECURITY.md) and [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).

## Contributing

PRs are welcome — especially on the honest-boundary integrations listed in [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) (ABDM/ABHA registry, IRP e-invoicing, SMS/WhatsApp OTP providers).

1. Fork → branch from `main`
2. `cp .env.example .env` and run the [quick start](#quick-start)
3. Keep the gates green: `npm run typecheck && npm run lint && npm run test`
4. New API surface? Add a smoke check in `tests/api-smoke.sh` — CI enforces the full chain (typecheck · lint · migrations · 345 unit tests against real Postgres + Redis · 49-check smoke · standalone build)
5. Run `npm run format` (Prettier) before committing — the repo is Prettier-formatted via [.prettierrc.json](.prettierrc.json)
6. Open the PR — the [CI workflow](.github/workflows/ci.yml) runs the whole gate chain on every push, and the [PR template](.github/pull_request_template.md) keeps the honesty checklist in view

Questions, self-hosting help, or integration ideas? Ask in
[Discussions](https://github.com/arpitnayan123-bot/Nexura-OS/discussions).

Good first issues: documentation gaps, seed-data richness, accessibility passes on consumer surfaces.

## Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/arpitnayan123-bot">
        <img src="https://avatars.githubusercontent.com/u/281837164?v=4" width="84" alt="arpitnayan123-bot" style="border-radius: 50%;"/><br/>
        <sub><b>arpitnayan123-bot</b></sub><br/>
        <sub>creator & maintainer</sub>
      </a>
    </td>
  </tr>
</table>

[![GitHub contributors](https://img.shields.io/github/contributors/arpitnayan123-bot/Nexura-OS?label=contributors)](https://github.com/arpitnayan123-bot/Nexura-OS/graphs/contributors)
[![GitHub stars](https://img.shields.io/github/stars/arpitnayan123-bot/Nexura-OS?label=stars&logo=github)](https://github.com/arpitnayan123-bot/Nexura-OS/stargazers)

<a href="https://star-history.com/#arpitnayan123-bot/Nexura-OS&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=arpitnayan123-bot/Nexura-OS&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=arpitnayan123-bot/Nexura-OS&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=arpitnayan123-bot/Nexura-OS&type=Date" width="480" />
 </picture>
</a>

## License

Released under the [MIT License](LICENSE) — with a healthcare notice: the code implements technical controls, but compliance certifications (HIPAA / GDPR / DPDP / ABDM) remain the operator's responsibility. See [docs/SECURITY.md](docs/SECURITY.md).

<div align="center">
  <sub><b>Nexura OS</b> — a calmer operating system for your health.<br/>
  <a href="#nexura-os--multi-product-healthcare-platform">back to top ↑</a></sub>
</div>
