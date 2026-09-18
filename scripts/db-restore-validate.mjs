#!/usr/bin/env node
/* Nexura OS — restore validation (PostgreSQL).
   1. Pick the newest db/backups/nexura-*.dump (pg_dump -Fc)
   2. Restore it into a scratch database (nexura_restore_check) with pg_restore
   3. Assert row counts on critical tables match the live database
   Exits non-zero on any mismatch — wired for cron + CI. */
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

// Same env resolution as db-backup.mjs: process env first, .env fallback.
let DATABASE_URL = process.env.DATABASE_URL || "";
if (!/^postgres(ql)?:\/\//.test(DATABASE_URL)) {
  try {
    const line = readFileSync(".env", "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    if (line) DATABASE_URL = line.slice("DATABASE_URL=".length).trim();
  } catch {
    /* fail below */
  }
}
if (!/^postgres(ql)?:\/\//.test(DATABASE_URL)) {
  console.error("DATABASE_URL is not a postgres URL — refusing to validate");
  process.exit(1);
}
// Base connection parts (for createdb/dropdb against the admin db)
const pgUrl = new URL(DATABASE_URL);
const PG_HOST = pgUrl.hostname;
const PG_PORT = pgUrl.port || "5432";
const PG_USER = pgUrl.username || "nexura";
const connArgs = ["-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER];

function postgresBinDirs() {
  const dirs = [];
  for (const base of [
    "/usr/lib/postgresql",
    join(process.env.HOME ?? "", "pg-install/rootfs/usr/lib/postgresql"),
  ]) {
    try {
      for (const v of readdirSync(base)) dirs.push(join(base, v, "bin"));
    } catch {
      /* absent */
    }
  }
  return dirs;
}
function findBin(name) {
  const dirs = [...(process.env.PATH ?? "").split(":").filter(Boolean), ...postgresBinDirs()];
  for (const p of dirs) {
    const candidate = join(p, name);
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      /* next */
    }
  }
  return null;
}

const DIR = "db/backups";
const SCRATCH = "nexura_restore_check";
const files = existsIn(DIR)
  ? readdirSync(DIR)
      .filter((f) => f.endsWith(".dump"))
      .sort()
  : [];
function existsIn(d) {
  try {
    readdirSync(d);
    return true;
  } catch {
    return false;
  }
}
if (!files.length) {
  console.error("no backups found in db/backups — run db-backup.mjs first");
  process.exit(1);
}
const newest = join(DIR, files[files.length - 1]);

const pgRestore = findBin("pg_restore");
const dropdb = findBin("dropdb");
const createdb = findBin("createdb");
if (!pgRestore || !dropdb || !createdb) {
  console.error("pg_restore/dropdb/createdb not found");
  process.exit(1);
}

// Scratch DB lifecycle: drop leftovers, create fresh, restore.
execFileSync(dropdb, [...connArgs, "--if-exists", SCRATCH], {
  stdio: ["ignore", "ignore", "inherit"],
});
execFileSync(createdb, [...connArgs, SCRATCH], { stdio: ["ignore", "ignore", "inherit"] });
// Restore failures are fatal; --exit-autovac? no: -x skips ACL/ownership noise
// that differs between environments; data + schema must restore cleanly.
execFileSync(
  pgRestore,
  [
    "--no-password",
    "--no-owner",
    "--no-privileges",
    "-x",
    "-d",
    DATABASE_URL.replace(/\/[^/?]+(\?|$)/, `/${SCRATCH}$1`),
    newest,
  ],
  { stdio: ["ignore", "ignore", "inherit"] },
);

const scratch = new PrismaClient({
  datasources: { db: { url: DATABASE_URL.replace(/\/[^/?]+(\?|$)/, `/${SCRATCH}$1`) } },
});
const live = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });
const tables = ["Hospital", "HospitalPatient", "NxStaffUser", "NxTask", "NxAuditEvent"];
const results = {};
for (const t of tables) {
  const [r] = await scratch.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "${t}"`);
  const [l] = await live.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "${t}"`);
  results[t] = { restored: Number(r.c), live: Number(l.c) };
}
await scratch.$disconnect();
await live.$disconnect();
execFileSync(dropdb, [...connArgs, "--if-exists", SCRATCH], {
  stdio: ["ignore", "ignore", "inherit"],
});
const drift = Object.entries(results).filter(([, v]) => v.restored !== v.live);
console.log(JSON.stringify({ ok: drift.length === 0, backup: newest, counts: results }));
process.exit(drift.length === 0 ? 0 : 2);
