import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { connectionCount } from "@/lib/nx/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Readiness probe — DB reachable, schema usable, env valid. */
export async function GET(_req: NextRequest) {
  const e = env();
  const checks: Record<string, { ok: boolean; detail?: string; ms?: number }> = {};

  const t0 = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { ok: true, ms: Date.now() - t0 };
  } catch (err) {
    checks.database = { ok: false, detail: err instanceof Error ? err.message.slice(0, 120) : "unreachable" };
  }

  try {
    await db.nxStaffUser.findFirst({ select: { id: true } });
    checks.seed = { ok: true };
  } catch {
    checks.seed = { ok: false, detail: "schema query failed — run prisma db push" };
  }

  const okAll = Object.values(checks).every((c) => c.ok) && e.ok;
  return NextResponse.json(
    {
      status: okAll ? "ready" : "degraded",
      checks,
      realtime: { connections: connectionCount() },
      mode: { demo: e.values.DEMO_MODE, nexura: e.values.NEXURA_MODE, email: e.values.EMAIL_TRANSPORT },
      at: new Date().toISOString(),
    },
    { status: okAll ? 200 : 503 }
  );
}
