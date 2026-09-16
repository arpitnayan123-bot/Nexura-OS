import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pharmacy/schedule-h — Schedule H/H1 register (government audit format)
async function GET_impl() {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const entries = await db.scheduleHEntry.findMany({
      where: { branchId: ctx.branch.id },
      orderBy: [{ serialNo: "asc" }],
      include: { branch: { select: { name: true, address: true, city: true } } },
    });
    return NextResponse.json({ entries, count: entries.length });
  } catch (err) {
    log.error("pharmacy", "schedule_h_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "schedule_h_failed", detail: "Schedule H information could not be loaded. Please retry." }, { status: 500 });
  }
}

export const GET = withProductAuth("pharmacy.schedule-h.GET", GET_impl);
