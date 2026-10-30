# Nexura OS — Deployment Guide

> **Live instance:** the published platform preview runs at
> **[n13xb70qvnr0-d.space-z.ai](https://n13xb70qvnr0-d.space-z.ai/)**
> (demo logins: password `Demo@12345`, staff PIN `2468`). Everything below ships your own copy.

## Zero-Config Demo Deployments (Vercel) — vercel-deploy-3

Importing the repo into Vercel and deploying **with no environment variables at
all** is explicitly supported. The deployment boots in **demo posture**:

- `scripts/build-prisma.mjs` (runs first in `bun run build`) detects the
  serverless build (`VERCEL=1`, no `DATABASE_URL`) and generates the **SQLite
  Prisma client flavor** from the same canonical schema (provider swap only —
  the schema is fully dialect-portable: no arrays, no enums, no native types,
  no `dbgenerated`).
- The repo ships a **seeded demo database artifact** (`db/demo.db`, ~5 MB,
  all 165 models + the full demo seed suite; regenerate with
  `node scripts/build-demo-db.mjs`). `next.config.ts` traces it into every
  serverless function bundle via `outputFileTracingIncludes`.
- At boot, `src/lib/demo-db.ts` (wired from `src/instrumentation.ts`)
  copies the artifact to `/tmp/nexura-demo.db` and points `DATABASE_URL` at
  it, defaulting `DEMO_MODE=true` unless explicitly set to `false`.
- `assertProductionEnv()` no longer hard-refuses a zero-config serverless
  boot: without `JWT_SECRET` it mints an **ephemeral per-boot secret**
  (logged CRITICAL — sessions reset on every cold start) and a missing data
  layer only logs CRITICAL instead of killing the process.
- The edge proxy (`src/proxy.ts`) keeps the demo product surfaces open for
  this exact posture (`VERCEL=1` + neither `DEMO_MODE` nor `JWT_SECRET`
  configured); any real configuration restores the production gate.

What this mode is NOT: persistent or multi-instance. Each serverless instance
materializes its own throwaway copy — writes never outlive the instance and
instances do not share data. The moment you set `DATABASE_URL` (any hosted
Postgres) and redeploy, the demo artifact is ignored and the deployment uses
your real database.

> Edge-env caveat: `process.env` reads inside the edge proxy are inlined at
> build time. Changing `DEMO_MODE`/`JWT_SECRET` for the gate requires a
> redeploy, not just a dashboard save.

## Prerequisites

1. A [Vercel](https://vercel.com) account
2. A [GitHub](https://github.com) repository with the Nexura OS code
3. A PostgreSQL database (recommended: [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres))

## Step 1: Push to GitHub

```bash
git add -A
git commit -m "production-ready"
git push origin main
```

## Step 2: Create Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Framework preset: **Next.js** (auto-detected)
4. Root directory: `./` (default)

## Step 3: Configure Environment Variables

In Vercel → Project Settings → Environment Variables, add:

| Variable       | Value                                 | Required                                                                                |
| -------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL` | `postgresql://user:pass@host:port/db` | Real deployments ✅ — omit for the zero-config demo posture (embedded demo DB)          |
| `JWT_SECRET`   | Generate with `openssl rand -hex 32`  | Real deployments ✅ — omit for the zero-config demo posture (ephemeral per-boot secret) |
| `REDIS_URL`    | `redis://default:pass@host:6379`      | Optional (serverless)                                                                   |
| `DEMO_MODE`    | `true` on demo deployments            | Optional (auto-`true` in the zero-config demo posture)                                  |

**Note:** the server refuses to boot in production without `DATABASE_URL` and
`JWT_SECRET` — see `assertProductionEnv()` in `src/lib/env.ts`. `REDIS_URL` is
required on self-hosted VM/container boots, but on serverless/PaaS runtimes
(Vercel is auto-detected via `VERCEL=1`; force with `NEXURA_REDIS_OPTIONAL=1`)
the boot gate only logs a loud warning and both Redis-backed layers fall back
to their documented single-instance modes (in-process rate limiting,
local-only event bus). Set `REDIS_URL` (e.g. Upstash) to restore
cross-instance semantics. Full variable reference: [`.env.example`](.env.example).
No AI API keys are needed — z-ai-web-dev-sdk is pre-configured.

## Step 4: Database Setup

### Option A: Vercel Postgres (easiest)

1. In Vercel dashboard → Storage → Create Database → Postgres
2. Copy the connection string
3. Set as `DATABASE_URL` environment variable

### Option B: Neon (recommended for free tier)

1. Go to [neon.tech](https://neon.tech) → Create project
2. Copy connection string
3. Set as `DATABASE_URL`

### Option C: Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. Settings → Database → Connection string
3. Set as `DATABASE_URL`

## Step 5: Apply Schema to Production DB

**Automatic since v1.2.1:** every production build runs
`node scripts/db-sync.mjs` between `prisma generate` and `next build` — when
`DATABASE_URL` is a postgres:// URL the schema is applied with
`prisma db push --skip-generate --accept-data-loss` (idempotent; a synced
schema is a fast no-op). A fresh hosted database is therefore provisioned by
the first deploy itself, and schema drift self-heals on later deploys.

Prefer explicit migrations? Apply the shipped history instead and the build's
sync becomes a no-op:

```bash
# Set DATABASE_URL to your production PostgreSQL
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Run this as a release-gate step (CI job, deploy hook, or one-off container)
— never disable it silently. Verify afterwards with
`node scripts/db-backup.mjs` + `node scripts/db-restore-validate.mjs`
(pg_dump-based backup/restore validation).

## Step 6: DO NOT Seed a Production Database

The `scripts/seed-*.ts` files write **demo data**: synthetic patients, staff
accounts with the published demo password `Demo@12345`, and a demo partner
API key. Seeding them into production would create known-credential accounts
with access to real patient records.

Every seed script refuses to run when `NODE_ENV=production` unless
`SEED_DEMO_OVERRIDE=true` is set explicitly. Production setup ends at Step 5:
create the first hospital and staff through the onboarding flow (`/api/nx/onboard`)
or a controlled admin bootstrap — never through the demo seeds.

## Step 7: Deploy

Click **Deploy** in Vercel. The build will:

1. Install dependencies (`bun install`)
2. Select the Prisma client flavor (`node scripts/build-prisma.mjs` — postgres
   with a real `DATABASE_URL`, SQLite demo flavor on a zero-config serverless
   build) and generate the client
3. Sync the schema when a real Postgres is attached (`node scripts/db-sync.mjs`)
4. Build Next.js (`next build`)
5. Deploy to Vercel's edge network

## Step 8: Verify

After deployment, check:

- `https://your-app.vercel.app/` → Homepage loads
- `https://your-app.vercel.app/api/health` → Returns `{"status":"ok"}`
- `https://your-app.vercel.app/hospital` → Hospital OS loads
- `https://your-app.vercel.app/portal/login` → Portal login works

## Custom Domain

1. Vercel → Project Settings → Domains
2. Add your domain (e.g., `nexuraai.in`)
3. Configure DNS records as instructed
4. SSL is automatic

## PostgreSQL Migration Notes

When migrating from SQLite to PostgreSQL:

1. **Schema:** `bunx prisma db push` (with PostgreSQL DATABASE_URL)
2. **Data:** Seed scripts are idempotent — safe to re-run
3. **SQLite-specific:** Prisma handles the dialect difference automatically
4. **Connection pooling:** Use connection string with `?schema=public&connection_limit=5`

## Environment Variables Checklist

- [ ] `DATABASE_URL` — PostgreSQL connection string
- [ ] `JWT_SECRET` — 64-character hex string
- [ ] `REDIS_URL` — optional on serverless (fallbacks active), required self-hosted
- [ ] `NODE_ENV` — `production` (set automatically by Vercel)
- [ ] No secrets in Git
- [ ] No hardcoded API keys
- [ ] `.env` is in `.gitignore`

## Troubleshooting

### Build fails: "Cannot find module '@prisma/client'"

Add to `package.json`:

```json
"postinstall": "prisma generate"
```

### Runtime: every page returns 500 (x-next-error-status: 500)

**Read the boot mode first.** Since vercel-deploy-3, a zero-config serverless
boot no longer dies: it attaches the embedded demo database and mints an
ephemeral JWT secret, logging both loudly. A 500-everywhere deployment is
therefore a _different_ failure — check Vercel → Project → Functions logs:

- `production boot gate FAILED` (self-hosted only) — names the missing
  variable exactly: `DATABASE_URL is required`, `DATABASE_URL must be a
postgres:// URL`, `JWT_SECRET must be set (>=16 chars)`, `REDIS_URL is
required`.
- `CRITICAL: DATABASE_URL is not set and the embedded demo database could
not be attached` — the function bundle is missing `db/demo.db` (rebuild —
  `next.config.ts` must trace it via `outputFileTracingIncludes`) or `/tmp`
  was unwritable. The deployment serves but data-backed routes fail.
- `Prisma Client could not locate the Query Engine` — the build generated a
  client for the wrong platform. `schema.prisma` pins
  `binaryTargets = ["native", "rhel-openssl-3.0.x"]`; confirm the build ran
  `node scripts/build-prisma.mjs` (not a bare `prisma generate`) and that the
  build image matches the Node runtime (Amazon Linux).
- Historical note (fixed in vercel-deploy-2): `REDIS_URL` used to be a hard
  requirement and killed every cold start on Vercel; it is now optional
  everywhere serverless (auto via `VERCEL=1`).

After adding variables, **Redeploy** (Deployments → ⋯ → Redeploy) — env
changes never apply to already-running instances, and edge-proxy env reads
are inlined at build time (see the caveat in the zero-config section).

### Runtime: "Database connection failed"

- Check `DATABASE_URL` is set in Vercel
- Ensure PostgreSQL allows connections from Vercel's IP range
- Try connection pooling (add `?pgbouncer=true` to connection string)

### AI features not working

- z-ai-web-dev-sdk should work out of the box
- Check `/api/health` endpoint for AI service status
- Check Vercel function logs for errors

### Large build size

- Ensure `skills/`, `video-*`, `tool-results/` are in `.gitignore` (they are)
- Run `bun run lint` to check for unused imports
