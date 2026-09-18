# Nexura OS — System Architecture

> Current as of the integer-money migration (`20260919000000`). The living,
> path-anchored map — runtime topology, auth planes, AI funnel, demo
> boundaries, verification chains — is [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
> This file is the one-page orientation.

## Overview

Nexura OS is a multi-product healthcare platform: seven staff-facing products,
eight consumer health surfaces, and a shared platform layer. Built on
Next.js 16 (App Router) as **a monolith with modular internals** — chosen
deliberately so every request is debuggable end-to-end without chasing
services.

## Tech stack

| Layer        | Technology                                                  | Rationale                                                               |
| ------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Node runtime)                       | SSR + ISR + 189 API routes in one deployable; Turbopack dev.            |
| Language     | TypeScript 5 (strict)                                       | One type system across UI, API and platform code.                       |
| Database     | Prisma ORM + PostgreSQL 17                                  | System of record: 165 models, 8 applied migrations, FK-indexed.         |
| Coordination | Redis 7                                                     | Distributed rate-limit budget, event-bus relay, PIE sync lease.         |
| Styling      | Tailwind CSS 4 + shadcn/ui (New York)                       | Utility-first + accessible primitives.                                  |
| AI           | `src/lib/openrouter.ts` — OpenRouter → z-ai SDK fallback    | One canonical client; every call consent-gated, metered and attributed. |
| Auth         | JWT sessions + httpOnly cookies (4 planes, see below)       | Revocation-aware; legacy unrevocable path deleted.                      |
| Real-time    | SSE + Redis pub/sub relay                                   | Auth-at-subscribe, per-connection tenant filtering.                     |
| Background   | `NxJob` Postgres-backed queue                               | `FOR UPDATE SKIP LOCKED`, backoff → dead-letter, stale-claim reaper.    |
| Testing      | Vitest (345 tests / 30 files) + 49-check smoke + Playwright | Real Postgres + Redis in CI where honest.                               |

## Request lifecycle

```
Browser ──▶ src/proxy.ts (edge): request id · burst guard 600/min/IP · 13 MB cap
            · CSP/HSTS · edge auth gate on product prefixes
   ▼
withRoute (src/lib/nx/api.ts): rate limit · structured logs · safe JSON 500s
   ▼
guard() → requirePermission (src/lib/nx/session.ts):
revocation-aware session · RBAC matrix · denies · patientInScope ctx
   ▼
Service modules (src/modules/pi-engine · foresight · src/lib/nx/*)
   ▼
Prisma Client (src/lib/db.ts) ──▶ PostgreSQL 17        Redis 7 (coordination only)
```

**Boundary rule:** transactional state in Postgres; ephemeral cross-instance
coordination in Redis; the only in-memory state is documented per-instance
pre-filtering in front of the shared Redis budget.

## Authentication planes

| Plane               | Cookie / credential                   | Verifier               | Revocation            |
| ------------------- | ------------------------------------- | ---------------------- | --------------------- |
| Staff (Hospital OS) | `nx_access` JWT                       | `getSessionFresh`      | `NxSessionRecord`     |
| Portal patient      | `portal_session` service JWT          | `verifyServiceToken`   | DB existence re-check |
| DIY guest           | `diy_guest`                           | `src/lib/diy/auth.ts`  | TTL                   |
| Machine             | API keys · device HMAC · webhook HMAC | timing-safe comparison | DB flag               |

Authentication ≠ authorization: permissions grant the _what_;
`patientInScope` / tenant context enforce the _where_. Patient sessions are
hard-scoped to `linkedPatientId`.

## Data model (165 models, highlights)

- **Hospital OS core (`nx`)** — hospitals, patients, staff, wards/beds,
  appointments, admissions, MAR, orders, NxCharge/NxPayment (integer paise),
  insurance, audit/eventlog (hash-chained), consent ledger, AI usage ledger,
  durable jobs, idempotency keys.
- **Clinic** — clinic, doctors, patients, appointments, visits, Rx, invoices.
- **Pharmacy** — companies, branches, products, batches, sales/purchases
  (integer paise), Schedule H register, near-expiry returns, day closing.
- **Portal** — portal users, blood bookings, phlebotomists, family links,
  self-service consent rows.
- **Connect** — connections, messages, calls, queue.
- **Consumer** — vitals, DIY check sessions, labs, care circle, emergencies.

Conventions: integer minor units for money (paise/cents — no Float money),
append-only ledgers for audit/consent/AI usage, `ON DELETE RESTRICT` on audit
chains, FK columns indexed (integrity-index migration).

## Invariants

1. **Money** — integer paise/cents everywhere; `src/lib/money.ts` is the only
   converter (rupee wire ↔ paise storage); GST = integer math, one rounding.
2. **Concurrency** — races settled in the database: conditional stock
   decrements, partial unique index on active appointments (→ 409),
   compare-and-set MAR, CAS bed lifecycle, atomic discharge.
3. **Idempotency** — claim-then-execute, caller-scoped keys, reuse → 409.
4. **AI** — one funnel (`aiGate` → `openrouter.ts` → `ai-governance.ts`);
   consent withdrawal ⇒ 403; no prompt/completion content stored.
5. **Fail loudly** — demo-only behavior is labelled in the response `source`
   field; missing integration (ABDM, IRP, OTP) returns 501/null, never fakes.

## Scaling path

Phase 1 (current): single Next.js + Postgres + Redis, multi-instance safe
(shared Redis budget, SKIP LOCKED jobs). Phase 2: read replicas + CDN for
static assets. Phase 3: extract AI/billing workers (the queue is already
worker-ready via `NEXURA_JOBS=off` on the web tier + dedicated worker).
Phase 4: multi-region — the event bus's Redis relay is the seam.

## Observability

`/api/health` + `/api/ready`, structured JSON logs with request IDs,
maintenance mode + incident banners, startup env validation
(`assertProductionEnv` refuses to boot half-configured in production),
AI usage rollup at `/api/nx/ai/usage` (`audit.view`-gated).
