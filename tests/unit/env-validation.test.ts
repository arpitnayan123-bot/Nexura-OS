import { describe, it, expect, afterEach } from "vitest";
import { assertProductionEnv } from "@/lib/env";

/* ============================================================
   BOOT-TIME ENV GATE (env-config-1 + vercel-deploy-3)
   Self-hosted production refuses to boot without DATABASE_URL
   (postgres scheme) and JWT_SECRET (>=16 chars). REDIS_URL is
   required on self-hosted (non-serverless) deployments, but
   OPTIONAL when the app detects a serverless/PaaS runtime
   (VERCEL=1), the packaged demo mode (NEXURA_PACKAGED=1), or via
   explicit opt-in (NEXURA_REDIS_OPTIONAL=1).

   Zero-config serverless (vercel-deploy-3): a Vercel deployment
   with NO DATABASE_URL / JWT_SECRET must NOT dead-boot (every
   route 500'd before this). The boot degrades loudly instead:
   an ephemeral JWT secret is generated (sessions reset per cold
   start) and a missing data layer only logs CRITICAL — the
   instrumentation bootstrap attaches the bundled seeded SQLite
   demo database before this gate even runs.
   These tests pin all postures.
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
  setEnv("VERCEL", overrides.VERCEL);
  setEnv("NEXURA_PACKAGED", overrides.NEXURA_PACKAGED);
  setEnv("NEXURA_REDIS_OPTIONAL", overrides.NEXURA_REDIS_OPTIONAL);
}

describe("assertProductionEnv", () => {
  it("is a no-op outside production even when everything is missing", () => {
    setEnv("NODE_ENV", undefined);
    setEnv("DATABASE_URL", undefined);
    setEnv("JWT_SECRET", undefined);
    setEnv("REDIS_URL", undefined);
    expect(() => assertProductionEnv()).not.toThrow();
  });

  it("throws listing every missing required variable in production (self-hosted)", () => {
    withProduction({
      DATABASE_URL: undefined,
      JWT_SECRET: undefined,
      REDIS_URL: undefined,
      VERCEL: undefined,
      NEXURA_PACKAGED: undefined,
      NEXURA_REDIS_OPTIONAL: undefined,
    });
    expect(() => assertProductionEnv()).toThrow(/DATABASE_URL[\s\S]*JWT_SECRET[\s\S]*REDIS_URL/);
  });

  it("boots on Vercel (VERCEL=1) without REDIS_URL — serverless fallbacks active", () => {
    withProduction({
      DATABASE_URL: "postgresql://u:p@h:5432/nexura",
      JWT_SECRET: "x".repeat(32),
      REDIS_URL: undefined,
      VERCEL: "1",
    });
    expect(() => assertProductionEnv()).not.toThrow();
  });

  it("boots with explicit NEXURA_REDIS_OPTIONAL=1 without REDIS_URL", () => {
    withProduction({
      DATABASE_URL: "postgresql://u:p@h:5432/nexura",
      JWT_SECRET: "x".repeat(32),
      REDIS_URL: undefined,
      NEXURA_REDIS_OPTIONAL: "1",
    });
    expect(() => assertProductionEnv()).not.toThrow();
  });

  it("zero-config on Vercel boots and mints an ephemeral JWT secret (vercel-deploy-3)", () => {
    withProduction({
      DATABASE_URL: undefined,
      JWT_SECRET: undefined,
      REDIS_URL: undefined,
      VERCEL: "1",
    });
    expect(() => assertProductionEnv()).not.toThrow();
    const minted = process.env.JWT_SECRET;
    expect(minted).toBeDefined();
    expect(minted!.length).toBeGreaterThanOrEqual(64); // 32 random bytes, hex
  });

  it("accepts the SQLite demo database (file:) on Vercel but not self-hosted", () => {
    withProduction({
      DATABASE_URL: "file:/tmp/nexura-demo.db",
      JWT_SECRET: "x".repeat(32),
      REDIS_URL: undefined,
      VERCEL: "1",
    });
    expect(() => assertProductionEnv()).not.toThrow();

    withProduction({
      DATABASE_URL: "file:/home/z/my-project/db/custom.db",
      JWT_SECRET: "x".repeat(32),
      REDIS_URL: "redis://127.0.0.1:6379",
      VERCEL: undefined,
      NEXURA_PACKAGED: undefined,
      NEXURA_REDIS_OPTIONAL: undefined,
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
