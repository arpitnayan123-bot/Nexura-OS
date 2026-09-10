#!/usr/bin/env node
/* Nexura OS — DB backup rotation (SQLite dev/small-facility profile).
   Postgres deployments should use pg_dump/WAL archiving (see docs/DATABASE.md);
   this script covers the file-dialect and the demo container.
   Usage: node scripts/db-backup.mjs [--keep 14]
   Produces: db/backups/custom-YYYYMMDD-HHMMSS.db.gz + latest symlink target */
import { execSync } from "node:child_process";
import { readdirSync, statSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const KEEP = Number(process.argv.includes("--keep") ? process.argv[process.argv.indexOf("--keep") + 1] : 14);
const DB = "db/custom.db";
const DIR = "db/backups";
if (!existsSync(DB)) { console.error("no database at", DB); process.exit(1); }
mkdirSync(DIR, { recursive: true });
const ts = new Date().toISOString().replace(/[-:T]/g, "").replace(".","").slice(0, 14);
const out = join(DIR, `custom-${ts}.db.gz`);
execSync(`gzip -c ${DB} > ${out}`);
const files = readdirSync(DIR).filter((f) => f.endsWith(".db.gz")).sort();
while (files.length > KEEP) unlinkSync(join(DIR, files.shift()));
const size = statSync(out).size;
console.log(JSON.stringify({ ok: true, backup: out, bytes: size, retained: files.length }));
