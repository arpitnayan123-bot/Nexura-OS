#!/usr/bin/env node
/* ============================================================
   NEXURA OS — PRISMA CLIENT FLAVOR SELECTOR (vercel-deploy-3)

   One code path decides which Prisma client is generated for a
   given build, so `bun run build` behaves identically locally, on
   the sandbox, and on Vercel.

   Decision matrix:
   - NEXURA_PRISMA_CLIENT=postgres|sqlite  -> explicit override.
   - Otherwise sqlite flavor when the build is a SERVERLESS DEMO
     build: (VERCEL=1 or NEXURA_DEMO_DB=1) and DATABASE_URL is
     not set. The deployment will boot on the committed embedded
     demo database (db/demo.db) — see src/lib/demo-db.ts.
   - Otherwise the default postgresql client (self-host, sandbox,
     PaaS with a real DATABASE_URL).

   Why: Vercel projects wired to this repo with zero environment
   configuration previously booted into `assertProductionEnv()`
   throwing -> every route 500'd. The app now ships a seeded
   SQLite demo database as a build artifact; the generated client
   must match the datasource the runtime will actually open
   (Prisma clients are provider-locked at generate time).

   The sqlite flavor schema (prisma/schema.demo.prisma) is
   GENERATED here from prisma/schema.prisma so the two can never
   drift: only the datasource block (provider + url) and the
   generator binaryTargets differ.
   ============================================================ */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const baseSchemaPath = path.join(repoRoot, "prisma", "schema.prisma");
const demoSchemaPath = path.join(repoRoot, "prisma", "schema.demo.prisma");

function skipIfMissingPrisma() {
  if (!existsSync(baseSchemaPath)) {
    console.error("[build-prisma] prisma/schema.prisma not found — nothing to generate.");
    process.exit(1);
  }
}

function prismaBin() {
  const local = path.join(repoRoot, "node_modules", ".bin", "prisma");
  if (existsSync(local)) return local;
  console.error("[build-prisma] node_modules/.bin/prisma missing — run install first.");
  process.exit(1);
}

/** Transform the canonical postgres schema into the sqlite demo schema. */
function generateDemoSchema() {
  const base = readFileSync(baseSchemaPath, "utf8");
  const lines = base.split("\n");
  // Pre-scan: does the generator block already pin binaryTargets?
  let inGenerator = false;
  let sawBinaryTargets = false;
  for (const line of lines) {
    if (/^generator\s+client\s*\{/.test(line)) inGenerator = true;
    if (inGenerator && /^\s*\}/.test(line)) inGenerator = false;
    if (inGenerator && /binaryTargets/.test(line)) sawBinaryTargets = true;
  }
  const out = [];
  let inDatasource = false;
  let generatorDone = false;
  let changed = 0;
  for (const line of lines) {
    if (/^datasource\s+\w+\s*\{/.test(line)) {
      inDatasource = true;
      out.push(line);
      continue;
    }
    if (inDatasource) {
      if (/^\s*provider\s*=\s*"postgresql"/.test(line)) {
        out.push(line.replace(/"postgresql"/, '"sqlite"'));
        changed++;
        continue;
      }
      if (/^\s*url\s*=/.test(line)) {
        // Keep the canonical DATABASE_URL variable so the runtime bootstrap
        // (src/lib/demo-db.ts) only has to set ONE variable — the generated
        // sqlite client reads the exact same env as the postgres client.
        if (!/env\("DATABASE_URL"\)/.test(line)) {
          out.push(line.replace(/env\([^)]*\)/, 'env("DATABASE_URL")'));
          changed++;
        } else {
          out.push(line);
        }
        continue;
      }
      if (/^\s*\}/.test(line)) {
        inDatasource = false;
        out.push(line);
        continue;
      }
      out.push(line);
      continue;
    }
    // Generator: pin binary targets so the engines Vercel's build image
    // downloads match the runtime image even if the two drift.
    if (!generatorDone && /^generator\s+client\s*\{/.test(line)) {
      out.push(line);
      continue;
    }
    if (!generatorDone && /^\s*provider\s*=\s*"prisma-client-js"/.test(line)) {
      out.push(line);
      if (!sawBinaryTargets) out.push('  binaryTargets = ["native", "rhel-openssl-3.0.x"]');
      generatorDone = true;
      continue;
    }
    // SQLite does not support named foreign keys: strip `map: "..."` inside
    // @relation(...) attributes (constraint names are cosmetic only — the
    // relations themselves are identical).
    if (/ @relation\(/.test(line) && /map:/.test(line)) {
      out.push(line.replace(/,\s*map:\s*"[^"]*"/g, ""));
      continue;
    }
    out.push(line);
  }
  const demo = out.join("\n");
  if (changed < 1 || !/provider\s*=\s*"sqlite"/.test(demo) || !/env\("DATABASE_URL"\)/.test(demo)) {
    console.error(
      `[build-prisma] unexpected schema.prisma shape (changed=${changed}) — refusing to write a broken demo schema.`,
    );
    process.exit(1);
  }
  writeFileSync(demoSchemaPath, demo);
}

function run(cmd, args, env) {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
  });
  if (res.error || (res.status && res.status !== 0)) {
    console.error(`[build-prisma] command failed: ${cmd} ${args.join(" ")}`);
    process.exit(res.status || 1);
  }
}

/* ---------------- decision ---------------- */
const explicit = process.env.NEXURA_PRISMA_CLIENT; // "postgres" | "sqlite"
const serverlessDemoBuild =
  (process.env.VERCEL === "1" || process.env.NEXURA_DEMO_DB === "1") && !process.env.DATABASE_URL;

let flavor;
if (explicit === "sqlite" || explicit === "postgres") {
  flavor = explicit;
} else if (serverlessDemoBuild) {
  flavor = "sqlite";
} else {
  flavor = "postgres";
}

const flavorNote = explicit
  ? " (explicit)"
  : serverlessDemoBuild
    ? " (serverless demo build)"
    : " (default)";
const dbNote = process.env.DATABASE_URL ? "" : " — DATABASE_URL not set at build time";
console.log(`[build-prisma] client flavor: ${flavor}${flavorNote}${dbNote}`);

mkdirSync(path.join(repoRoot, "prisma"), { recursive: true });
const bin = prismaBin();

if (flavor === "sqlite") {
  skipIfMissingPrisma();
  generateDemoSchema();
  console.log("[build-prisma] wrote prisma/schema.demo.prisma (sqlite demo flavor)");
  run(bin, ["generate", "--schema", "prisma/schema.demo.prisma"], {
    DEMO_DB_URL: process.env.DEMO_DB_URL || "file:./db/demo.db",
  });
} else {
  // Postgres flavor: make sure binaryTargets are pinned on the canonical
  // schema too (idempotent, one-time migration of the generator block).
  const base = readFileSync(baseSchemaPath, "utf8");
  if (!/binaryTargets/.test(base)) {
    const patched = base.replace(
      /provider\s*=\s*"prisma-client-js"/,
      'provider = "prisma-client-js"\n  binaryTargets = ["native", "rhel-openssl-3.0.x"]',
    );
    if (patched !== base) {
      writeFileSync(baseSchemaPath, patched);
      console.log("[build-prisma] pinned binaryTargets in prisma/schema.prisma");
    }
  }
  run(bin, ["generate"], {});
}

console.log("[build-prisma] prisma client generated.");
