# Nexura OS — Deployment Guide

> **Live instance:** the published platform preview runs at
> **[n13xb70qvnr0-d.space-z.ai](https://n13xb70qvnr0-d.space-z.ai/)**
> (demo logins: password `Demo@12345`, staff PIN `2468`). Everything below ships your own copy.

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

| Variable       | Value                                 | Required |
| -------------- | ------------------------------------- | -------- |
| `DATABASE_URL` | `postgresql://user:pass@host:port/db` | ✅ Yes   |
| `JWT_SECRET`   | Generate with `openssl rand -hex 32`  | ✅ Yes   |
| `REDIS_URL`    | `redis://default:pass@host:6379`      | Optional (serverless) |

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
2. Generate Prisma client (`prisma generate`)
3. Build Next.js (`next build`)
4. Deploy to Vercel's edge network

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

The production boot gate (`assertProductionEnv()` in `src/lib/env.ts`, wired
from `src/instrumentation.ts`) refuses to boot and every serverless function
fails at cold start. Check Vercel → Project → Functions logs for
`production boot gate FAILED` — it names the exact missing variable:

- `DATABASE_URL is required` → set it (Step 3/4)
- `DATABASE_URL must be a postgres:// URL` → you left a `file:` SQLite URL in
- `JWT_SECRET must be set (>=16 chars)` → generate one (`openssl rand -hex 32`)
- `REDIS_URL is required` → set it, or rely on the serverless fallback
  (auto on Vercel / `NEXURA_REDIS_OPTIONAL=1`)

After adding variables, **Redeploy** (Deployments → ⋯ → Redeploy) — env
changes never apply to already-running instances.

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
