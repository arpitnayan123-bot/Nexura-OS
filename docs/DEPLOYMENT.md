# Deployment Guide

## Local development
```bash
bun install && bun run db:push && bun run seed:demo && bun run dev
```

## Production build
```bash
bun run build               # platform-neutral: prisma generate + next build
bun run build:standalone    # self-host packaging: + static/public copied into .next/standalone
bun run start               # NODE_ENV=production bun .next/standalone/server.js
```
`build` is what PaaS platforms (Vercel etc.) should run — no filesystem
packaging steps. `build:standalone` is what Docker and self-hosted runs use.
`postinstall` also runs `prisma generate` so the client exists on any CI
before the build's page-data collection evaluates route modules.

**Builds require no secrets** (vercel-deploy-2): the JWT signing secret is
resolved lazily on first sign/verify — not at module evaluation — so
`next build` completes even with zero environment variables (verified by
building with every var masked). This changes nothing at runtime: the boot
gate (`assertProductionEnv`) still refuses to serve a production deployment
without `DATABASE_URL` / `JWT_SECRET` / `REDIS_URL`, and the first sign/verify
without a real secret throws the same fail-fast error. A green build is not
a working app — the three variables below are still mandatory.

## Docker
```bash
docker compose up --build -d
docker compose exec app node -e "fetch('http://127.0.0.1:3000/api/ready').then(r=>r.json()).then(console.log)"
```
The image is multi-stage, runs as non-root, and exposes a healthcheck. The
compose stack pairs the app with Postgres 17 + Redis 7 (persistent `pg-data`
volume) and wires `DATABASE_URL` / `REDIS_URL` / `JWT_SECRET` automatically
for local production-like runs.

## Database migrations (production)
```bash
bunx prisma migrate dev      # dev: create migration from schema changes
bunx prisma migrate deploy   # prod: apply pending migrations
```
SQLite dev pushes (`db:push`) are for iteration only — always cut a migration
before release.

## Vercel
The repo carries `bun.lock`, so Vercel auto-detects **bun** as the package
manager (`bun install` -> `bun run build`). The build runs `prisma generate`
first, so the Prisma client always exists during page-data collection.

**Required environment variables** (Project -> Settings -> Environment
Variables; the runtime boot gate `assertProductionEnv` refuses to serve
without all three):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Hosted Postgres (Vercel Postgres/Neon/Supabase). Local `127.0.0.1` is unreachable from Vercel |
| `JWT_SECRET` | `openssl rand -hex 32` (>=16 chars) — runtime-only; the build no longer needs it |
| `REDIS_URL` | Upstash Redis (Storage tab integration) — rate limiting, SSE event bus, sync leases are Redis-backed |

**Recommended:** `NEXT_PUBLIC_SITE_URL` (your Vercel URL), `DEMO_MODE=true`
only if the deployment is a demo (enables demo quick-login surfaces; the env
validator warns in production), `OPENROUTER_API_KEY` for AI features (the
fallback provider path may not resolve on Vercel).

**Schema:** Vercel does not run migrations. From a machine with the repo:
```bash
DATABASE_URL="<neon-url>" npx prisma migrate deploy
# optional demo data:
DATABASE_URL="<neon-url>" bun scripts/seed-nx-v4.ts
```

**Honest caveats:** serverless functions are not ideal for long-lived SSE
connections (Hobby plan function timeouts apply — the UI reconnects, but
treat real-time as best-effort on Vercel). The in-process job runner is
per-instance on serverless; set `NEXURA_JOBS=0` on web functions and run a
scheduled/cron job for background work if you rely on it. Redis-backed rate
limiting is shared across instances; without `REDIS_URL` the boot gate fails
by design — no silent per-instance fallback in production.

## Environment
See docs/ENVIRONMENT.md. Secrets via your platform's secret manager — never in
git. Minimum set: `DATABASE_URL`, `JWT_SECRET`, `DEMO_MODE=false`,
`NEXURA_MODE`, `EMAIL_TRANSPORT`.

## CI
GitHub Actions (`.github/workflows/ci.yml`): prisma validate/generate → tsc src
gate → lint → unit tests → db push + demo seed → boot dev server → API smoke
suite → secret scan. Extend with the E2E job when browsers are available on the
runner (`bunx playwright install --with-deps chromium`).

## Rollback
See docs/INCIDENT_RESPONSE.md → "Rollback procedure" (code roll-forward-only
migrations, restore DB volume when needed).

## Backups
- Dev/demo: `sqlite3 db/custom.db ".backup 'backups/$(date +%F).db'"`
- Production: nightly snapshot of the DB volume + Litestream/WAL shipping for
  point-in-time recovery. Test restores quarterly (see TESTING.md).
