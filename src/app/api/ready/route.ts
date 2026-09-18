import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { connectionCount } from "@/lib/nx/bus";
import { isRedisConfigured, redis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Readiness probe — DB reachable, schema usable, env valid. Redis is
 * REPORTED but not scored: a down Redis fails auth routes closed (503)
 * yet must not flip this probe during boot, or the supervisor's health
 * gate would restart-loop an app that is seconds from being fine. */
export async function GET(_req: NextRequest) {
  const e = env();
  const checks: Record<string, { ok: boolean; detail?: string; ms?: number }> = {};

  const t0 = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { ok: true, ms: Date.now() - t0 };
  } catch {
    // Generic detail for an unauthenticated probe — the underlying DB error
    // (which can carry driver/connection detail) stays in server logs only.
    checks.database = { ok: false, detail: "database unreachable" };
  }

  try {
    await db.nxStaffUser.findFirst({ select: { id: true } });
    checks.seed = { ok: true };
  } catch {
    checks.seed = { ok: false, detail: "schema query failed — run prisma migrate deploy" };
  }

  // Informational — excluded from okAll (see header comment).
  if (isRedisConfigured()) {
    const r = redis();
    const t1 = Date.now();
    try {
      await r!.ping();
      checks.redis = { ok: true, ms: Date.now() - t1 };
    } catch {
      checks.redis = {
        ok: false,
        detail: "redis unreachable — rate-limited routes fail closed (503)",
      };
    }
  } else {
    checks.redis = { ok: false, detail: "REDIS_URL not set — in-process fallbacks active" };
  }

  // Scored: database + seed only. Redis is informational (see header).
  const okAll = checks.database.ok && checks.seed.ok && e.ok;
  return NextResponse.json(
    {
      status: okAll ? "ready" : "degraded",
      checks,
      realtime: { connections: connectionCount() },
      mode: {
        demo: e.values.DEMO_MODE,
        nexura: e.values.NEXURA_MODE,
        email: e.values.EMAIL_TRANSPORT,
      },
      at: new Date().toISOString(),
    },
    { status: okAll ? 200 : 503 },
  );
}
