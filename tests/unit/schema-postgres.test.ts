import { describe, it, expect, afterEach } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

/* ============================================================
   SCHEMA GUARD (pg-migration-1)
   Cheap regression fence: the datasource must stay PostgreSQL
   and the migrations history must ship with the repo. A silent
   provider flip (or a deleted migration dir) would break every
   production deployment while looking fine locally.
   ============================================================ */

const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

describe("prisma schema", () => {
  it("declares postgresql as the only datasource provider", () => {
    expect(schema).toMatch(/provider\s*=\s*"postgresql"/);
    expect(schema).not.toMatch(/provider\s*=\s*"sqlite"/);
  });

  it("ships a migrations history with a postgresql lock file", () => {
    const migrationsDir = join(process.cwd(), "prisma/migrations");
    expect(existsSync(migrationsDir)).toBe(true);
    const lock = readFileSync(join(migrationsDir, "migration_lock.toml"), "utf8");
    expect(lock).toContain('provider = "postgresql"');
    const entries = readdirSync(migrationsDir).filter((e) => !e.startsWith("."));
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      if (entry === "migration_lock.toml") continue;
      expect(
        existsSync(join(migrationsDir, entry, "migration.sql")),
        `migration ${entry} has migration.sql`,
      ).toBe(true);
    }
  });

  it("has no Prisma enums or Json fields (deliberate: String-status + String-JSON design)", () => {
    // This is a documented decision, not an oversight — see schema header.
    // If it ever changes, update PRODUCTION_STATUS.md's data-layer table.
    expect(schema).not.toMatch(/^\s*enum\s+/m);
    expect(schema).not.toMatch(/:\s*Json\b/);
  });
});
