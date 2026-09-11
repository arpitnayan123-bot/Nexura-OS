# Nexura PHI — Threat Model (STRIDE)

Scope: the PHI module (`src/modules/phi/**`), the `/api/nx/phi/**` route surface, and
the `/predictive` UI, as built in the demo repository. Each threat below lists the
mitigation **actually implemented**, with the file that implements it. Honest
gaps are called out inline and consolidated in the "Open items for production"
section.

## 1. Assets and trust boundaries

| Asset | Stored where | Notes |
|---|---|---|
| Health profile, symptoms, conditions, medications, allergies, lifestyle, vitals, labs | SQLite via Prisma (`Phi*` tables) | Self-reported; user-owned |
| Assessments (full JSON payload) | `phi_assessments.payload` | Contains derived findings + input-derived strings; not free-text echoes |
| Consent state | `phi_consents` | Default-DENIED rows on subject creation |
| Audit events | `phi_audit_events` | Append-only, PHI-scrubbed meta |
| Share grants | `phi_share_grants` | Capability tokens, expiry + revocation |
| Session | `phi_session` cookie | Signed JWT (HS256 via `JWT_SECRET`), httpOnly, sameSite=lax, 30-day TTL |

Trust boundaries: (browser ↔ `/api/nx/phi` routes), (routes ↔ engine modules),
(engine modules ↔ DB), and (any LLM provider ↔ engine output — currently a
deterministic no-op boundary).

## 2. STRIDE analysis

### 2.1 Spoofing (impersonating a subject)

| Threat | Mitigation implemented | Where |
|---|---|---|
| Forged/modified session cookie | `phi_session` is an HS256-signed JWT; tampered tokens fail verification → no subject | `session.ts` `verify()` |
| Token reuse from another feature's token | Authorization is enforced per request by resolving `sub` against the `phi_subjects` table — a non-PHI token cannot satisfy the lookup. Documented deviation: `signServiceToken` stamps a fixed service scope, so the PHI distinction is at the DB authorization layer, not the JWT scope claim | `session.ts` sign/verify comments, `getPhiSubjectId()` |
| Guessing subject IDs | Client-supplied IDs are never trusted; every route resolves the subject from the cookie only; ownership predicates (`where: { id, subjectId }`) guard row access | All routes, e.g. `intake/[bucket]/route.ts` DELETE |
| Share-link forgery | Share token = two concatenated UUIDv4s (72 chars, `crypto.randomUUID`), single row `@unique`; unknown/expired/revoked all return an identical 404 (no existence leak) | `share-utils.ts generateShareToken()`, `share/route.ts` GET |

### 2.2 Tampering ( altering data / requests )

| Threat | Mitigation implemented | Where |
|---|---|---|
| Malformed or malicious request bodies | Every route validates through zod v4 schemas in one module; adults-only age, plausibility ranges, strict-object bodies; vitals are unit-normalized by schema transform so routes see only canonical °C / mg/dL | `schemas.ts` |
| Error responses echoing attacker input | `firstZodIssue()` renders only the issue path + message; input is never echoed | `schemas.ts` |
| Deleting / reading another subject's intake rows | DELETE handlers `findFirst({ id, subjectId })` first — a foreign id yields 404, and the delete only proceeds for the owned row | `intake/[bucket]/route.ts` |
| Revoking or viewing another subject's share grant | Revoke requires a session and `grant.subjectId === subjectId`, else 404 | `share/route.ts` DELETE |
| Smuggling un-shareable sections into a share grant | Section allow-list: grant `includes` is intersected with the fixed `SHARE_SECTIONS` (7 values) at creation AND at render; un-granted keys are **never present in the response object at all** | `schemas.ts SHARE_SECTIONS`, `share-utils.ts filterSummarySections()` |
| Request bodies overriding server-side facts (urgency, versions, ids) | Assessment output is produced entirely server-side; request bodies for run/summary carry no analysis inputs; canonical assessment id is re-aligned to the DB row id before returning | `assessment/run/route.ts` |

### 2.3 Repudiation (denying actions)

| Threat | Mitigation implemented | Where |
|---|---|---|
| Disputing who ran/granted/shared what | Append-only audit trail per subject: consent granted/withdrawn/denied, assessment blocked/completed, share created/viewed/revoked, data exported, data deleted | `audit.ts`, all routes |
| Audit log poisoning via meta | `sanitizeMeta()` drops any key in `FORBIDDEN_META_KEYS` (`text`, `wording`, `message`, `payload`, `body`, `value`, `result`, `note`, `notes`, `userWording`, `symptom`) and drops any string value longer than 120 chars. Only field names, bucket names, rule ids, versions, and counts survive | `audit.ts` |
| Audit write failures hiding actions | Failures are swallowed so the request path never breaks, by design — accepted trade-off: an audit row can be lost on a DB fault. Mitigated in production by DB monitoring (see open items) | `audit.ts` record() catch block |

### 2.4 Information disclosure (PHI leakage)

| Threat | Mitigation implemented | Where |
|---|---|---|
| PHI in server logs | Route error logging prints only `"[phi] route error <path>"` + `err.message`; no request bodies, no PHI. Verified live during development by planting marker text in symptom wording/feedback and confirming absence from logs and audit meta | all route files |
| PHI in audit meta | `FORBIDDEN_META_KEYS` + 120-char string cap (2.3) | `audit.ts` |
| Un-consented data processing | Consent is opt-in per scope; a missing row means NOT granted. Every data-bearing route calls `requireScope()` (health_profile for profile/intake/export; trends; clinician_sharing for summary/share); assessment requires `health_profile` + `assessment` (`REQUIRED_FOR_ASSESSMENT`) | `consent.ts`, routes |
| Consent withdrawn but processing continues | Withdrawal propagates immediately — dependent endpoints refuse on next request; withdrawal is audited. Stored rows are retained until the user's explicit `DELETE /data` (documented behavior, not a silent purge) | `consent.ts propagateWithdrawal()` |
| Public endpoint surface larger than intended | Exactly two public endpoints: `GET /api/nx/phi/status` (versions + kill-switch booleans, no personal data) and `GET /api/nx/phi/share?token=…` (capability view). Everything else 401s without a session | route files |
| Share links over-exposing a summary | Grant stores an explicit `includes` list; the public GET returns `{ statement, sections }` with **only** granted sections materialized; `statement` is the fixed disclaimer + version line. Sections are allow-listed twice (creation + render) | `share/route.ts`, `share-utils.ts` |
| Share links living forever | `expiresAt` set at creation (`expiresInDays`, UI default 7 days); `isGrantActive()` requires un-revoked AND un-expired; revoke sets `revokedAt` | `share-utils.ts`, `share/route.ts` |
| Export endpoint as an exfil path | Export requires session + `health_profile` scope and is audited (`data.exported`); body is the subject's **own** data only, served as a `no-store` attachment | `export/route.ts` |
| Rate-limit-free scraping of run/feedback | POST `/assessment/run` limited to 10/min/subject; POST `/feedback` 5/min/subject (in-memory `rateLimit` from the repo auth lib — per-process, resets on restart) | `assessment/run/route.ts`, `feedback/route.ts` |
| Killing the API to hide DoS (see 2.5) | — | — |

### 2.5 Denial of service

| Threat | Mitigation implemented | Where |
|---|---|---|
| Run-pipeline hammering | 10/min/subject rate limit on `/assessment/run`; the pipeline itself is deterministic and DB-bound, no external calls | `assessment/run/route.ts` |
| Feedback/write flooding | 5/min/subject on `/feedback`; zod caps on body sizes | `feedback/route.ts`, `schemas.ts` |
| Audit-write failure cascade | Audit failures never throw into the request path | `audit.ts` |

Not implemented (honest): global/per-IP rate limits, request-size limits at the edge,
DB connection pooling guards, and multi-instance rate-limit backing are all absent —
this is a single-process demo.

### 2.6 Elevation of privilege (incl. the LLM boundary)

| Threat | Mitigation implemented | Where |
|---|---|---|
| LLM provider injecting urgency/claims or inventing findings | The v0.1 `LLMFormatter` is **deterministic** — it only strips parentheticals and truncates to 3 sentences for "plain" reading level; it never runs inside the pipeline. `isSafeRephrase(original, rephrased)` is the documented boundary for any future provider: rejects case-insensitive introduction of urgency phrases (`emergency`, `urgent`, `call 108`, `immediately`) absent from the original, and rejects outputs longer than 2× the original | `engines.ts llmFormatter`, `isSafeRephrase()`; tests in `phi-content-formatter.test.ts` |
| Prompt-injection via user free text reaching a model | v0.1 has **no LLM in any request path**; user free-text is never forwarded anywhere (the clinician summary generator accepts only structured, engine- or record-derived strings and normalizes them: whitespace collapsed, 200-char/12-item caps) | `engines.ts ClinicianExtraContext` / `cleanSummaryList()` |
| Kill switch bypass | Checked inside `runAssessment()` (step 2) before any compute, not only at the route | `assessment/run.ts` |
| Consent bypass | Checked inside `runAssessment()` (step 1) and per-route via `requireScope()`; denials are audited with outcome `denied` | `run.ts`, `consent.ts` |
| Data wipe of another subject | `DELETE /data` operates exclusively on the cookie-resolved subject | `data/route.ts` |

## 3. Data-at-rest posture (honest statement)

All PHI resides in a **plain SQLite file** (Prisma, `db/` folder) on the sandbox
filesystem. There is **no encryption at rest, no per-row encryption, no key
management, no backup encryption, and no access logging at the file level**. This is
demo-grade by design: subjects are disposable demo identities and the deployment is a
single-tenant sandbox. Any real deployment must replace this posture (see open items)
before holding a single real record.

## 4. Export and deletion flows (user rights)

- **Export:** `GET /api/nx/phi/export` — session + `health_profile` scope; returns the
  subject's full data (profile, all 7 intake buckets, assessments incl. parsed
  payloads, feedback) as a dated JSON attachment; audited `data.exported`.
- **Delete:** `DELETE /api/nx/phi/data` — audits `data.delete_requested` **with
  per-bucket counts before rows disappear**, then a single `$transaction` deleteMany
  across 12 tables, then `data.deleted`. `phi_consents` rows are deliberately KEPT
  (a user must never be silently re-consented) and the subject row is kept so session
  + audit continuity survive. Returns the per-bucket counts.
- **Withdrawal vs. deletion:** withdrawing a consent scope stops processing
  immediately but retains stored rows until the explicit delete — both behaviors are
  documented in-app and here.

## 5. Open items for production

1. **Encryption at rest** for the health-data store + encrypted backups + key
   management (KMS/HSM); the SQLite file is not acceptable for real PHI.
2. **Real consumer authentication** — the demo subject cookie is anonymous and
   disposable; production needs verified identity, account recovery, and device
   management before health data attaches to a person.
3. **Durable rate limiting and edge protections** — per-IP and global limits,
   request-size caps, distributed rate-limit store (current limiter is in-memory,
   per-process), bot/abuse controls on the two public endpoints.
4. **Share-capability hardening** — consider binding grants to the assessment chosen
   at creation (the current GET serves the subject's *latest* assessment at view
   time, not the one selected when the grant was created), rotating tokens, audit on
   the public view with a salted token hash instead of the raw token in DB.
5. **Audit durability** — ship audit events to an append-only external store; the
   swallow-on-failure trade-off needs monitoring and alerting.
6. **Monitoring/analytics wiring** — no alerts exist for kill-switch flips, burst
   denials (consent/kill-switch 403 spikes), rate-limit saturation, or audit-write
   failures.
7. **Kill-switch authorization runbook** — who may flip it, how it is recorded, and
   how users are informed (currently a DB row flipped by anyone with DB access).
8. **CSP/headers and browser-side protections** for the `/predictive` experience,
   plus review of third-party scripts (none shipped by this feature).
9. **LLM provider review** — if a real provider replaces the deterministic
   formatter: provider DPA/BAA-equivalent, no-PHI egress policy, logged rephrase
   audits with `isSafeRephrase` enforcement *before* render, and a re-review of the
   prompt-injection surface. Until then the boundary stays closed.
10. **Localization QA and low-bandwidth testing** for the UI (Hindi strings,
    2G-class networks) — currently unaudited.
11. **ABDM integration (optional, consent-based)** if health-record linkage is ever
    desired — must be consent-artifact-compatible with the DPDP review in
    `CLINICAL-SAFETY-LIMITATIONS.md`.
12. **Penetration test** of the full surface before launch, re-run per release.
