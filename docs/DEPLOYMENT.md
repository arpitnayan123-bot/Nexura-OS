# Deployment Guide

## Local development
```bash
bun install && bun run db:push && bun run seed:demo && bun run dev
```

## Production build
```bash
bun run build     # standalone output (.next/standalone)
bun run start     # NODE_ENV=production bun .next/standalone/server.js
```

## Docker
```bash
docker compose up --build -d
docker compose exec app node -e "fetch('http://127.0.0.1:3000/api/ready').then(r=>r.json()).then(console.log)"
```
The image is multi-stage, runs as non-root, exposes a healthcheck, and mounts
`/app/db` as a volume for SQLite.

## Database migrations (production)
```bash
bunx prisma migrate dev      # dev: create migration from schema changes
bunx prisma migrate deploy   # prod: apply pending migrations
```
SQLite dev pushes (`db:push`) are for iteration only — always cut a migration
before release.

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
