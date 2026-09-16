import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/clinic/drugs?q= — autocomplete from Indian drug DB
async function GET_impl(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    if (!q || q.length < 1) return NextResponse.json({ drugs: [] });
    const drugs = await db.indianDrug.findMany({
      where: {
        OR: [
          { brandName: { contains: q, mode: "insensitive" as const } },
          { saltName: { contains: q, mode: "insensitive" as const } },
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

export const GET = withProductAuth("clinic.drugs.GET", GET_impl);
