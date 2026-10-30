import { NextRequest, NextResponse } from "next/server";
import { connectionCount } from "@/lib/nx/bus";
import { isRedisConfigured, redis } from "@/lib/redis";
import { db } from "@/lib/db";
import { renderPrometheus, snapshot } from "@/lib/nx/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   NEXURA HOSPITAL OS — OPERATIONAL METRICS
   GET /api/metrics              → JSON snapshot
   GET /api/metrics?format=prometheus (or Accept: text/plain)
                                 → Prometheus text exposition

   Contains aggregate, non-PHI operational data only: request
   counters by OPERATION name (never raw URLs), status classes,
   durations, process memory/uptime, best-effort DB/Redis pings.

   Access: when METRICS_TOKEN is set, callers must present it via
   `Authorization: Bearer <token>` or `?token=`. Unset (default,
   single-node/demo deployments) the endpoint is open — it is the
   same class of information /api/ready already exposes, plus
   aggregate counters with no patient data.
   ============================================================ */

function authorized(req: NextRequest): boolean {
  // The raw token is read from process.env at request time (never cached in
  // the env report); METRICS_TOKEN_SET only tells callers whether the gate is on.
  const token = process.env.METRICS_TOKEN;
  if (!token) return true;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${token}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("token") === token;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: "metrics_unauthorized", detail: "A valid METRICS_TOKEN is required." },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const wantsProm =
    url.searchParams.get("format") === "prometheus" ||
    (req.headers.get("accept") ?? "").includes("text/plain");

  // Best-effort infra pings — metrics must stay cheap and never throw.
  const dbStart = Date.now();
  let dbOk = false;
  try {
    await Promise.race([
      db.$queryRaw`SELECT 1`,
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 800)),
    ]);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const dbMs = Date.now() - dbStart;

  let redisOk: boolean | null = null;
  let redisMs: number | null = null;
  if (isRedisConfigured()) {
    const t = Date.now();
    try {
      await redis()!.ping();
      redisOk = true;
    } catch {
      redisOk = false;
    }
    redisMs = Date.now() - t;
  }

  const snap = snapshot();

  if (wantsProm) {
    const body = renderPrometheus(snap);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(
    {
      ...snap,
      infra: {
        database: { ok: dbOk, pingMs: dbMs },
        redis:
          redisOk === null
            ? { configured: false, detail: "REDIS_URL not set — in-process fallbacks active" }
            : { configured: true, ok: redisOk, pingMs: redisMs },
        realtimeConnections: connectionCount(),
      },
      at: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
