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
    SMTP_CONFIGURED: boolean;
    JWT_SECRET_SET: boolean;
    DATABASE_URL: string;
    /** Optional bearer gate for /api/metrics (unset = open on trusted networks). */
    METRICS_TOKEN_SET: boolean;
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
    else
      warnings.push("JWT_SECRET not set — using development fallback. Set it before production.");
  }
  if (isProd && process.env.DEMO_MODE === "true") {
    warnings.push(
      "DEMO_MODE=true in production — demo indicators will show and demo reset stays enabled. Disable unless intentional.",
    );
  }
  if (!isProd && process.env.DEMO_MODE !== "true") {
    warnings.push(
      "DEMO_MODE not enabled — demo product surfaces (pharmacy/clinic/portal quick-login) require DEMO_MODE=true in this environment.",
    );
  }
  const nexuraMode = process.env.NEXURA_MODE === "remote" ? "remote" : "local";
  if (nexuraMode === "remote" && !process.env.NEXURA_API_URL) {
    warnings.push(
      "NEXURA_MODE=remote but NEXURA_API_URL missing — falling back to local adapters per-service.",
    );
  }
  const emailTransport = process.env.EMAIL_TRANSPORT === "smtp" ? "smtp" : "console";
  if (emailTransport === "console") {
    warnings.push(
      "EMAIL_TRANSPORT=console — emails (password reset, verification) print to the server log instead of sending. Set EMAIL_TRANSPORT=smtp + SMTP_* vars to send real mail.",
    );
  }
  const smtpConfigured = Boolean(
    emailTransport === "smtp" &&
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_FROM,
  );
  if (emailTransport === "smtp" && !smtpConfigured) {
    warnings.push(
      "EMAIL_TRANSPORT=smtp but SMTP_HOST/SMTP_PORT/SMTP_FROM are incomplete — mail senders fall back to console transport per call.",
    );
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
      SMTP_CONFIGURED: smtpConfigured,
      JWT_SECRET_SET: jwtSecretSet,
      DATABASE_URL: process.env.DATABASE_URL ? "set" : "missing",
      METRICS_TOKEN_SET: Boolean(process.env.METRICS_TOKEN),
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

  /* PACKAGED DEMO MODE (platform publish contract) — the sandbox publish
   * pipeline ships this app as a self-contained FC package: embedded SQLite
   * (db/custom.db), no external Postgres, no Redis. start.sh marks it with
   * NEXURA_PACKAGED=1. In that mode we require a database (either provider —
   * the client is generated to match at package-build time) and a JWT secret,
   * while Redis stays OPTIONAL: redis.ts falls back to documented in-process
   * rate-limiting and per-instance event delivery when REDIS_URL is absent. */
  const packaged = process.env.NEXURA_PACKAGED === "1";

  /* SERVERLESS / PAAS DEPLOYMENTS (Vercel, Netlify, ...) — Vercel injects
   * VERCEL=1 into every build and runtime. A serverless function cannot
   * open the long-lived TCP pub/sub connections a self-hosted Redis assumes,
   * and the platform's own rate limiting already sits in front of the app.
   * Both Redis-backed layers have documented single-instance fallbacks
   * (rate-limit.ts in-process Map, bus.ts local-only delivery + /api/ready
   * reporting "in-process fallbacks active"), so on serverless the boot
   * gate treats a missing REDIS_URL as a LOUD WARNING instead of a hard
   * refusal — set REDIS_URL (e.g. Upstash) to restore cross-instance
   * semantics. NEXURA_REDIS_OPTIONAL=1 opts in explicitly on any platform.
   *
   * ZERO-CONFIG DEMO POSTURE (vercel-deploy-3): a serverless deployment
   * with NO DATABASE_URL and NO JWT_SECRET is, by construction, an
   * unconfigured demo (the caller wired a repo to Vercel and nothing
   * else). Refusing to boot there produced the worst possible outcome —
   * every route 500 with zero information. Instead, the serverless boot
   * degrades LOUDLY:
   *   - DATABASE_URL: src/instrumentation.ts has already attached the
   *     bundled seeded demo SQLite database (src/lib/demo-db.ts) before
   *     this gate runs. If even that failed, the gate logs CRITICAL and
   *     boots anyway — health/static surfaces stay reachable and every
   *     data-backed route fails with an explicit error instead of the
   *     whole server being down.
   *   - JWT_SECRET: an EPHEMERAL per-boot secret is generated so demo
   *     logins work; sessions reset on every cold start and this is
   *     logged CRITICAL on each boot until a real secret is configured.
   * Self-hosted production (no VERCEL) keeps the original hard gate:
   * missing DATABASE_URL or JWT_SECRET still refuses to boot. */
  const redisOptional =
    packaged ||
    process.env.VERCEL === "1" ||
    process.env.NEXURA_REDIS_OPTIONAL === "1";
  const serverless = process.env.VERCEL === "1";

  const missing: string[] = [];

  if (!process.env.DATABASE_URL) {
    if (serverless) {
      log.error(
        "env",
        "CRITICAL: DATABASE_URL is not set and the embedded demo database could not be " +
          "attached — booting WITHOUT a data layer. Every data-backed route will fail " +
          "until a hosted Postgres DATABASE_URL is configured.",
      );
    } else {
      missing.push("DATABASE_URL is required (postgresql://host/db or file:/path/db)");
    }
  } else if (!packaged && !serverless && !isPostgresUrl(process.env.DATABASE_URL)) {
    // Self-hosted production only: postgres URLs. SQLite (file:) is the
    // packaged demo mode AND the zero-config serverless demo posture.
    missing.push(
      "DATABASE_URL must be a postgres:// URL (SQLite is only supported in the packaged demo mode)",
    );
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    if (serverless) {
      /* Web Crypto (works in the edge bundle too — env.ts is imported by the
       * edge proxy, so node:crypto must NOT be referenced here). */
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      process.env.JWT_SECRET = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      log.error(
        "env",
        "CRITICAL: JWT_SECRET was not configured — an EPHEMERAL per-boot secret was " +
          "generated. Sessions reset on every cold start and tokens do not survive " +
          "instance replacement. Set JWT_SECRET (32+ random chars) for stable auth.",
      );
    } else {
      missing.push("JWT_SECRET must be set (>=16 chars)");
    }
  }
  if (!process.env.REDIS_URL || !process.env.REDIS_URL.startsWith("redis")) {
    if (redisOptional) {
      log.warn(
        "env",
        "REDIS_URL not set — running with per-instance rate limiting and local-only event bus. " +
          "Set REDIS_URL (e.g. redis://default:pass@host:6379 or Upstash) to restore cross-instance semantics.",
      );
    } else {
      missing.push(
        "REDIS_URL is required (redis://host:6379) — rate limiting, the event bus, and sync leases are Redis-backed",
      );
    }
  }

  if (missing.length) {
    throw new Error(
      `Refusing to boot: missing required production environment variables:\n  - ${missing.join("\n  - ")}\n` +
        "Copy .env.example, fill in real values, and redeploy.",
    );
  }

  const report = env();
  for (const w of report.warnings) log.warn("env", w);
}
