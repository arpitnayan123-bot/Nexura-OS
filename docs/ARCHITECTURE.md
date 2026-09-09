# Architecture — Nexura Hospital OS

## Layers

```
┌────────────────────────────────────────────────────────────┐
│ Hospital OS shell (client)                                 │
│  boot → login → desktop (workspaces, WM, dock, palette)    │
│  23 registered apps · SSE hook · notification center       │
├────────────────────────────────────────────────────────────┤
│ API layer (Next.js route handlers, all server-side)        │
│  withRoute() wrapper: request-id · logs · rate limit ·     │
│  uniform errors            guard(): RBAC + session + scope │
├────────────────────────────────────────────────────────────┤
│ Domain libraries (src/lib)                                 │
│  session.ts  — RBAC-as-data, effective permissions         │
│  api.ts      — envelopes, pagination, idempotency, CSV     │
│  bus.ts      — in-process pub/sub → SSE fan-out            │
│  audit.ts    — hash-chained tamper-evident events          │
│  totp.ts     — RFC-6238 MFA                                │
│  automations — trigger→steps workflow engine               │
│  nexura/*    — platform provider contracts + local adapters│
├────────────────────────────────────────────────────────────┤
│ Prisma + SQLite (109 tables) — hospital-scoped rows        │
└────────────────────────────────────────────────────────────┘
```

## Request lifecycle

1. `src/proxy.ts` stamps `x-request-id` + security headers.
2. Route handler wraps in `withRoute()` (errors → `{error, detail, meta.requestId}`,
   never stack traces).
3. `guard(req, permission)` verifies JWT → session record (revocation, status) →
   effective permissions (roles + grants + delegations + break-glass, 30s cache)
   → explicit deny check.
4. zod-validated inputs; Prisma queries always include `hospitalId` scope.
5. Mutations write a hash-chained audit event and publish to the realtime bus.

## Real-time

`/api/nx/stream` (SSE): auth-at-subscribe, 25s heartbeat, per-connection seq.
`bus.publish()` filters per subscriber (hospital → roles → users). The client
`useNxStream` handles reconnect with backoff, seq dedupe, and `lastSyncedAt`.
Multi-replica production: swap the in-process emitter for Redis pub/sub behind
the same interface.

## Data flow example — critical lab result

lab verifies → `labs/verify` marks critical → notification to ordering doctor +
command center → critical task created (30-min SLA) → `bus.publish("lab.critical")`
→ SSE → OS toast + notification center + badge refresh. Everything audited.

## Module inventory (registered apps)

Overview: Command Center, Doctor Workspace, Nurse Shift, Work Queue ·
Clinical: Patient Records, Orders & Results, Laboratory, Pharmacy, OR, Emergency ·
Operations: Beds & Rooms, Scheduling, Incidents, Care Communication, Equipment & Supply ·
System: Automations, Analytics, Revenue Cycle, Audit Trail, Administration,
Documents, Console, System Settings.

## Key conventions

- Money: integer paise. Time: UTC storage, IST presentation, `timezone` field on
  appointments. Statuses: explicit state machines with server-validated
  transitions (422 on illegal moves).
- Deleting clinical/financial records is not allowed anywhere — use status
  transitions (cancelled/refunded) which remain audited.
