#!/usr/bin/env node
/* ============================================================
   NEXURA OS — EMBEDDED DEMO DATABASE ARTIFACT BUILDER (vercel-deploy-3)

   Rebuilds the committed zero-config demo artifact db/demo.db:

     1. generate the SQLite Prisma client flavor (via
        scripts/build-prisma.mjs — the SAME selector the Vercel
        build uses, so artifact and runtime can never drift),
     2. push the full 165-model schema into db/demo.db,
     3. run the entire seed suite against it (the same scripts
        used for the sandbox/Postgres demo, all dialect-portable),
     4. VACUUM + checkpoint the file,
     5. regenerate the Postgres client so local development keeps
        working immediately afterwards.

   Run: node scripts/build-demo-db.mjs
   Commit the resulting db/demo.db — it is what a zero-config
   Vercel deployment boots on (src/lib/demo-db.ts).
   ============================================================ */

import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const dbPath = path.join(repoRoot, "db", "demo.db");
const DB_URL = `file:${dbPath}`;

function run(cmd, args, env = {}, label = "") {
  console.log(`\n[demo-db] >>> ${label || `${cmd} ${args.join(" ")}`}`);
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: repoRoot,
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
  });
  if (res.error || (res.status && res.status !== 0)) {
    console.error(`[demo-db] FAILED: ${label || `${cmd} ${args.join(" ")}`}`);
    process.exit(res.status || 1);
  }
}

const bunBin = process.env.BUN_BIN || "bun";

/* 1 — SQLite client flavor */
run("node", ["scripts/build-prisma.mjs"], { NEXURA_PRISMA_CLIENT: "sqlite", DEMO_DB_URL: DB_URL }, "generate sqlite client");

/* 2 — schema push */
run(bunBin, ["node_modules/.bin/prisma", "db", "push", "--schema", "prisma/schema.demo.prisma", "--skip-generate"], { DEMO_DB_URL: DB_URL, DATABASE_URL: DB_URL }, "push schema to db/demo.db");

if (!existsSync(dbPath)) {
  console.error("[demo-db] db/demo.db was not created — aborting.");
  process.exit(1);
}

/* 3 — seed suite (order matches package.json seed:suite) */
const seeds = [
  "scripts/legacy/seed-hospital.ts",
  "scripts/seed-nx.ts",
  "scripts/seed-nx-v4.ts",
  "scripts/seed-nx-v5.ts",
  "scripts/seed-hospital-bootstrap.ts",
  "scripts/legacy/seed-pharmacy.ts",
  "scripts/seed-pharmacy-compliance.ts",
  "scripts/seed-clinic-drugs.ts",
  "scripts/legacy/seed-clinic.ts",
  "scripts/seed-connect.ts",
  "scripts/seed-portal.ts",
  "scripts/seed-tourism.ts",
  "scripts/seed-chronic.ts",
  "scripts/seed-pie.ts",
];
for (const seed of seeds) {
  if (!existsSync(path.join(repoRoot, seed))) {
    console.warn(`[demo-db] seed missing, skipped: ${seed}`);
    continue;
  }
  run(bunBin, [seed], { DEMO_DB_URL: DB_URL, DATABASE_URL: DB_URL }, `seed ${seed}`);
}

/* 4 — compact */
run(bunBin, ["-e", `const {Database}=require('bun:sqlite'); const d=new Database(${JSON.stringify(dbPath)}); d.exec('VACUUM'); d.exec('PRAGMA wal_checkpoint(TRUNCATE)'); d.close();`], {}, "vacuum");

/* 5 — restore the Postgres client for local development */
run("node", ["scripts/build-prisma.mjs"], {}, "restore postgres client");

const sizeMb = (statSync(dbPath).size / (1024 * 1024)).toFixed(2);
console.log(`\n[demo-db] DONE — db/demo.db is ${sizeMb} MB. Commit it so zero-config Vercel deployments boot on it.`);
