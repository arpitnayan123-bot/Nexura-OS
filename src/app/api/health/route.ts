import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withRoute } from "@/lib/nx/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Liveness probe — process is up. Never touches the DB. */
export const GET = withRoute("health.liveness", async (_req: NextRequest) => {
  return NextResponse.json({
    status: "ok",
    service: "nexura-hospital-os",
    at: new Date().toISOString(),
  });
});
