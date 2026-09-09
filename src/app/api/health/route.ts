import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const status: any = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? Math.floor(process.uptime()) : 0,
    latency: { db: 0, total: 0 },
    services: {},
    version: "1.0.0",
  };

  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    status.latency.db = Date.now() - dbStart;
    status.services.database = "ok";
  } catch (e: any) {
    status.status = "degraded";
    status.services.database = `error: ${e?.message || "unknown"}`;
  }

  status.latency.total = Date.now() - startTime;
  const httpStatus = status.status === "ok" ? 200 : 503;
  return NextResponse.json(status, { status: httpStatus });
}
