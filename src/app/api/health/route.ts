import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Liveness probe — process is up. Never touches the DB. */
export async function GET(_req: NextRequest) {
  return NextResponse.json({
    status: "ok",
    service: "nexura-hospital-os",
    at: new Date().toISOString(),
  });
}
