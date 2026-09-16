import { describe, it, expect, afterEach } from "vitest";
import { assertProductionEnv } from "@/lib/env";

/* ============================================================
   BOOT-TIME ENV GATE (env-config-1)
   Production must refuse to boot without DATABASE_URL (postgres
   scheme), JWT_SECRET (>=16 chars) and REDIS_URL. Dev stays
   forgiving. These tests pin both behaviors.
   ============================================================ */

const SAVED = { ...process.env };

/** process.env.NODE_ENV is typed readonly by Next's env.d.ts — tests need
 *  to flip it, so all writes go through a widened view. */
function setEnv(key: string, value: string | undefined): void {
  (process.env as Record<string, string | undefined>)[key] = value;
}

afterEach(() => {
  // Restore the real environment for the next test file.
  const writable = process.env as Record<string, string | undefined>;
  for (const key of Object.keys(writable)) {
    if (!(key in SAVED)) delete writable[key];
  }
  Object.assign(writable, SAVED);
});

function withProduction(overrides: Record<string, string | undefined>) {
  setEnv("NODE_ENV", "production");
  setEnv("DATABASE_URL", overrides.DATABASE_URL);
  setEnv("JWT_SECRET", overrides.JWT_SECRET);
  setEnv("REDIS_URL", overrides.REDIS_URL);
}

describe("assertProductionEnv", () => {
  it("is a no-op outside production even when everything is missing", () => {
    setEnv("NODE_ENV", undefined);
    setEnv("DATABASE_URL", undefined);
    setEnv("JWT_SECRET", undefined);
    setEnv("REDIS_URL", undefined);
    expect(() => assertProductionEnv()).not.toThrow();
  });

  it("throws listing every missing required variable in production", () => {
    withProduction({ DATABASE_URL: undefined, JWT_SECRET: undefined, REDIS_URL: undefined });
    expect(() => assertProductionEnv()).toThrow(/DATABASE_URL[\s\S]*JWT_SECRET[\s\S]*REDIS_URL/);
  });

  it("rejects a non-postgres DATABASE_URL (SQLite is retired)", () => {
    withProduction({
      DATABASE_URL: "file:/home/z/my-project/db/custom.db",
      JWT_SECRET: "x".repeat(32),
      REDIS_URL: "redis://127.0.0.1:6379",
    });
    expect(() => assertProductionEnv()).toThrow(/postgres/);
  });

  it("rejects a short JWT_SECRET", () => {
    withProduction({
      DATABASE_URL: "postgresql://u:p@h:5432/nexura",
      JWT_SECRET: "short",
      REDIS_URL: "redis://127.0.0.1:6379",
    });
    expect(() => assertProductionEnv()).toThrow(/JWT_SECRET/);
  });

  it("passes with a complete production environment", () => {
    withProduction({
      DATABASE_URL: "postgresql://u:p@h:5432/nexura",
      JWT_SECRET: "x".repeat(32),
      REDIS_URL: "redis://127.0.0.1:6379",
    });
    expect(() => assertProductionEnv()).not.toThrow();
  });
});
