#!/usr/bin/env node
/* Nexura OS — DB backup rotation (PostgreSQL).
   Dumps DATABASE_URL with pg_dump custom format (-Fc, compressed) into
   db/backups/ and retains the newest --keep N files (default 14).
   The sandboxed (rootless) Postgres install is auto-detected; on a
   normal host pg_dump comes from PATH.
   Usage: node scripts/db-backup.mjs [--keep 14]
   Produces: db/backups/nexura-YYYYMMDD-HHMMSS.dump */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";

// Env resolution: process env first; a non-postgres inherited value (e.g.
// sandbox-injected file: URL) falls back to the repo .env — the source of truth.
let DATABASE_URL = process.env.DATABASE_URL || "";
if (!/^postgres(ql)?:\/\//.test(DATABASE_URL)) {
  try {
    const envFile = readFileSync(".env", "utf8");
    const line = envFile.split("\n").find((l) => l.startsWith("DATABASE_URL="));
    if (line) DATABASE_URL = line.slice("DATABASE_URL=".length).trim();
  } catch {
    /* no .env — will fail below with a clear message */
  }
}
if (!/^postgres(ql)?:\/\//.test(DATABASE_URL)) {
  console.error("DATABASE_URL is not a postgres URL — refusing to dump");
  process.exit(1);
}

function postgresBinDirs() {
  const dirs = [];
  for (const base of [
    "/usr/lib/postgresql",
    join(process.env.HOME ?? "", "pg-install/rootfs/usr/lib/postgresql"),
  ]) {
    try {
      for (const v of readdirSync(base)) dirs.push(join(base, v, "bin"));
    } catch {
      /* base not present */
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

const pgDump = findBin("pg_dump");
if (!pgDump) {
  console.error("pg_dump not found (PATH or /usr/lib/postgresql/*)");
  process.exit(1);
}

const KEEP = Number(
  process.argv.includes("--keep") ? process.argv[process.argv.indexOf("--keep") + 1] : 14,
);
const DIR = "db/backups";
mkdirSync(DIR, { recursive: true });
const ts = new Date().toISOString().replace(/[-:T]/g, "").replace(".", "").slice(0, 14);
const out = join(DIR, `nexura-${ts}.dump`);

// -Fc: custom format (internally compressed, restore-flexible). Never a
// shell string — URL may contain credentials; execFileSync avoids leaks.
execFileSync(pgDump, ["--no-password", "-Fc", "-f", out, DATABASE_URL], {
  stdio: ["ignore", "ignore", "inherit"],
});
const size = statSync(out).size;
if (size < 1024) {
  console.error(`backup suspiciously small (${size}B) — failing`);
  process.exit(1);
}
const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".dump"))
  .sort();
while (files.length > KEEP) unlinkSync(join(DIR, files.shift()));
console.log(JSON.stringify({ ok: true, backup: out, bytes: size, retained: files.length }));
