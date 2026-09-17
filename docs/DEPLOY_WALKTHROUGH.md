# Deploy walkthrough — from zero to a live demo in ~15 minutes, $0

This is the click-by-click version of [docs/DEPLOYMENT.md](DEPLOYMENT.md). It takes the repo's one-click Vercel button and pairs it with two free-tier services so you end with a **public URL running the real app** — real sign-in, real RBAC, real audit trail — seeded with the 21-role demo dataset.

**What you'll create:**

| Service | Purpose | Free tier covers |
|---|---|---|
| [Vercel](https://vercel.com) | Hosting (Next.js + API routes) | Hobby plan, non-commercial |
| [Neon](https://neon.tech) | Postgres 17 database | ~0.5 GB storage, autosuspend |
| [Upstash](https://upstash.com) | Redis 7 (rate limiting, SSE bus, leases) | 10k commands/day |

> **Heads-up before you start:** this stack runs the app in **demo capacity** — synthetic data, demo logins, no real patient records. Putting real patient data behind a healthcare compliance umbrella (BAA, DPDP/HIPAA controls, audit review) is a different conversation; see [docs/SECURITY.md](SECURITY.md) first.

---

## Step 1 · Click the deploy button

From the repo README, click **Deploy** — or open:

```
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farpitnayan123-bot%2FNexura-OS&env=DATABASE_URL%2CJWT_SECRET%2CREDIS_URL&project-name=nexura-os&repository-name=Nexura-OS
```

Vercel asks to import the repository into your account (it creates its own copy under your username). Accept the defaults: framework **Next.js** is auto-detected, and the repo's `bun.lock` makes Vercel use **bun** for install + build. **Don't click Deploy yet** — the form asks for `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, and we don't have values yet. Leave the tab open.

## Step 2 · Neon — create the Postgres database

1. Sign up at [neon.tech](https://neon.tech) (GitHub login works).
2. **Create project** → name it `nexura` → pick the region closest to your users (Vercel's default `bom1` pairs well with **Mumbai / ap-south-1**).
3. Neon shows a **Connection string** panel. Choose **Pooled connection** (it routes through PgBouncer — the right choice for serverless functions that open many short-lived connections).
4. Copy the string. It looks like:
   `postgresql://USER:PASS@ep-xyz-pooler.region.aws.neon.tech/neondb?sslmode=require`

That string is your `DATABASE_URL`.

## Step 3 · Upstash — create the Redis

1. Sign up at [upstash.com](https://upstash.com) → **Create database**.
2. Name `nexura-redis`, region matching your Neon/Vercel region, **TLS enabled** (default).
3. From the database's **Details** page copy the endpoint as **`REDISS` URL** — it looks like:
   `rediss://default:PASSWORD@host.upstash.io:6379`

The app's Redis client (`src/lib/redis.ts`, ioredis) accepts both `redis://` and `rediss://` — the TLS form works with zero code changes. That's your `REDIS_URL`.

## Step 4 · Generate the JWT secret

Run this locally (or use any password generator):

```bash
openssl rand -hex 32
```

That's your `JWT_SECRET`. It signs session cookies — treat it like a password. (It is needed at **runtime only**; the build completes without it.)

## Step 5 · Fill the three variables and deploy

Back in the Vercel import tab, paste the values:

| Field | Value |
|---|---|
| `DATABASE_URL` | the Neon **pooled** connection string |
| `REDIS_URL` | the Upstash `rediss://` URL |
| `JWT_SECRET` | the `openssl rand -hex 32` output |

Click **Deploy**. First build takes 2–4 minutes (bun install → `prisma generate` → `next build`). When it finishes you'll get a URL like `https://nexura-os.vercel.app` — the app is running, but the database is **empty** (no schema yet). That's the next step.

## Step 6 · Clone the repo and initialize the database

Migrations and seeds live in the repo, so this step runs from a local clone (one time):

```bash
git clone https://github.com/arpitnayan123-bot/Nexura-OS.git && cd Nexura-OS
npm install                                   # postinstall runs prisma generate
npm install -g bun                            # the seed scripts run on bun (one-time)
DATABASE_URL="…neon url…" npx prisma migrate deploy     # applies all 8 migrations
DATABASE_URL="…neon url…" npx prisma migrate status     # → "Database schema is up to date!"
```

## Step 7 · Seed the demo dataset (recommended)

The demo sign-ins need seeded staff accounts:

```bash
DATABASE_URL="…neon url…" npm run seed:suite
```

This loads the complete demo dataset in the right order: base hospital + staff, the v4 demo dataset (21 staff across 17 roles, patients, MAR, billing), v5 extensions, then pharmacy stock, clinic, connect, portal, tourism, chronic-care and PIE signals. Credentials: password **`Demo@12345`** for every account, staff codes in [docs/DEMO_CREDENTIALS.md](DEMO_CREDENTIALS.md).

> Why `seed:suite` and not `seed:demo`: the demo seeder expects the **base hospital seed** to exist first — on a fresh database `seed:demo` alone fails with "no hospital found". `seed:suite` runs everything in the correct order and is idempotent.

(Skip this step and the deployment still works — you just get an empty hospital to register into.)

## Step 8 · Verify the deployment

| Check | Expected |
|---|---|
| `https://your-url.vercel.app/api/health` | `{"status":"ok"…}` |
| `https://your-url.vercel.app` | marketing homepage, linen theme |
| `/hospital` → "Explore demo roles" → sign in as `DR.RAJESH` | clinical workspace loads, live SSE alerts |
| Open a patient record, check the audit page | your access is already audited |

Boot-gate note: if any of the three variables were wrong or missing, the production boot gate (`assertProductionEnv`) **refuses to start** — you'll see a startup error naming the missing variable in Vercel → Deployments → Runtime Logs. Nothing half-configured ever serves traffic.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Runtime log: `assertProductionEnv` error | Missing/malformed env var | Vercel → Settings → Environment Variables; redeploy after fixing |
| `P1001: can't reach database` | Non-pooled Neon string, or typo | Use the **pooled** connection string, keep `?sslmode=require` |
| `WRONGPASS` / Redis connect fail | Copied non-TLS URL or stale password | Re-copy the `rediss://` URL from Upstash Details |
| Functions time out on first paint | Cold start + autosuspended Neon | First request wakes Neon (~1 s); enable Neon autoscale if it bothers you |
| Demo sign-in says account not found | Step 7 skipped or wrong DB | Re-run `seed:suite` against the **same** `DATABASE_URL` as the deployment |
| 429s on API routes | Upstash free tier 10k cmds/day | Expected at hobby scale; upgrade or burst-limit your testing |

## What to change before real users

1. **`DEMO_MODE=false`** (default) — never enable on real data.
2. **Neon branch/backup policy** — enable PITR; run `scripts/db-backup.sh` on a schedule if you self-manage backups.
3. **JWT_SECRET rotation plan** — see [docs/SECURITY.md](SECURITY.md).
4. **Region pinning** — `vercel.json` pins `bom1`; keep Neon + Upstash in the same region or add ~100–200 ms per DB round trip.
5. **Rate-limit budget** — Upstash free tier is demonstration-grade; production wants a paid tier or self-hosted Redis.
6. Read [docs/DEPLOYMENT.md](DEPLOYMENT.md) (rollback, backups, migrations) and the compliance posture note in the README — technical controls are implemented; organizational compliance is yours.
