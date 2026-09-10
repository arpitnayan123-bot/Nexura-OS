#!/usr/bin/env node
/* Nexura OS — restore validation.
   1. Restore the newest backup into a scratch DB (db/restore-check.db)
   2. Integrity-check it (PRAGMA integrity_check via Prisma raw)
   3. Assert row counts on critical tables match live DB
   Exits non-zero on any mismatch — wired for cron + CI. */
import { execSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const DIR = "db/backups";
const SCRATCH = "db/restore-check.db";
const files = readdirSync(DIR).filter((f) => f.endsWith(".db.gz")).sort();
if (!files.length) { console.error("no backups found"); process.exit(1); }
const newest = join(DIR, files[files.length - 1]);
rmSync(SCRATCH, { force: true });
execSync(`gzip -dc ${newest} > ${SCRATCH}`);
const scratch = new PrismaClient({ datasources: { db: { url: `file:${process.cwd()}/${SCRATCH}` } } });
const live = new PrismaClient();
const integrityRows = await scratch.$queryRawUnsafe("PRAGMA integrity_check;");
const integrity = integrityRows?.[0]?.["integrity_check"] ?? String(integrityRows?.[0]);
if (integrity !== "ok") { console.error(JSON.stringify({ ok: false, integrity })); process.exit(1); }
const tables = ["Hospital", "HospitalPatient", "NxStaffUser", "NxTask", "NxAuditEvent"];
const results = {};
for (const t of tables) {
  const [r] = await scratch.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "${t}"`);
  const [l] = await live.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "${t}"`);
  results[t] = { restored: Number(r.c), live: Number(l.c) };
}
await scratch.$disconnect();
await live.$disconnect();
const drift = Object.entries(results).filter(([, v]) => v.restored !== v.live);
console.log(JSON.stringify({ ok: drift.length === 0, backup: newest, integrity, counts: results }));
process.exit(drift.length === 0 ? 0 : 2);
