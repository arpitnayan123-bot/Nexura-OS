/* ============================================================
   NEXURA HOSPITAL OS — ENVIRONMENT VALIDATION
   Validates at startup. Dev stays forgiving (warnings);
   production fails fast on missing secrets (assertProductionEnv,
   below, is the loud boot gate wired from instrumentation).
   ============================================================ */

import { log } from "@/lib/logger";

interface EnvReport {
  ok: boolean;
  warnings: string[];
  errors: string[];
  values: {
    NODE_ENV: string;
    DEMO_MODE: boolean;
    NEXURA_MODE: "local" | "remote";
    EMAIL_TRANSPORT: "console" | "smtp";
    JWT_SECRET_SET: boolean;
    DATABASE_URL: string;
  };
}

let cached: EnvReport | null = null;

export function env(): EnvReport {
  if (cached) return cached;
  const isProd = process.env.NODE_ENV === "production";
  const warnings: string[] = [];
  const errors: string[] = [];

  const jwtSecretSet = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16);
  if (!jwtSecretSet) {
    if (isProd) errors.push("JWT_SECRET must be set (>=16 chars) in production.");
    else warnings.push("JWT_SECRET not set — using development fallback. Set it before production.");
  }
  if (isProd && process.env.DEMO_MODE === "true") {
    warnings.push("DEMO_MODE=true in production — demo indicators will show and demo reset stays enabled. Disable unless intentional.");
  }
  if (!isProd && process.env.DEMO_MODE !== "true") {
    warnings.push("DEMO_MODE not enabled — demo product surfaces (pharmacy/clinic/portal quick-login) require DEMO_MODE=true in this environment.");
  }
  const nexuraMode = process.env.NEXURA_MODE === "remote" ? "remote" : "local";
  if (nexuraMode === "remote" && !process.env.NEXURA_API_URL) {
    warnings.push("NEXURA_MODE=remote but NEXURA_API_URL missing — falling back to local adapters per-service.");
  }
  const emailTransport = process.env.EMAIL_TRANSPORT === "smtp" ? "smtp" : "console";
  if (emailTransport === "console") {
    warnings.push("EMAIL_TRANSPORT=console — emails (password reset, verification) print to the server log instead of sending. Integration point for SMTP/provider.");
  }
  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required.");
  }

  cached = {
    ok: errors.length === 0,
    warnings,
    errors,
    values: {
      NODE_ENV: process.env.NODE_ENV || "development",
      // Secure default: demo mode is OFF unless explicitly enabled. A hospital
      // system must never expose demo reset / synthetic-data surfaces by accident.
      DEMO_MODE: process.env.DEMO_MODE === "true",
      NEXURA_MODE: nexuraMode,
      EMAIL_TRANSPORT: emailTransport,
      JWT_SECRET_SET: jwtSecretSet,
      DATABASE_URL: process.env.DATABASE_URL ? "set" : "missing",
    },
  };
  return cached;
}

export function isDemoMode(): boolean {
  return env().values.DEMO_MODE;
}

/* ============================================================
   BOOT-TIME PRODUCTION GATE (env-config-1)
   Fails LOUDLY — throws at server boot — when a variable the
   platform cannot run without is missing in a production boot.
   Same philosophy as the JWT_SECRET check in src/lib/auth/jwt.ts:
   a missing secret must never be papered over with a silent
   fallback that forges a working-looking deployment.
   Wired from src/instrumentation.ts register() (server start only;
   never runs during `next build`).
   ============================================================ */

/** Postgres family: postgres://, postgresql://, prisma+postgres:// (pgbouncer). */
function isPostgresUrl(url: string | undefined): boolean {
  return /^prisma\+postgres(ql)?:\/\//.test(url ?? "") || /^postgres(ql)?:\/\//.test(url ?? "");
}

export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return; // dev stays forgiving
  const missing: string[] = [];

  if (!isPostgresUrl(process.env.DATABASE_URL)) {
    missing.push(
      process.env.DATABASE_URL
        ? "DATABASE_URL must be a postgres:// URL (SQLite is no longer a supported provider)"
        : "DATABASE_URL is required (postgresql://user:pass@host:5432/db)"
    );
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    missing.push("JWT_SECRET must be set (>=16 chars)");
  }
  if (!process.env.REDIS_URL || !process.env.REDIS_URL.startsWith("redis")) {
    missing.push("REDIS_URL is required (redis://host:6379) — rate limiting, the event bus, and sync leases are Redis-backed");
  }

  if (missing.length) {
    throw new Error(
      `Refusing to boot: missing required production environment variables:\n  - ${missing.join("\n  - ")}\n` +
        "Copy .env.example, fill in real values, and redeploy."
    );
  }

  const report = env();
  for (const w of report.warnings) log.warn("env", w);
}
