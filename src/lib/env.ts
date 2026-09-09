/* ============================================================
   NEXURA HOSPITAL OS — ENVIRONMENT VALIDATION
   Validates at startup. Dev stays forgiving (warnings);
   production fails fast on missing secrets.
   ============================================================ */

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
      DEMO_MODE: process.env.DEMO_MODE !== "false", // demo until explicitly disabled
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
