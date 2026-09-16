# Nexura Hospital OS v4 — "Foundation"

A production-grade hospital operating ecosystem built on the Nexura OS platform.
Dark, cinematic, command-center interface for clinicians, nurses, administrators,
operations teams, patients and executives — backed by a real, auditable backend.

**Stack:** Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind 4 + shadcn/ui ·
Prisma + PostgreSQL (migrations in `prisma/migrations/`) · Redis (rate limiting, event bus, sync leases) ·
JWT session auth (HttpOnly cookies) · SSE real-time · zod validation · Vitest + Playwright.

> **Evaluating the codebase?** Start with [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) —
> the current, single source of truth on production readiness.

---

## Quick start

```bash
cp .env.example .env        # fill in DATABASE_URL / JWT_SECRET / REDIS_URL
bun install                 # deps
npx prisma migrate deploy   # apply schema (PostgreSQL required)
bun run seed:demo           # v4 demo dataset (21 staff, patients, MAR, billing, …)
bun run dev                 # http://localhost:3000/hospital
```

| Command | What it does |
|---|---|
| `bun run dev` | Dev server on :3000 |
| `bun run typecheck` | `tsc --noEmit` gate (src must be clean) |
| `bun run lint` | ESLint |
| `bun run test` | Vitest unit suite (252 tests) |
| `bun run test:api` | API smoke suite (needs dev server running) |
| `bun run db:migrate` | Apply Prisma migrations |
| `bun run seed:demo` | Idempotent demo seed |
| `bun run build` | Production build (standalone) |

**Demo sign-in:** open `/hospital` → "Explore demo roles" fills credentials → Sign in.
All accounts use password `Demo@12345`; legacy staff-code + PIN `2468` also works.
Full list: [docs/DEMO_CREDENTIALS.md](docs/DEMO_CREDENTIALS.md).

## What's inside

- **Hospital OS desktop** — boot, login, workspaces, window manager, dock, launcher,
  ⌘K palette, app switcher, lock screen, Files & Console system apps
- **23 registered apps** — Command Center, Work Queue, Patient Records (timeline,
  consents, MAR, access history), Emergency, Scheduling (waitlist, conflicts),
  Beds & Rooms (8-state lifecycle), Care Communication (channels, mentions,
  receipts), Pharmacy (MAR, allergy guard, controlled substances), Laboratory
  (verify + critical escalation), Revenue Cycle (charges/payments/refunds/CSV),
  Inventory & Procurement (vendors, POs, stock txns), Staff Operations,
  Analytics (windows, SLA, CSV), Audit Trail (tamper-evident), Administration
  (permission matrix, staff accounts), Automations, AI-assisted workspaces
- **Auth suite** — email+password & staff-code+PIN, TOTP MFA, progressive lockout,
  revocable sessions (per-device + all), password reset, email verification,
  break-glass emergency access, audited logins
- **RBAC as data** — 20 roles → 36 permissions, hospital/department/patient scoping,
  explicit allow/deny grants with TTL, delegations, permission matrix UI
- **Nexura OS integration layer** — typed provider contracts (identity,
  notifications, calendar, tasks, messaging, files, search, audit, automation,
  feature flags) with local adapters; product switcher; cross-product deep links
- **Real-time** — SSE stream with auth-at-subscribe, reconnect, dedupe; live
  notifications, critical-lab alerts, urgent messages
- **Observability** — /api/health, /api/ready, structured JSON logs, request IDs,
  maintenance mode + incident banners, env validation
- **Ops** — Dockerfile + compose, GitHub Actions CI, OpenAPI 3.1 at `/api/nx/openapi`

## Documentation

| Doc | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, layers, data flow |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema map, conventions, retention |
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
| [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) | Go-live checklist |

## Compliance posture (read this)

This codebase implements **technical controls** — auditability, access control,
encryption in transit (TLS at the hosting layer), lockout, session revocation,
immutability of signed records. It does **NOT** by itself make you HIPAA/ABHA/
GDPR-compliant: organizational policies, BAAs, formal risk assessments, hosting
controls and certification remain your responsibility. See
[docs/SECURITY.md](docs/SECURITY.md) and [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md).
