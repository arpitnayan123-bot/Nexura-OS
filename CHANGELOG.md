# Changelog

All notable changes to Nexura OS are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Gate-verified engineering lock points are additionally tagged in git
(`hardening-locked-final`, `money-paise-locked-final`, …) — see
[PRODUCTION_STATUS.md](PRODUCTION_STATUS.md) for the full audit chain.

## [Unreleased]

## [1.2.0] — 2026-09-18

Repository excellence pass — everything a first-time contributor or evaluator
touches outside the application code.

### Added

- **Prettier** is now the enforced formatter (`.prettierrc.json`,
  `.prettierignore`) — `npm run format` / `npm run format:check`, and the whole
  codebase has been reformatted in this release
- **`CHANGELOG.md`** (this file) — release history now lives in-repo, not only
  in GitHub Releases
- **Pull request template** (`.github/pull_request_template.md`) — summary,
  motivation, testing plan, and a platform-specific honesty checklist
  (integer money, `callOR` AI governance, labelled `501`s)
- **GitHub Discussions** enabled — the "Questions & discussions" contact link
  in the issue templates now resolves
- `package.json` repository metadata: description, license, repository, bugs,
  homepage, keywords — visible to every registry and search indexing the package

### Changed

- Runtime flag `.guardian-seed-cooldown` is no longer tracked in git (it is
  per-environment state, not source)

## [1.1.0] — 2026-09-17

### Deploy story (the headline)

- **One-click Vercel button** in the README (`vercel.com/new/clone`, env
  predeclared) + Docker one-command path + any-PaaS path
- **`docs/DEPLOY_WALKTHROUGH.md`** — click-by-click, $0, ~15 minutes: Vercel →
  Neon pooled → Upstash `rediss://` → JWT secret → migrate + seed → 6-check
  verification table + troubleshooting matrix
- **`scripts/deploy_verify.py`** — the Step-8 checklist as a runnable harness:
  **8/8 PASS live** (health, homepage, console shell, demo sign-in, patient
  records, tamper-evident audit trail, SSE stream)
- **`npm run seed:suite`** — one command loads the complete demo dataset on a
  fresh database (fixes the `seed:demo` "no hospital found" dead end; all
  deploy docs updated)

### Product surfaces

- **Accessibility clean sweep** — axe-core violations on 8 consumer surfaces:
  **47 → 0** (dark-ink gold CTA, scoped eyebrow contrast, Pharmacia gray
  tokens, real `<main>` landmarks, heading-order fixes; palette unchanged in
  family)
- **Clinic + Pharmacia README depth** — Hospital-OS-weight feature bullets,
  every claim verified against the actual product
- **Fresh visuals** — clinic + pharmacy screenshots recaptured and the
  **11-surface demo GIF** rebuilt (adds Care Circle + Predictive) on the
  a11y-clean UI

### Housekeeping

- Repo hygiene: 6 orphan screenshots removed (0 references), 3 applied one-off
  codemods removed, stale scratch script removed, QA tool paths fixed

## [1.0.0] — 2026-09-17

The first tagged release.

### Products (all first-class surfaces, not mockups)

- **Hospital OS** — boot sequence, login, workspaces, window manager, ⌘K
  palette, 23 registered apps; command center with live census, bed lifecycle,
  ED pressure, OR schedule, critical-alert SLAs
- **Nexura Clinic** — outpatient OS: live queue, encounters, voice SOAP (AI),
  prescriptions, integer GST billing
- **Nexura Pharmacia** — POS, batch/expiry guardrails, prescription OCR,
  online orders, e-invoice payloads, CDSCO tooling
- **Patient Portal** — unified records, AI report interpretation, home blood
  tests, DPDP consent self-service with enforced revocation
- **Know Your Health** — 15 server-side AI tools with honest "educational, not
  a diagnosis" framing
- **Nexura Global** — medical tourism desk with integer USD/INR quotes
- **Nexura Connect** — care communication: channels, mentions, receipts,
  critical alerts

### Platform layer

- JWT auth suite (email+password, staff-code+PIN, TOTP MFA, break-glass,
  revocable sessions), RBAC as data (20 roles → 36 permissions)
- AI governance funnel (`callOR`): capability-labelled, consent-gated,
  metered to an append-only ledger with per-request identity attribution
- Money integrity: every money column an integer minor unit (paise/cents),
  canonical boundary in `src/lib/money.ts`, integer GST math
- Tamper-evident (hash-chained) audit trail, durable Postgres job queue,
  Redis-backed distributed rate limiting, SSE real-time

### Quality

- 345 unit tests / 30 files (real Postgres + Redis where honest) + 49-check
  API smoke suite + Playwright e2e
- CI on GitHub Actions: typecheck → lint → prisma validate → migrations →
  seed → unit tests → smoke → standalone production build

[Unreleased]: https://github.com/arpitnayan123-bot/Nexura-OS/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/arpitnayan123-bot/Nexura-OS/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/arpitnayan123-bot/Nexura-OS/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/arpitnayan123-bot/Nexura-OS/releases/tag/v1.0.0
