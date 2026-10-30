#!/usr/bin/env node
/* ============================================================
   NEXURA OS — BUILD-TIME DATABASE SCHEMA SYNC
   Runs as part of `bun run build` (package.json) BEFORE
   `next build`. Purpose: a fresh hosted Postgres (Neon,
   Supabase, Vercel Postgres) attached to a PaaS deployment gets
   the Prisma schema applied automatically on the first deploy,
   and later deploys self-heal schema drift — without a manual
   `prisma migrate deploy` release gate.

   Behavior:
   - No DATABASE_URL            -> skip (pure static/build-time compile).
   - prisma+postgres:// (Accelerate / PgBouncer proxy URL) -> skip:
     DDL cannot run through Accelerate; run `prisma db push` or
     `prisma migrate deploy` against the direct URL once instead.
   - postgres:// / postgresql:// -> `prisma db push --skip-generate
     --accept-data-loss` (same semantics as the repo's `db:push`
     script and the sandbox guardian's heal path). Idempotent: a
     synced schema makes this a fast no-op.

   This step NEVER fails the build: a transient database outage at
   build time should not block a deploy whose runtime will retry
   the connection anyway. Failures are printed loudly to stdout.
   ============================================================ */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL || "";

function skip(reason) {
  console.log(`[db-sync] SKIPPED: ${reason}`);
  process.exit(0);
}

if (!url) skip("DATABASE_URL is not set — building without a runtime database.");
if (/^prisma\+postgres/i.test(url))
  skip("DATABASE_URL is a prisma+postgres:// proxy URL — run `prisma db push` against the direct URL once instead.");
if (!/^postgres(ql)?:\/\//i.test(url))
  skip("DATABASE_URL is not a postgres:// URL (packaged demo mode uses its own SQLite file).");

const repoRoot = process.cwd();
const prismaBin = path.join(repoRoot, "node_modules", ".bin", "prisma");
const cmd = existsSync(prismaBin) ? prismaBin : "npx";
const args = existsSync(prismaBin)
  ? ["db", "push", "--skip-generate", "--accept-data-loss"]
  : ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"];

console.log(`[db-sync] syncing Prisma schema to ${url.replace(/:\/\/[^@]*@/, "://***@")} ...`);
const res = spawnSync(cmd, args, { stdio: "inherit", env: process.env, shell: process.platform === "win32" });

if (res.error || (res.status && res.status !== 0)) {
  console.error(
    "[db-sync] prisma db push FAILED (build continues — the schema must be applied manually:\n" +
      "  DATABASE_URL=<your-postgres-url> npx prisma db push )",
  );
  if (res.error) console.error(String(res.error));
  process.exit(0);
}

console.log("[db-sync] schema is in sync.");
process.exit(0);
