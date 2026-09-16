# Nexura OS — Production Status

**Last updated:** 2026-09-16 (backend production-hardening pass: pg-migration-1 → test-coverage-1)
**Audience:** a technical reviewer, investor, or new collaborator opening this repo for the first time.

This document is the single, current source of truth about the production
readiness of this codebase. It replaces two older internal audits
(`CODEBASE_AUDIT.md`, `CHATGPT_CODEBASE_REVIEW.md` — archived under
[`docs/history/`](docs/history/) because they described an earlier state of
the repo and contradicted each other; every stale claim they made is
corrected below with file:line evidence).

---

## What this is

Nexura OS is a healthcare operations platform (Next.js 16 / TypeScript /
Prisma / PostgreSQL / Redis): hospital console, clinic, pharmacy, patient
portal, connect (B2B drug distribution), know-your-health consumer tools,
plus FHIR/HL7 interoperability surfaces. ~560 source files, 187 API routes,
160 Prisma models, 252 passing unit tests.

## Data layer (current)

| Concern | State |
|---|---|
| Provider | **PostgreSQL only** — `prisma/schema.prisma` `provider = "postgresql"`; SQLite is retired from the runtime path |
| Migrations | `prisma/migrations/20260916000000_baseline` (160 tables) + `migration_lock.toml`; apply with `npx prisma migrate deploy` |
| Redis | Required in production — distributed rate limiting, SSE event-bus fan-out, background-sync leases (`src/lib/redis.ts`) |
| JSON columns | Stored as `String` columns by design (portable, documented in schema header); jsonb promotion is a deliberate future decision, not an accident |
| Search semantics | Every user-facing `contains` filter carries `mode: "insensitive"` (34 sites) — SQLite-era case behavior preserved on Postgres |
| Ops tooling | `scripts/db-backup.mjs` (pg_dump -Fc rotation) and `scripts/db-restore-validate.mjs` (restore into a scratch DB + row-count parity) — both live-tested |
| Multi-instance safety | Job claims use `FOR UPDATE SKIP LOCKED` (`src/lib/nx/jobs/runner.ts`); the event bus fan-outs over Redis pub/sub with HMAC re-verification (`src/lib/nx/bus.ts`); PIE sync takes a Redis lease (`src/modules/pi-engine/sync-job.ts`) |

## Where state lives (the honest list)

| Location | Kind | Why it is there |
|---|---|---|
| Postgres (`NxJob`, `NxAuditEvent`, sessions, all domain data) | Durable, cross-instance | The system of record |
| Redis (`nx:rl:*`, `nx:bus`, `nx:lock:*`) | Ephemeral, cross-instance | Rate-limit windows, event fan-out, sync leases |
| `src/lib/db.ts` globalThis | Connection cache | Prisma-recommended pattern; caches the CLIENT, never data — every query hits the shared Postgres |
| `src/lib/nx/bus.ts` conns map | Per-process sockets | SSE handles are sockets on one machine; Redis carries events, not sockets |
| `src/lib/nx/jobs/runner.ts` timer guard | Per-process lifecycle | Each instance SHOULD run the worker loop; the DB claim makes that safe |
| `src/proxy.ts` edge buckets | Per-isolate pre-filter | Edge runtime cannot open TCP to Redis; a burst guard, NOT the authoritative limit — the Redis limiter at the Node layer is |
| `src/lib/nx/api.ts` sync limiter + `src/app/api/portal/auth/route.ts` OTP store | Per-process, **excluded surface** | The portal auth/OTP flow is owned by a collaborator and was deliberately not touched in the hardening pass; migrating its limiter to async Redis semantics without touching the OTP flow is queued behind that handoff |

## Boot & configuration

- `cp .env.example .env` — every variable the app reads is documented there,
  required vs optional marked.
- `src/instrumentation.ts` calls `assertProductionEnv()` at server start:
  production **refuses to boot** without `DATABASE_URL` (postgres scheme),
  `JWT_SECRET` (≥16 chars), `REDIS_URL`. Dev stays forgiving by design.
- `JWT_SECRET` handling predates the hardening pass and already followed the
  same philosophy (`src/lib/auth/jwt.ts` throws in production rather than
  signing with a fallback).

## CI / verification gates

- GitHub Actions: `.github/workflows/ci.yml` — prisma validate + generate,
  typecheck (gated to `src/`), eslint, **vitest (252 tests)**, Postgres +
  Redis service containers, migrations applied against the service DB, boot
  + API smoke suite, secret scan.
- Local equivalents: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`,
  `bash tests/api-smoke.sh`, `bash scripts/deploy-preview.sh` (canonical
  deploy with serve-side verification).

## Corrections to the archived audits

| Archived claim | Reality (evidence) |
|---|---|
| "`tests/` is dead code, shell scripts, not real tests" | False: `tests/unit/**` = 17 vitest files, 252 tests, run in CI; `tests/api-smoke.sh` is wired via `package.json` `test:api` + the CI smoke step |
| "`ignoreBuildErrors: true` is set" | False (and was when written): `next.config.ts` deliberately omits it — see the comment in that file |
| "JWT falls back to an insecure secret" | Fixed: `src/lib/auth/jwt.ts` throws in production when the secret is missing/short |
| "pharmacy/modules2/, shell2.tsx, dead hospital modules need removal" | Already removed before the audit was written; the current OS registry (`src/components/nx/os/registry.tsx`) live-references every module it declares |
| "Schema is SQLite while docs claim Postgres" | Was true at the time — **fixed** in this pass (Postgres + migrations are real now) |
| "No `.env.example`" | Was true — **fixed** (`.env.example` now exists and is coverage-checked) |

## Known limitations (visible, not hidden)

- Demo OTP: with `DEMO_MODE=true` the portal login accepts the demo code
  (`1234`) — an intentional demo affordance, confined to demo mode, owned by
  the auth/OTP collaborator.
- Payment/billing gateway integration is explicitly out of scope of the
  current milestone (collaborator surface).
- Email delivery prints to the server log (`EMAIL_TRANSPORT=console`) — the
  integration point for an SMTP/provider.
- Read-replica routing (`DB_READ_URL`) is plumbed but routes to the primary
  until replica wiring lands; the code documents this.
- The edge middleware security headers ship in a deliberately permissive
  posture for the sandboxed preview iframe; tightening notes are inline in
  `src/proxy.ts`.

## Deliberately out of scope of the hardening pass

Product UI/UX, business logic, and the collaborator-owned auth/OTP and
payment surfaces were not modified. The pass changed infrastructure,
datastore, state topology, configuration, repo hygiene, and tests only.
