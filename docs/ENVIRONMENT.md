# Environment Variable Reference

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Prisma connection. Dev: `file:/home/z/my-project/db/custom.db`. Production: swap datasource to Postgres in `prisma/schema.prisma` and provide the URL. |
| `JWT_SECRET` | **yes in prod** | dev fallback + warning | Signing key for session JWTs & MFA step-up tokens. Generate: `openssl rand -hex 32`. |
| `DEMO_MODE` | no | `true` (unless `=false`) | Demo banner, demo reset tooling. **Must be `false` in production.** |
| `NEXURA_MODE` | no | `local` | `local` = in-app platform adapters. `remote` = production Nexura services (see NEXURA_INTEGRATION.md). |
| `NEXURA_API_URL` | only if remote | — | Base URL of the Nexura platform API. |
| `EMAIL_TRANSPORT` | no | `console` | `console` logs reset/verification links to the server log (demo). `smtp` = wire your provider (integration point in `/api/nx/auth/password`). |
| `PORT` | no | `3000` | HTTP port (standalone build honors it). |
| `NODE_ENV` | set by runtime | development | `production` enables Secure cookies, HSTS, CSP enforcement, stricter env validation. |

`.env` is gitignored — never commit secrets. `.env.example` documents the full set.
Environment validation (`src/lib/env.ts`) warns in dev and **fails readiness in
production** when `JWT_SECRET` is missing.
