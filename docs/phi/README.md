# Nexura Predictive Health Intelligence (PHI) — Feature Overview

> **Status: DEMO_ONLY.** Every rule's `clinicalReviewer` field is `"PENDING"` by design.
> This document describes what was built, exactly as built. It is not a claim of
> clinical validity. See [CLINICAL-SAFETY-LIMITATIONS.md](./CLINICAL-SAFETY-LIMITATIONS.md)
> and [PRODUCTION-READINESS-CHECKLIST.md](./PRODUCTION-READINESS-CHECKLIST.md).

## 1. What PHI is

Nexura Predictive Health Intelligence is a **consumer-facing, triage-first health-risk
screening and preventive-guidance feature** for adults (18+) in an India context. It
ingests self-reported profile data, symptoms, conditions, medications, allergies,
lifestyle entries, home vitals, and lab values; runs a deterministic red-flag triage
pass **before** any analysis; and produces a versioned, audited, consent-scoped
*screening summary* — risk signals, possible patterns, protective/contributing factors,
missing information, recommended next steps, clinician questions, and trends.

## 2. What PHI is NOT

- **Not a diagnostic system.** No output names a disease or condition the user "has".
- **Not probabilistic.** v0.1 emits confidence *categories* (`LOW_CONFIDENCE`,
  `MODERATE_CONFIDENCE`, `HIGHER_CONFIDENCE_WITHIN_SCREENING_SCOPE`,
  `INSUFFICIENT_INFORMATION`) — never numbers, never percentages, never risk scores.
- **Not an emergency service.** It never summons help; on emergency red flags it
  instructs the user to call 108 (or their local number) and short-circuits analysis.
- **Not a medication advisor.** No doses, no drug changes; recommendations never
  include mg/dose language (unit-tested invariant).
- **Not a replacement for professional care.** The disclaimer is stamped on every
  assessment: *"Nexura Predictive Health Intelligence helps users identify health-risk
  signals and preventive opportunities. It does not diagnose disease or replace
  professional medical care."*

## 3. Version stamps (current)

| Component | Constant | Value | Defined in |
|---|---|---|---|
| Engine | `PHI_ENGINE_VERSION` | `0.1.0` | `src/modules/phi/contracts.ts` |
| Triage ruleset | `PHI_RULESET_ID` / `PHI_RULESET_VERSION` | `nexura-redflag` / `1.0.0` | `contracts.ts`, mirrored in `triage/ruleset.ts` (`RULESET_ID`, `RULESET_VERSION`) |
| Content | `PHI_CONTENT_VERSION` | `demo-1` | `contracts.ts`; `contentRepo.version` mirrors it |

Every assessment row stamps all of these; the public `GET /api/nx/phi/status` endpoint
reports them plus the kill-switch state; the UI landing page and each result screen
render them.

## 4. Architecture map

```
src/modules/phi/
├── contracts.ts              # Single source of truth: types, versions, consent
│                             #   scopes, engine interfaces, ApiResult shapes
├── session.ts                # phi_session signed-JWT cookie (httpOnly), subject bootstrap
├── consent.ts                # Opt-in scopes, withdrawal propagation, requireScope guard
├── kill-switch.ts            # PhiSystemFlag — disables NEW predictive results
├── audit.ts                  # Append-only audit trail, PHI-scrubbed meta
├── normalize.ts              # BMI, unit conversions, plausibility ranges, adult routing
├── snapshot.ts               # DB -> engine projections (Profile/RecordSnapshot)
├── schemas.ts                # zod v4 input schemas for every route; SHARE_SECTIONS
├── share-utils.ts            # Capability tokens, expiry, section allow-list (pure)
├── triage/
│   ├── ruleset.ts            # 16 red-flag rules RF-*, governance metadata,
│   │                         #   assertRulesetReviewable()
│   └── engine.ts             # Deterministic triage; minors routed out;
│                             #   escalation-on-uncertainty; special-population routing
├── quality/engine.ts         # Completeness weights, implausible/contradictory/stale
│                             #   checks — "missing is never normal"
└── assessment/
    ├── risk-signals.ts       # Deterministic RiskModelProvider (v0.1)
    ├── engines.ts            # Patterns, recommendations, trends, explanation hook,
    │                         #   clinician summary, content repo, LLM formatter
    ├── content-catalog.ts    # Static approved India-specific demo content (10 rows)
    └── run.ts                # Position-locked 11-step pipeline assembler
```

API routes live under `src/app/api/nx/phi/` (section 6); the UI lives under
`src/components/phi/` (section 7) and renders at `/predictive`.

### 4.1 Triage-first pipeline (`assessment/run.ts`)

Position-locked, 11 steps. Order is a safety property, not a style choice:

| # | Step | Notes |
|---|---|---|
| 1 | Consent validation | `health_profile` + `assessment` required; denial audited (`assessment.blocked`), 403 `consent_required` |
| 2 | Kill-switch check | On → 403 `kill_switch`, audited |
| 3 | Snapshot build | DB rows → `ProfileSnapshot` + `RecordSnapshot` |
| 4 | Data-quality assessment | Completeness 0–100 + warnings; *missing is never normal* |
| 5 | **EMERGENCY TRIAGE** | Deterministic rules engine; **always before anything generative** |
| 6 | Special-population routing | Minors routed out; pregnancy / severe-chronic caution notices |
| 7 | Risk signals (deterministic) | Skipped entirely when urgency is `EMERGENCY_NOW` |
| 8 | Possible patterns | Skipped when `EMERGENCY_NOW` |
| 9 | Recommendations | Replaced by a single "follow the safety instruction above" step when `EMERGENCY_NOW` |
| 10 | Clinician questions | Skipped when `EMERGENCY_NOW` |
| 11 | Version stamping + audit + persistence | Row written to `phi_assessments`; `assessment.completed` audited |

When triage escalates to `EMERGENCY_NOW`, the assessment is `triageOnly: true`: safety
alerts render first and **no analysis competes with them** (the UI collapses analysis
behind a "Why safety information comes first" explainer). The LLM formatter is
deliberately **not** in this pipeline — it may only rephrase finished strings at render
time and can never change urgency, alerts, or findings.

`followUpIntervalDays` derives from urgency: `EMERGENCY_NOW` → `null`, `SAME_DAY` → 2,
`PROMPT_APPOINTMENT` → 7, otherwise 30.

### 4.2 Engine inventory

| Engine | Contract interface | v0.1 implementation | Swappable? |
|---|---|---|---|
| Triage rules engine | `TriageRulesEngine` | `triage/engine.ts` (16 rules + uncertainty bias) | Yes — implement interface |
| Data quality | `DataQualityEngine` | `quality/engine.ts` | Yes |
| Risk model | `RiskModelProvider` | `assessment/risk-signals.ts` (deterministic signals) | **Yes — this is the slot for a validated model later** |
| Trend analysis | `TrendAnalysisEngine` | `engines.ts` `trendEngine` (10 metrics, direction categories) | Yes |
| Recommendations | `RecommendationEngine` | `engines.ts` `recommendationEngine` (India-context, no doses) | Yes |
| Explanation | `ExplanationEngine` | `engines.ts` `explanationEngine` (v0.1 pass-through hook) | Yes |
| Clinician summary | `ClinicianSummaryGenerator` | `engines.ts` `clinicianSummaryGenerator` (structured records only; never user free-text) | Yes |
| LLM formatter | `LLMFormatter` | `engines.ts` `llmFormatter` — deterministic rephrase-only; guarded by `isSafeRephrase()` | Yes, with review (see THREAT-MODEL) |
| Audit | `AuditService` | `audit.ts` (append-only, PHI-scrubbed) | Yes |

## 5. Demo posture

- **`DEMO_ONLY` badge** is rendered on the landing page, results screen, and top bar;
  the session payload and `/status` both carry `demo: true`.
- **Reviewer `PENDING`:** every rule in `RED_FLAG_RULES` and every row in the static
  content catalog carries `clinicalReviewer: "PENDING"` (content: `"PENDING (demo)"`).
  `assertRulesetReviewable()` is invoked at module load of `triage/engine.ts`.
- **`PHI_ALLOW_UNREVIEWED_RULES=1` semantics** (`triage/ruleset.ts` →
  `assertRulesetReviewable`): when set to `1`, the review gate is **skipped silently**.
  When unset (demo default), the boot proceeds but **logs a loud warning** naming the
  count of unreviewed rules — the demo intentionally boots with the warning instead of
  crashing. The code comment marks where production must flip the warning to
  `throw()`. Setting the env var is therefore a *dev convenience*, never a production
  path.
- Subjects are lightweight and disposable (`demo-xxxxxxxx` labels); no real identity
  is claimed or verified.

## 6. API surface (`/api/nx/phi`)

All responses use the `ApiResult` envelope (`{ ok: true, data }` |
`{ ok: false, error, code }`) except the export file body. Common codes:
`200 / 400 invalid_input / 401 no_session / 403 consent_required|kill_switch /
404 not_found / 429 rate_limited / 500 server_error`. Errors never echo input text
(`firstZodIssue()` renders path + message only).

| Endpoint | Methods | Session | Consent scope | Extra limits / notes |
|---|---|---|---|---|
| `/session` | GET, POST | POST bootstraps | — | POST creates `PhiSubject` + default-DENIED consent rows, sets httpOnly signed cookie |
| `/consent` | GET, PUT | ✓ | — | PUT toggles one scope; withdrawal propagates (audited) |
| `/profile` | GET, PUT | ✓ | `health_profile` | Strict partial schema; canonical units only |
| `/intake/[bucket]` | GET, POST, DELETE | ✓ | `health_profile` | `bucket ∈ {symptoms, conditions, medications, allergies, lifestyle, vitals, labs}`; DELETE `?id=` ownership-checked |
| `/assessment/run` | POST | ✓ | (enforced in pipeline) | **Rate limit 10/min/subject**; 403 with engine code on consent/kill-switch |
| `/assessment` | GET | ✓ | — | Assessment list (rows only, no payload scan) |
| `/assessment/[id]` | GET | ✓ | — | Single assessment; id aligned to DB row id |
| `/trends` | GET | ✓ | `trends` | Trend observations across records |
| `/summary` | POST | ✓ | `clinician_sharing` | On-demand clinician summary (structured records only) |
| `/share` | POST / GET / DELETE | POST+DELETE ✓, **GET public** | `clinician_sharing` (POST) | Token = capability; expired/revoked/unknown → uniform 404; DELETE = revoke |
| `/feedback` | POST | ✓ | — | **Rate limit 5/min/subject** |
| `/export` | GET | ✓ | `health_profile` | Full JSON archive; `Content-Disposition: attachment`; `no-store` |
| `/data` | DELETE | ✓ | — | Transactional wipe of 12 tables; consent + subject rows kept; per-bucket counts audited before deletion |
| `/audit` | GET | ✓ | — | Own trail, latest 50 events |
| `/status` | GET | **public** | — | `killSwitch`, engine/ruleset/content versions, `demo: true` |

**Public endpoints (only two):** `GET /status` and `GET /share?token=…`. Everything
else requires a valid `phi_session` cookie resolvable to a `phi_subjects` row.

## 7. UI flow (`src/components/phi`, rendered at `/predictive`)

| File | Role |
|---|---|
| `phi-experience.tsx` | Orchestrator: views `landing → intake (7 steps) → running → results`, plus `history`, `summary`, `settings`, `minor`, `runerror` |
| `landing.tsx` | DEMO chip, trust row, safety explainer, version stamps from `GET /status` |
| `intake-steps.tsx` | Step 0 consent (required scopes gate the flow), 1 profile, 2 symptoms, 3 conditions, 4 lifestyle, 5 vitals, 6 review → run. Sticky Back/Skip/Continue, why-we-ask hints, EN/हिं copy, unit toggles that send canonical °C / mg/dL |
| `results.tsx` | Safety-locked fixed section order: urgency banner + safety alerts first; `EMERGENCY_NOW`/`triageOnly` hides analysis behind a collapsed explainer; disclaimer from payload |
| `summary-share.tsx` | Read-only full summary; exactly the 7 shareable sections as checkboxes; create/revoke/copy links |
| `history.tsx` | Past assessments + trends view |
| `settings.tsx` | 10 consent toggles, notification prefs, export, confirmed delete, audit trail, kill-switch banner |
| `api-client.ts` | Typed fetch client for the surface above |
| `strings.ts` | EN/HI copy table |
| `ui-primitives.tsx` | Shared cards/badges |

Safety details: rose is used only for emergency banners; Tele-MANAS 14416 (+108) is
shown pre-continue on mental-health/self-harm steps; a minor-age profile routes the
session to a dedicated `minor` view; run errors surface the engine's verbatim message
(consent/kill-switch codes route back to consent/landing with the real text).

## 8. Running the demo seed

```bash
bun scripts/seed-phi.ts
```

Idempotent: creates the demo subject, 10 consent scope rows (all **denied**), and 8
`PhiContentItem` rows. The static in-code catalog (`assessment/content-catalog.ts`, 10
approved rows, `demo-1`/en) needs no seeding — `contentRepo` falls back to it when the
DB has no approved row for a key.

## 9. Environment variables

| Variable | Used by | Semantics |
|---|---|---|
| `JWT_SECRET` | `src/lib/auth/jwt.ts` (reused by `session.ts`) | Signs the HS256 `phi_session` cookie. Must be set in production; demo repo default exists. |
| `PHI_ALLOW_UNREVIEWED_RULES` | `triage/ruleset.ts` → `assertRulesetReviewable()` | `=1` skips the clinical-review gate **silently**. Unset (demo default) → boot proceeds with a loud `console.warn` listing unreviewed rule count. Production must flip the warn to `throw()`; the env var is never a production path. |

## 10. Test map (`tests/unit/phi`)

Deterministic unit tests; no DB access (one deliberate `SKIP` for a DB-path test).
Current verified count: **5 files, 95 tests, all passing**
(`bunx vitest run tests/unit/phi`).

| File | Tests | Pins |
|---|---|---|
| `phi-risk-signals.test.ts` | 16 | BP 140→watch / 160→elevated, glucose, BMI informational, sleep, activity, tobacco, stress, HbA1c, symptom repeats, clean profile → zero signals, determinism, severity sort, `notADiagnosis`/confidence-category/**no-probability-field** invariants |
| `phi-patterns-recommendations.test.ts` | 13 | sleep-stress / bp-activity / compounding-load / repeat-tracking patterns, pattern safety fields, determinism, tobacco rec mentions 1800-11-2356 quitline, katori portions, low-completeness rec, enum validity, **zero dose/mg language** |
| `phi-trends-summary.test.ts` | 12 | Trend directions (deteriorating/improving/stable/insufficient_data) for BP, sleep, stress, symptom repeats; clinician summary 2-arg backward compat + extra-context fill + "does not diagnose" statement |
| `phi-content-formatter.test.ts` | 18 | `isSafeRephrase` accept/reject matrix incl. case-insensitivity + 2× length boundary; deterministic formatter behavior; catalog ≥10 rows with governance stamps; unique keys; no `diagnos*` wording; no dose language; required topic keys; `resolveMany([])` no-DB path |
| `phi-api.test.ts` | 36 | zod schemas (minor age rejection, implausible vitals, unit conversions, strict bodies, bucket allow-list, share body caps); share-utils (token format/uniqueness, expiry/revocation, section allow-list incl. never-grantable sections, summary formatting + 5-cap, merge fallback) |

## 11. Document set

| Document | Purpose |
|---|---|
| `README.md` (this file) | Feature + architecture overview |
| `CLINICAL-SAFETY-LIMITATIONS.md` | Intended use, exclusions, rule coverage, release gates |
| `THREAT-MODEL.md` | STRIDE analysis with implemented mitigations |
| `VERSIONING.md` | Engine/ruleset/content version stamping and change process |
| `PRODUCTION-READINESS-CHECKLIST.md` | Done vs. production blockers |
