# Known Limitations & Integration Points (honest list)

Implemented = real, server-enforced, audited. Everything below is either a
**future integration placeholder** or an **explicit scope boundary**.

## Integration placeholders (implemented locally, wire remote in prod)

| Area | Status | Where to wire |
|---|---|---|
| Email sending | Tokens are logged (console transport) | `/api/nx/auth/password` + `verify-email` → SMTP/provider |
| Nexura remote adapters | Local adapters active; remote warns + falls back | `src/lib/nexura/local.ts` per contract |
| Malware scanning for uploads | `scanStatus: "skipped"` | `NxFileObject` lifecycle |
| Webhook delivery | Model + retry fields exist; no dispatcher cron | `NxWebhookDelivery` worker |
| Reminders queue | `reminderSentAt` field + scheduling events; no cron sender | background job (see below) |
| Background jobs | None scheduled in-process | any cron/queue runner (BullMQ, QStash, cloud scheduler) hitting the APIs |
| Redis pub/sub for SSE | In-process bus (single-node correct) | swap emitter in `src/lib/nx/bus.ts` |
| Shared rate-limit store | In-memory per process | `src/lib/nx/api.ts rateLimit` → Redis |
| SSO/SAML/OIDC | Button placeholder + architecture ready | add an `IdentityProvider` adapter |
| ABHA/insurance gateways | Seeded demo data only | `NxIntegrationEvent` consumers |

## Scope boundaries

- **Compliance is organizational.** Technical controls are built (audit chain,
  RBAC, immutability, lockout, revocation); HIPAA/ABDM/GDPR certification,
  BAAs, risk assessments, policies and training are yours.
- **Encryption at rest** is the hosting layer's job; the SQLite file is plain.
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

## Deliberate design choices

- PIN login kept for demo speed (it is real auth with the same sessions/audit).
- Money in integer paise; no floats.
- Signed notes immutable by design; corrections are addenda (never silent edits).
- Audit chain is per-hospital SHA-256 linked — retroactive edits break the chain.
