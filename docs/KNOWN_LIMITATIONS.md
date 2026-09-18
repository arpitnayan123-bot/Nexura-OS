# Known Limitations & Integration Points (honest list)

Implemented = real, server-enforced, audited. Everything below is either a
**future integration placeholder** or an **explicit scope boundary**.

Current platform baseline: PostgreSQL + Redis (required in production —
`assertProductionEnv` refuses to boot without them), distributed rate limiting,
durable Postgres job queue, per-request AI identity attribution, integer-paise
money schema-wide. See [PRODUCTION_STATUS.md](../PRODUCTION_STATUS.md) for the
point-in-time readiness statement.

## Integration placeholders (implemented locally, wire remote in prod)

| Area                         | Status                                                                                                                                                                                                                                                          | Where to wire                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Email sending                | **`src/lib/mailer.ts` is the boundary.** `EMAIL_TRANSPORT=console` (demo) prints the token to stdout; `EMAIL_TRANSPORT=smtp` sends real mail via nodemailer (`SMTP_HOST/PORT/USER/PASS/FROM`). Remaining: none for email — SMS/WhatsApp still needs a provider. | SMTP env vars; SMS/WhatsApp provider of choice            |
| ABDM / ABHA lookup           | Demo mode fabricates a labelled demo identity; production returns **501 `abdm_not_integrated`** (never silently fakes)                                                                                                                                          | `/api/clinic/abha` once an ABDM gateway is contracted     |
| IRP e-invoice IRN            | GST payload is generated from real sale data; `irn`/`ackNo` are `null` until the IRP portal registration happens                                                                                                                                                | `/api/pharmacy/e-invoice`                                 |
| Live drug-price feeds        | NPPA price table and CDSCO banned-FDC lists are curated in-repo reference data; swap or schedule updates                                                                                                                                                        | `/api/pharmacy/nppa-prices`, `/api/pharmacy/cdscos-check` |
| Nexura remote adapters       | Local adapters active; remote warns + falls back                                                                                                                                                                                                                | `src/lib/nexura/local.ts` per contract                    |
| Malware scanning for uploads | `scanStatus: "skipped"`                                                                                                                                                                                                                                         | `NxFileObject` lifecycle                                  |
| Webhook delivery             | Model + retry fields exist; no dispatcher cron                                                                                                                                                                                                                  | `NxWebhookDelivery` worker                                |
| Reminders queue              | `reminderSentAt` field + scheduling events; sender can ride the job runner                                                                                                                                                                                      | `src/lib/nx/jobs/runner.ts` handler                       |
| SSO/SAML/OIDC                | Button placeholder + architecture ready                                                                                                                                                                                                                         | add an `IdentityProvider` adapter                         |
| Device ingestion at scale    | Wearable ingest + bio-signal endpoints are live; a dedicated time-series store is the next step for volume                                                                                                                                                      | `/api/nx/wearables/*`, `/api/nx/bio/*`                    |

## Recently closed gaps (was placeholders, now implemented)

- **Online medicine orders** — was a hardcoded empty array; now a full
  DB-backed order book (`/api/pharmacy/online-orders`) with Rx-upload OCR,
  catalog matching, a unit-tested state machine and confirmation-time stock
  checks.
- **Homepage health stats** — was a synthetic sine generator; now real
  aggregates from `NxWearableSample` + `HospitalVital` with labelled
  derivations and a deterministic demo fallback (`src/lib/site/health-stats.ts`).
- **Clinic AI endpoints** — symptom triage (deterministic red-flag screen +
  AI), patient chat (AI with escalation), lab interpretation (deterministic
  ICMR flag + AI explanation), chronic-care plans (ICMR library + AI
  generation), cohort matching (real visit-history aggregation with honest
  empty states).
- **Auth email delivery** — consolidated into `src/lib/mailer.ts` with a real
  SMTP transport.

## Scope boundaries

- **Compliance is organizational.** Technical controls are built (audit chain,
  RBAC, immutability, lockout, revocation); HIPAA/ABDM/GDPR certification,
  BAAs, risk assessments, policies and training are yours.
- **Encryption at rest** is the hosting layer's job (managed Postgres/Redis).
- **Field-level encryption** for sensitive columns not implemented.
- **Single hospital per session.** Org/hospital switcher UI is future work —
  the data model and identity contract already support multi-hospital users.
- **CSP** ships with script-src `'unsafe-inline'/'unsafe-eval'` in prod (Next.js
  runtime needs); tighten via nonces after a frontend audit.
- **Dashboard widget personalization** stores per-user widget visibility/order
  (API + storage implemented); the Command Center UI applies role defaults and
  persists changes where wired — full drag-to-reorder UI is incremental work.
- **Print views**: patient summary is print-friendly via browser styling; a
  dedicated print stylesheet is incremental.
- **SSE on serverless**: the event bus and job runner assume a long-running
  node server (Docker/compose or a VM); on serverless platforms SSE and the
  in-process worker need an adapter (documented in docs/DEPLOYMENT.md).

## Deliberate design choices

- PIN login kept for demo speed (it is real auth with the same sessions/audit).
- Money in integer paise; no floats.
- Signed notes immutable by design; corrections are addenda (never silent edits).
- Audit chain is per-hospital SHA-256 linked — retroactive edits break the chain.
- Every demo-only response carries a `source` label stating exactly what
  produced it — the system never guesses silently.
