# Nexura OS — Multi-Product Healthcare Platform

A production-grade healthcare operating ecosystem: **seven staff-facing products, eight consumer health surfaces, and a shared platform layer** — built on Next.js 16 with a real, auditable backend. Dark, cinematic, command-center interface for clinicians, nurses, pharmacists, administrators, operations teams, patients and executives.

**Stack:** Next.js 16 (App Router, Turbopack) · TypeScript (strict, zero suppressions) · Tailwind 4 + shadcn/ui · Prisma + PostgreSQL (162 models) · Redis (distributed rate limiting, event bus, sync leases) · JWT session auth (HttpOnly cookies) · SSE real-time · zod validation · Vitest (317 tests) + Playwright.

> **Evaluating the codebase?** Start with [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) — the current, single source of truth on production readiness.

---

## The Products

Every product below is a first-class surface in this repo — not a mockup. Each runs on the shared platform layer with real auth, RBAC scoping, audit trails and the same money/AI governance rules.

### Staff operations

| Product | Route | What it is |
|---|---|---|
| **Hospital OS** | `/hospital` | The flagship: a full hospital operating system — boot sequence, login, workspaces, window manager, dock, launcher, ⌘K palette, app switcher, lock screen, Files & Console system apps, and **23 registered apps** (Command Center, Work Queue, Patient Records with timeline/consents/MAR/access history, Emergency, Scheduling with waitlist & conflict detection, Beds & Rooms with 8-state lifecycle, Care Communication, Pharmacy with MAR/allergy guard/controlled substances, Laboratory with verify + critical escalation, Revenue Cycle, Inventory & Procurement, Staff Operations, Analytics, tamper-evident Audit Trail, Administration with permission matrix, Automations, AI-assisted workspaces) |
| **Nexura Clinic** | `/clinic` | Simple Clinic OS for outpatient practices — queue, encounters, voice SOAP (AI), prescriptions, billing with integer GST math |
| **Nexura Pharmacia** | `/pharmacy` | AI-Powered Pharmacy OS — POS/billing, stock & batches, expiry and reorder guardrails, supplier payments with atomic settlement, voice billing, natural-language AI query over inventory, prescription OCR, e-way threshold checks |
| **Patient Portal** | `/portal` | Patients' own window: records and timeline, appointments, AI assistant and report interpretation, and a **Privacy tab** — patients grant/withdraw their DPDP consents themselves (append-only ledger, revocation enforced end-to-end) |
| **Nexura Connect** | `/connect` | Care communication: channels, mentions, receipts, critical alerts across the care circle |
| **Know Your Health** | `/know-your-health` | Consumer AI health hub with 14 tools: symptom checker, disease risk, lab analyzer, BP analyzer, food scan, derma scan, diet planner, medication interaction, mental wellness, sleep quality, diabetes care, women's care, Ayurveda, health quiz |
| **Nexura Global** | `/global` | Medical tourism desk — destination hospitals, procedure catalog with integer USD/INR quotes, cost estimates (surgeon/room/nursing breakdown), inquiries, billed totals |

### Consumer & public surfaces

| Surface | Route | What it is |
|---|---|---|
| **Nexura Care Circle** | `/care` | One circle, every generation — family care coordination across generations |
| **Nexura Vitals** | `/vitals` | Your body, in real time — vitals capture and visualization |
| **Nexura DIY** | `/diy` | Calm wellness roadmap with explicit safety guardrails (unit-tested: unsafe requests get routed to professionals, not plans) |
| **Nexura Predictive** | `/predictive` | Health Foresight engine — domain risk models, red-flag detection, foresight workspace (dedicated unit-test suite: domains / engine / redflags / workspace) |
| **Nexura Labs** | `/labs` | Diagnostics, decoded — patient-friendly lab test explorer |
| **Nexura Emergency** | `/emergency` | Seconds, respected — emergency guidance surface |
| **Pi engine** | rendered via widgets | Protocol intelligence: protocol cards, risk badges, digital-twin simulator (unit-tested engine) |
| **Site & marketing** | `/`, `/pricing`, `/compliance`, `/investors`, `/founder`, `/privacy`, `/terms` | Honest-CTA marketing site, compliance posture, investor deck, founder page |

## The Platform Layer (shared by every product)

- **Auth suite** — email+password & staff-code+PIN, TOTP MFA, progressive lockout, revocable sessions (per-device + all), password reset, email verification, break-glass emergency access, audited logins; separate signed portal-token sessions for patients
- **RBAC as data** — 20 roles → 36 permissions, hospital/department/patient scoping, explicit allow/deny grants with TTL, delegations, permission matrix UI
- **AI governance** — every AI call flows through a single funnel (`callOR`): capability-labelled (24 call sites), metered to an append-only ledger (tokens + integer micro-USD cost, honest `tokenSource`/`costSource` separation — provider-reported vs estimated, never guessed silently), **attributed to the verified caller** per request via AsyncLocalStorage (null = system call, stated honestly), and gated by consent — DPDP consent with latest-event-wins resolution means a withdrawn consent produces a real 403, not a no-op
- **Money integrity** — every money column schema-wide is an integer minor unit (paise or cents); `src/lib/money.ts` is the canonical boundary (rupee wire / paise storage, USD cents for tourism) with exact conversions and no Float money anywhere; integer GST math and quote math throughout
- **Rate limiting** — default limiter on every `withRoute` API route: in-process pre-filter absorbs bursts, and when `REDIS_URL` is configured the authoritative budget is consumed from Redis so horizontally scaled instances share one limit (fail-closed on Redis errors)
- **Real-time** — SSE stream with auth-at-subscribe, reconnect, dedupe; live notifications, critical-lab alerts, urgent messages
- **Observability** — `/api/health`, `/api/ready`, structured JSON logs, request IDs, maintenance mode + incident banners, startup env validation
- **Auditability** — tamper-evident audit trail, append-only consent ledger, AI usage ledger queryable per capability/provider/user (`/api/nx/ai/usage`, `audit.view`-gated)
- **Ops** — Dockerfile + compose, GitHub Actions CI (`.github/workflows/ci.yml`), OpenAPI 3.1 at `/api/nx/openapi`, deploy-preview verification script, DB backup/restore + validation scripts, idempotent demo seeds

## Quick start

```bash
cp .env.example .env        # fill in DATABASE_URL / JWT_SECRET / REDIS_URL
npm install                 # deps (bun also works)
npx prisma migrate deploy   # apply schema (PostgreSQL required)
bun run seed:demo           # v4 demo dataset (21 staff, patients, MAR, billing, …)
npm run dev                 # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 (guardian wrapper) |
| `npm run dev:real` | Plain `next dev` on :3000 |
| `npm run typecheck` | `tsc --noEmit` gate (src must be clean) |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit suite (317 tests, 27 files — incl. real-DB tests that clean up after themselves) |
| `npm run test:api` | API smoke suite, 49 checks (needs dev server running) |
| `npm run test:e2e` | Playwright |
| `npm run db:migrate` / `db:migrate:deploy` | Apply Prisma migrations |
| `npm run db:generate` / `db:push` / `db:reset` | Client gen / schema push / reset |
| `npm run seed:demo` / `seed:nx` / `seed:hospital` / `seed:all` | Demo seeds (run via bun) |
| `npm run build` / `start` | Production build (standalone) / guardian start |
| `npm run smoke` | Smoke suite via scripts |

**Demo sign-in:** open `/hospital` → "Explore demo roles" fills credentials → Sign in.
All accounts use password `Demo@12345`; legacy staff-code + PIN `2468` also works.
Full list: [docs/DEMO_CREDENTIALS.md](docs/DEMO_CREDENTIALS.md).

## Quality gates & the lock chain

Six gates are run fresh at every lock point: `prisma validate` · `tsc --noEmit` · `eslint` · `vitest run` · `tests/api-smoke.sh` (49 checks against a live server) · `scripts/deploy-preview.sh` (must print `DEPLOY VERIFIED`).

Current status at `main`: **all six green** — prisma OK · tsc 0 · eslint 0 · vitest 317/317 · smoke 49/49 · DEPLOY VERIFIED.

Tagged, gate-verified lock points (the audit trail):

| Tag | Commit | What was locked |
|---|---|---|
| `hardening-locked-final` | `e28dfa5` | 20-phase refactor + hardening pass |
| `money-paise-locked-final` | `ee94cba` | Legacy money Float → integer paise (45 cols / 18 models), canonical money boundary, integer GST |
| `consent-selfservice-locked-final` | `179912a` | AI cost/token metering + portal consent self-service with enforced revocation |
| `deferred-closeouts-locked-final` | `59de443` | Distributed route rate limiting, per-request AI identity attribution, tourism integer money — deferred backlog emptied |

## Documentation

Root: [API.md](API.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [BUSINESS.md](BUSINESS.md) · [COMPLIANCE.md](COMPLIANCE.md) · [DEPLOYMENT.md](DEPLOYMENT.md) · [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) · [PITCH.md](PITCH.md) · [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) · [ROADMAP.md](ROADMAP.md)

| Doc | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, layers, data flow, honest capability statements |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema map, conventions, retention |
| [docs/DATABASE-OPERATIONS.md](docs/DATABASE-OPERATIONS.md) | Backup, restore, validation procedures |
| [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md) | Auth flows, sessions, MFA, break-glass |
| [docs/AUTHORIZATION_MATRIX.md](docs/AUTHORIZATION_MATRIX.md) | Full role → permission matrix |
| [docs/NEXURA_INTEGRATION.md](docs/NEXURA_INTEGRATION.md) | Platform contracts & adapters |
| [docs/API.md](API.md) | API reference (also `/api/nx/openapi`) |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy, env, rollback, backups |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Every environment variable |
| [docs/SECURITY.md](docs/SECURITY.md) | Controls + what's still required |
| [docs/TESTING.md](docs/TESTING.md) | Test strategy + how to run |
| [docs/DEMO_CREDENTIALS.md](docs/DEMO_CREDENTIALS.md) | Accounts + what each sees |
| [docs/INCIDENT_RESPONSE.md](docs/INCIDENT_RESPONSE.md) | Runbook |
| [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) | Honest gaps & integration points |
| [docs/GAP-ASSESSMENT.md](docs/GAP-ASSESSMENT.md) | Gap assessment |
| [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) | Go-live checklist |
| [docs/ROADMAP-5-PHASES.md](docs/ROADMAP-5-PHASES.md) | Phased roadmap |
| [docs/WHITEPAPER.md](docs/WHITEPAPER.md) | Platform whitepaper |

## Repository layout

```
src/app/            one route tree per product (hospital, clinic, pharmacy,
                    portal, connect, know-your-health, global) + consumer
                    surfaces (care, vitals, diy, predictive, labs, emergency)
                    + site pages (pricing, compliance, investors, founder)
src/app/api/        version-routed APIs under /api/nx + per-product routes
src/components/     per-product UI + shared nx platform components + ui kit
src/lib/            platform layer: auth, nx/api (withRoute+guard), money.ts,
                    consent.ts, ai-usage.ts, ai-actor.ts, rate-limit.ts,
                    redis.ts, openrouter.ts, portal-session.ts, logger, env
prisma/             schema (162 models) + applied migrations
tests/              27 unit test files (317 tests, real-DB where honest) +
                    api-smoke.sh (49 checks)
scripts/            deploy-preview, api-smoke, db-backup/restore, guardians,
                    seeds, codemods
docs/               the full documentation set (table above)
```

## Compliance posture (read this)

This codebase implements **technical controls** — auditability, access control, encryption in transit (TLS at the hosting layer), lockout, session revocation, immutability of signed records, DPDP consent self-service with enforced revocation, integer money integrity, AI usage attribution. It does **NOT** by itself make you HIPAA/ABHA/GDPR/DPDP-compliant: organizational policies, BAAs, formal risk assessments, hosting controls and certification remain your responsibility. See [docs/SECURITY.md](docs/SECURITY.md) and [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).

AI cost figures are **accounting estimates from a local price table**, not provider bills; identity attribution is per request, not per human (shared logins share identity). The system states what it knows and labels everything else honestly.
