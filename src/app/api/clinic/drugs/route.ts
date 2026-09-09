import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/clinic/drugs?q= — autocomplete from Indian drug DB
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    if (!q || q.length < 1) return NextResponse.json({ drugs: [] });
    const drugs = await db.indianDrug.findMany({
      where: {
        OR: [
          { brandName: { contains: q } },
          { saltName: { contains: q } },
        ],
      },
      take: 12,
      orderBy: { brandName: "asc" },
    });
    return NextResponse.json({ drugs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "drugs_failed", detail: message }, { status: 500 });
  }
}
