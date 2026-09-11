# Nexura PHI — Production Readiness Checklist

Verified against the codebase as of this documentation pass. `[x]` = done in the demo
build; `[ ]` = production blocker. Nothing on the blocker list may be waived for a
real-world release (see `CLINICAL-SAFETY-LIMITATIONS.md` §6 and `THREAT-MODEL.md` §5).

**Test baseline (verified by running `bunx vitest run tests/unit/phi` during this
documentation pass): 5 test files, 95 tests, 95 passed, 0 failed.**

## A. Done in this build

- [x] **Triage-before-analysis enforced** — position-locked 11-step pipeline
  (`assessment/run.ts`); `EMERGENCY_NOW` short-circuits all analysis layers;
  the LLM formatter is structurally outside the pipeline.
- [x] **Consent opt-in, default-denied** — subject bootstrap creates 10 scope rows
  all DENIED (`session.ts`); missing row = not granted (`consent.ts`);
  `health_profile` + `assessment` required before any run
  (`REQUIRED_FOR_ASSESSMENT`); `requireScope()` guards every data-bearing route;
  withdrawal propagates immediately and is audited.
- [x] **Audit trail** — append-only `phi_audit_events` for consent, assessment
  run/blocked, share created/viewed/revoked, export, delete; per-request `outcome`
  (`ok`/`denied`/`error`).
- [x] **No-PHI logging** — `audit.ts` `FORBIDDEN_META_KEYS` deny-list + 120-char
  string cap on meta; route error logs emit path + message only; verified live by
  planting marker text in symptom/feedback bodies during development.
- [x] **Kill switch** — DB system flag checked inside the pipeline (step 2); blocks
  new results while keeping profile/intake/consent/export/summary-of-past available;
  surfaced via `/session` and public `/status`.
- [x] **Export** — `GET /api/nx/phi/export`, session + scope gated, full JSON
  archive as `no-store` attachment, audited.
- [x] **Delete** — `DELETE /api/nx/phi/data`, pre-deletion counts audited, single
  transaction across 12 tables, consent rows intentionally preserved.
- [x] **Share revoke** — capability token (2×UUIDv4), 7-day default expiry, owner-only
  revoke, uniform 404 for unknown/expired/revoked (no existence leak), section
  allow-list enforced at creation and render.
- [x] **Ownership checks** — intake DELETE and share DELETE resolve ownership via
  `subjectId` predicates; client ids never trusted.
- [x] **Rate limits** — assessment run 10/min/subject; feedback 5/min/subject.
- [x] **Versioning** — engine `0.1.0` / ruleset `nexura-redflag 1.0.0` / content
  `demo-1` stamped on every assessment row + payload; public `/status`; ruleset
  review gate `assertRulesetReviewable()` runs at boot.
- [x] **95 unit tests passing** — 5 files / 95 tests (`tests/unit/phi/`):
  risk signals 16, patterns/recommendations 13, trends/summary 12,
  content/formatter 18, API schemas/share-utils 36. Invariants pinned: no
  probabilities, no diagnosis wording, no dose language, determinism, urgency
  escalation, `isSafeRephrase` boundary, section allow-list.
- [x] **Smoke-tested end to end** — development-phase live curl smokes exercised the
  full route surface (session stickiness, all error codes, unit conversions, share
  lifecycle, export header, both rate limits, data wipe); repo smoke entry
  `scripts/api-smoke.sh` remains available for regression.
- [x] **Adults-only routing** — schema rejects <18; triage routes minors out before
  rule evaluation; dedicated UI minor view.
- [x] **Escalation-over-reassurance bias** — uncertainty escalation
  (`RF-UNCERTAINTY-001`), crashing-rule escalation (`EVAL_ERROR`), monotonic
  `maxUrgency` merge, "missing is never normal" quality engine.
- [x] **India-context safety navigation** — 108, Tele-MANAS 14416, AIIMS NPIC
  1800-116-117, tobacco quitline 1800-11-2356 wired into rules/recommendations;
  EN/HI UI copy.

## B. Production blockers (unchecked = NOT done)

### Clinical & regulatory
- [ ] **Named clinical review of all 16 red-flag rules** — every
  `clinicalReviewer` is `"PENDING"`; reviewer names, dates, and sign-off must be
  filled and `assertRulesetReviewable()` flipped to `throw()`.
- [ ] **Clinical validation study** — sensitivity/specificity evaluation of rules
  and deterministic signals against real-world data with pre-registered endpoints;
  none exists.
- [ ] **DPDP Act 2023 / DPDP Rules 2025 legal review** — consent artifacts,
  withdrawal, deletion SLAs, children's-data provisions, breach duties; independent
  counsel required.
- [ ] **CDSCO SaMD classification assessment** — determine regulated status of the
  release form under India's medical-device framework and comply accordingly.
- [ ] **LLM provider review** — if the deterministic formatter is ever replaced:
  provider agreements, no-PHI egress, `isSafeRephrase` enforcement before render,
  re-audit of the injection surface. (Closed boundary today.)

### Platform & data protection
- [ ] **Encryption at rest** — SQLite file is plaintext; needs encrypted store,
  encrypted backups, KMS-managed keys.
- [ ] **Real authentication for consumer accounts** — demo subjects are anonymous,
  disposable cookies; production needs verified identity + account recovery before
  health data attaches to a person.
- [ ] **Durable rate limiting & edge hardening** — per-IP/global limits, distributed
  store, request-size caps, abuse controls on the two public endpoints.
- [ ] **Audit durability & monitoring/analytics wiring** — external append-only audit
  sink; alerting on kill-switch flips, 403/429 spikes, audit-write failures; none
  wired.
- [ ] **Kill-switch operational runbook** — authorization, recording, and user
  communication procedures.
- [ ] **Penetration test** of the full surface before launch.

### Product & quality
- [ ] **Localization QA of Hindi strings** — EN/HI copy table exists but has not
  been clinically or linguistically reviewed.
- [ ] **Low-bandwidth testing** — no 2G-class network profiling of the 7-step
  intake/results flow.
- [ ] **ABDM integration (optional, consent-based)** — only after the DPDP review;
  consent artifacts must be compatible.
- [ ] **Accessibility audit** of the `/predictive` experience beyond the built-in
  semantic/ARIA groundwork.
- [ ] **Ruleset content review for coverage gaps** — endemic-condition warning signs
  (e.g., dengue/malaria), obstetric expansion, vital-history evaluation (triage
  currently sees the most recent vital snapshot only).

## C. Release gate rule

A release may proceed only when **every** item in section B is checked with a dated
evidence link (review document, study report, legal opinion, registration number, or
test artifact) recorded in this file. The demo posture (`DEMO_ONLY` badge,
`demo: true` payloads, PENDING reviewers) must remain visible until then.
