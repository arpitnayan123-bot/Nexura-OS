# Nexura OS — Database Portability & Operations Runbook

## Dialect strategy

| | SQLite (default) | PostgreSQL (production) |
|---|---|---|
| Use | dev, seeds, demos, small facilities | enterprise clusters |
| Config | `DATABASE_URL="file:./db/custom.db"` | `DATABASE_URL=postgres://…` + `DATABASE_PROVIDER=postgres` |
| Pooling | n/a (single writer) | `DB_POOL_SIZE=10`, pgbouncer in front |
| Read scaling | none | `DB_READ_URL` replica → analytics/exports via `readDb()` |
| Tx policy | 15s interactive cap | 8s interactive cap (row-lock contention) |

Runtime policy lives in `src/lib/nx/db-dialect.ts` (`dbProfile()`, `withTx()`, `readDb()`, dialect-safe search). All Prisma models already use portable types: String ids (cuid), String JSON columns, Float, DateTime, Int — no SQLite-only column types, so the same schema pushes to Postgres via:

```bash
DATABASE_URL=postgres://… npx prisma db push   # or migrate deploy
```

### Upgrade path preserving historical data

1. Take final SQLite backup: `node scripts/db-backup.mjs --keep 30`
2. Provision Postgres; set env; `npx prisma db push`
3. Bulk-copy with the data pump (per-table `COPY` via `scripts/legacy → docs` reference; the seed chain re-hydrates demo data deterministically if a fresh start is preferred)
4. Validate: `node scripts/db-restore-validate.mjs` against the pumped cluster snapshot; run `bash tests/api-smoke.sh`
5. Flip traffic. SQLite file stays as cold fallback for 30 days (retention profile `strict`).

## Backup & restore (SQLite profile)

- Rotate daily: `node scripts/db-backup.mjs --keep 14` (gzip'd, `db/backups/`)
- Restore drill: `node scripts/db-restore-validate.mjs` — restores newest backup to scratch, runs `PRAGMA integrity_check`, asserts row counts on Hospital / HospitalPatient / NxStaffUser / NxTask / NxAuditEvent vs live. Exit 2 on drift. Schedule via cron (Phase 3 ops).
- PITR: SQLite profile approximates PITR by keeping N daily + M hourly backups (cron granularity). The Postgres profile uses WAL archiving (`archive_command`) for true PITR — documented for Phase 1 infra.

## Restore validation tests

`scripts/db-restore-validate.mjs` is the executable acceptance test: any restore that fails integrity or drifts row counts fails loudly. CI wiring: run after `seed:all` with a synthetic backup (see `docs/TESTING.md` additions).

## Known limits

- `withTx` serializes cross-hospital bulk ops on SQLite; on Postgres split by `hospitalId` chunks (`batchChunkSize`).
- Replica reads are eventual — never route sign/verify/dispense through `readDb()`.
