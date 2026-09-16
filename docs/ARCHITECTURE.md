# Nexura OS — Architecture Map

> Living document. Reflects the codebase as of the **arch-\*** hardening pass
> (2026-09-16). Every claim below is anchored to a file path; verify with the
> cited entry points before extending the architecture.

## 1. Runtime topology

```
Browser / Preview
   │  (single origin, same-origin API calls; no CORS surface)
   ▼
src/proxy.ts (edge middleware)
   ├─ request id mint/propagation (x-request-id)
   ├─ edge burst guard: 600 req/min/IP (rightmost-XFF key) + 13 MB body cap
   ├─ security headers (CSP single-sourced, HSTS, nosniff, Referrer-Policy)
   └─ production auth gate on product-surface prefixes
          │  (session cookies verified at the edge: nx_access, portal_session)
          ▼
Next.js 16 App Router (Node runtime)  ── src/app/api/**  (≈187 routes)
          │
          ├── withRoute (src/lib/nx/api.ts) ............. canonical wrapper:
          │     request id · rate limit (300/min/IP, ipOf-keyed) · structured
          │     logs · safe JSON 500s · x-request-id response header
          ├── guard() → requirePermission (src/lib/nx/session.ts)
          │     revocation-aware session · RBAC matrix · denies · ctx scoping
          │     (patientInScope / patient self-scope / department match)
          ├── withProductAuth (src/lib/nx/product-auth.ts)
          │     clinic/pharmacy surfaces; demo principal vs real staff session
          ├── aiGate (src/lib/nx/ai-guard.ts) ........... every LLM route
          ├── connectGate / doctorOnly / connectPartyDenied
          ├── withIdempotency (claim-then-execute, caller-scoped)
          └── requireHospitalContext → fail-closed tenant boundary
                 │
                 ▼
           Service modules (business logic — NOT in route handlers)
           ├─ src/modules/pi-engine/** ....... predictive intelligence engine
           ├─ src/modules/foresight/** ....... foresight engine
           └─ src/lib/nx/{journey,pathway,gateway,webhooks,escalation,
              automations,ai-governance,fhir,hl7,merkle,eventlog,tenant,
              patient-scope}.ts
                 │
                 ▼
           Prisma Client (src/lib/db.ts singleton)
                 │
                 ▼
           PostgreSQL 17 (prisma/migrations/** — real migration history)
```

**Datastores**

| Store | Role |
|---|---|
| PostgreSQL 17 | System of record. 160 models, integer-paise money in the Nx layer, FK-indexed, audit chains `ON DELETE RESTRICT`. |
| Redis 7 | Distributed rate limiter (`src/lib/rate-limit.ts`), event-bus relay (`src/lib/nx/bus.ts`), PIE sync lease. |
| In-process Map | Edge burst guard + per-route default limiter (per-instance pre-filter; with REDIS_URL set the authoritative 300/min/IP budget is consumed from the distributed limiter, so scaled instances share one budget). |

**Boundary rule:** transactional state lives in Postgres; ephemeral
cross-instance coordination lives in Redis; the only in-memory state is
documented per-instance filtering (edge guard, default-route-limiter
pre-filter in front of the shared Redis budget) and the
excluded OTP/login surfaces owned by the payments/auth collaborator
(`src/app/api/portal/auth/route.ts`).

## 2. Authentication planes (one canonical verifier per plane)

| Plane | Cookie | Verifier | Revocation |
|---|---|---|---|
| Staff (Hospital OS) | `nx_access` JWT | `getSessionFresh` (jti + idle budget + user status) | `NxSessionRecord` |
| Portal patient | `portal_session` service JWT | `verifyServiceToken` via `src/lib/portal-session.ts` | DB existence re-check |
| DIY guest | `diy_guest` | `src/lib/diy/auth.ts` | TTL |
| Machine | API keys (`src/lib/nx/gateway.ts`, hashed), device HMAC (`device-keys.ts`), webhook HMAC (`webhooks.ts`, SSRF-guarded) | timing-safe | DB flag |

`verifyToken` rejects cross-family tokens (`type:"refresh"`, `scope:"service"`).
The legacy unrevocable `/api/auth` login path was removed (arch-security-1);
previously issued legacy tokens age out within 30 days and remain accepted by
the transition resolvers.

**Authentication ≠ authorization:** `patient.demographics.view` grants the
*what*; `patientInScope` / `patientInScope(ctx)` in `requirePermission` and the
hard self-scope in `nx/patients/[id]` enforce the *where*. Patient-role
sessions are scoped to `linkedPatientId`.

## 3. AI architecture (as actually implemented)

```
Feature route (aiGate: rate limit + session requirement)
   ▼
src/lib/openrouter.ts — THE canonical AI client
   ├─ runText / runVision ........ JSON-contract outputs (robust parse)
   ├─ runChatText ................ multi-turn passthrough
   ├─ runTextRaw ................. markdown/prose outputs
   ├─ providers: OpenRouter (OPENROUTER_API_KEY) → z-ai SDK fallback
   ├─ 45s abort on the OpenRouter path
   ├─ activeModelId(): the real provider path, reported in telemetry
   └─ EVERY call records an AiUsageLog row (fire-and-forget, never blocks
      or fails the AI call): capability label, provider, tokens, integer
      micro-USD cost, latency, fallback, error
   ▼
src/lib/ai-usage.ts — cost/token accounting (ai-cost-metering-1)
   ├─ tokenSource / costSource tracked SEPARATELY: "provider" (OpenRouter
   │  usage.include reporting) vs "estimated" (char heuristic + local price
   │  table) vs "unknown" (failed calls)
   ├─ price table is CONFIGURATION (approx glm-flash rates) — estimates stay
   │  labelled; no prompt/completion content is ever stored, metadata only
   ├─ per-request identity (ai-identity-1): guard() / portal session set the
   │  verified actor via AsyncLocalStorage (src/lib/ai-actor.ts); rows carry
   │  userId/userRole — null = system/background call, honestly unattributed
   └─ aiUsageSummary(): per-capability/provider/user rollup for /api/nx/ai/usage
   ▼
src/lib/nx/ai-governance.ts — governance for identified-patient AI
   ├─ consent ENFORCED (403 ai_consent_required when not granted; demo posture)
   │    └─ checkAiConsent resolves LATEST-EVENT-WINS over ai_assist/data_share
   │       rows — withdrawal (including portal self-service) revokes immediately
   │       (the pre-selfservice read ignored withdrawn rows: revocation was a no-op)
   ├─ confidenceHeuristic — structured-output completeness, NOT clinical accuracy
   ├─ enforceThreshold — per-hospital ladder: allowed / human_fallback / blocked
   └─ logAiInteraction → NxAIInteraction (redacted output, modelVersion,
      promptVersion, thresholdAction)
   ▼
Consent SELF-SERVICE (consent-selfservice-1): patients view/grant/withdraw
ai_assist, data_share, telemedicine, research consents in the portal
(`GET/POST /api/portal/consent` + the Privacy tab). Append-only NxConsent
ledger rows attributed `self-service:portal (<name>)`; every action audited.
Clinical/financial types (treatment, financial, dhir, genomics) stay
staff-recorded with evidence.
   ▼
HITL loop: NxAiFeedback + /api/nx/ai/report (override rate, fallbacks, blocks)
```

**Honest capability statement:** fallback (OR→SDK) exists; cost/token
accounting exists as an OPERATIONAL ESTIMATE ledger (`AiUsageLog` +
`/api/nx/ai/usage`, audit.view-gated) — provider-reported where OpenRouter
serves the call, char-heuristic estimates otherwise, and not yet a billing
feed. Per-request USER identity IS attributed at request granularity
(verified staff guard or portal token → `userId`/`userRole` on every row;
system/cron rows stay null — attribution is per request, not per human,
and shared logins share identity). ASR/TTS are only available via the
z-ai SDK (documented gap, `pharmacy/voice-bill`); prompt versions are
hand-maintained in `PROMPT_VERSIONS`. The former `src/lib/ai/gateway.ts`
(494-line zero-caller scaffold implying otherwise) was deleted.

## 4. Background work & events

- **NxJob durable queue** (`src/lib/nx/jobs/runner.ts`): Postgres-backed,
  `FOR UPDATE SKIP LOCKED` claim, exponential backoff → dead-letter, 7-day
  retention purge, **stale-claim reaper** (10 min, no attempt penalty). Worker
  boots from `src/instrumentation.ts` in the API process (`NEXURA_JOBS=off` to
  disable). Deployment note: serverless platforms need a cron ping or a
  dedicated worker instance for guaranteed latency; the queue is multi-instance
  safe either way.
- **Event bus** (`src/lib/nx/bus.ts`): local SSE fan-out + HMAC-signed Redis
  pub/sub relay; per-connection tenant filtering; per-user connection cap.
  UI-only consumers today. `automations.fire()` drives webhooks/escalations for
  5 triggers; the `emit()` unification (publish + fire + enqueue) is the
  documented next step.
- **PIE sync**: 5-min interval with Redis `SET NX PX` lease (fail-open,
  idempotent upserts).

## 5. Money, invariants, and concurrency

- Nx layer money: integer paise (`NxCharge`, `NxPayment`, `NxPurchaseOrder`).
  **All money columns are integer paise** (migration
  `20260919000000_money_columns_to_int_paise` converted the legacy
  pharmacy/clinic Float rupee columns; 45 columns across ProductBatch, Sale,
  SaleItem, Purchase(+Item), NearExpiryReturn(+Item), DayClosing,
  SupplierPayment, CustomerAccount, CustomerPayment, HospitalBill,
  InsuranceClaim, ClinicInvoice, HospitalDoctor, ClinicDoctor,
  HospitalMedicine, NxInsuranceContract). Wire contracts still speak RUPEES:
  request payloads accept rupees and responses serialize paise→rupees via
  `src/lib/money.ts` (`rupeeToPaise`/`paiseToRupee`/`gstOnPaise`), so the
  product UI is unchanged. GST math is `gstOnPaise` — integer base, one
  nearest-paise rounding. Tax RATES (cgstRate/sgstRate/gstRate/discountPct)
  remain Float percentages (India has 0.25% slabs; rates are not money).
  Tourism marketing money (estimatedCostUSD/INR, priceUSD) is still Float —
  public-site display data, no transactional writes (documented residual).
- Critical writes are single transactions with in-WHERE guards:
  pharmacy sale (`$transaction` + conditional stock decrement + invoice P2002
  retry), goods receipt (batch-identity upsert), returns, MAR (compare-and-set,
  no double-administration), supply stock (CAS + sufficiency guard), appointment
  booking (partial unique index `(doctorId, date) WHERE active` + 409), clinic
  booking accept (claim-flip with rollback), bed lifecycle/reserve (CAS),
  discharge (atomic admission+bed release), payments (atomic bill recompute).
- Idempotency: `NxIdempotency` claim-then-execute; unique key is the
  serialization point; keys are caller-scoped (`callerId`), payloads hashed,
  reuse → 409.

## 6. Demo / production boundaries

| Surface | Posture |
|---|---|
| `DEMO_MODE` (src/lib/env.ts) | Secure default OFF; prod-with-demo warns at boot; `assertProductionEnv` fails loudly on missing Postgres/JWT/Redis. |
| Clinic/pharmacy/portal quick-login | Demo principal only under DEMO_MODE; real staff sessions otherwise. |
| `clinic/abha` synthetic ABDM lookup | 501 outside DEMO_MODE (fabricated identities never reach clinicians in production). |
| `clinic/symptom-triage` | Labeled `demo-keyword-triage (not a clinical triage engine)`. |
| Seeds (`scripts/seed-*.ts`) | Refuse under `NODE_ENV=production` without `SEED_DEMO_OVERRIDE=true`. |
| Portal OTP demo code `1234` | Behind `isDemoMode()` only (excluded surface — payments/auth collaborator). |

## 7. Verification chains

- **CI** (`.github/workflows/ci.yml`): real postgres:17 + redis:7 services →
  `prisma migrate deploy` → vitest (280) → api smoke (58 checks) → build.
- **Unit**: 22 files under `tests/unit/` incl. `hardening.test.ts`
  (idempotency race, fail-closed scoping, model honesty, seed guard).
- **E2E**: Playwright role journeys (`tests/e2e/hospital-os.spec.ts`).
