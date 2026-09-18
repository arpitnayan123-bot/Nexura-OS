# Contributing to Nexura OS

Thanks for your interest in improving Nexura OS — a calmer operating system for your health. Every contribution, from a typo fix to a new integration, is welcome. This document tells you how to set up, what the quality bar is, and where help is needed most.

## Where help is needed most

The highest-value work right now is closing the **honest boundaries** — the places where the system deliberately returns `501` or `null` instead of faking data:

| Integration point           | What it needs                                               |
| --------------------------- | ----------------------------------------------------------- |
| ABDM / ABHA registry lookup | Real registry wiring (returns `501` outside demo mode)      |
| IRP e-invoicing (IRN)       | IRP portal integration (IRN stays `null` until then)        |
| SMS / WhatsApp OTP delivery | A provider account (email already ships via SMTP)           |
| Accessibility passes        | The consumer surfaces (`/care`, `/vitals`, `/diy`, `/labs`) |

See [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) for the full, current list.

## Setup

```bash
cp .env.example .env        # fill in DATABASE_URL / JWT_SECRET / REDIS_URL
npm install                 # deps (bun also works)
npx prisma migrate deploy   # apply schema (PostgreSQL required)
npm run seed:demo           # v4 demo dataset
npm run dev                 # http://localhost:3000
```

Demo sign-in: open `/hospital` → "Explore demo roles" → password `Demo@12345`.
Full credentials: [docs/DEMO_CREDENTIALS.md](docs/DEMO_CREDENTIALS.md).

## The quality bar

CI runs the full gate chain on every push — keep it green locally before opening a PR:

```bash
npm run typecheck   # tsc --noEmit — src must be clean, zero suppressions
npm run lint        # ESLint
npm run test        # Vitest unit suite (345 tests; real-DB tests need Postgres + Redis)
npm run build       # production standalone build must compile
```

Conventions that are enforced by review (not just tooling):

- **Money is integer minor units** (paise/cents) — `src/lib/money.ts` is the canonical boundary. Float money is rejected.
- **Every AI call goes through `callOR`** — capability-labelled, metered, consent-gated. No raw provider calls.
- **Honest boundaries** — label demo-only behavior in the response `source` field; never fabricate data to make a route look complete.
- **New API surface → new smoke check** in `tests/api-smoke.sh`.

## Pull request process

1. Fork and branch from `main`
2. Keep the gates green (above)
3. Write a clear PR description: what changed, why, and how you verified it
4. If you touched the schema, add an additive migration (`npx prisma migrate diff`) — destructive migrations need a maintainer
5. Open the PR — the [CI workflow](.github/workflows/ci.yml) runs the full chain automatically

## Reporting bugs & security issues

- Bugs and feature requests: [open an issue](https://github.com/arpitnayan123-bot/Nexura-OS/issues/new/choose) using the templates
- **Security vulnerabilities: do NOT open a public issue.** See [SECURITY.md](SECURITY.md) for responsible disclosure.
