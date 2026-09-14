import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pharmacy/inventory?q=&low=1
async function GET_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const onlyLow = searchParams.get("low") === "1";

    const products = await db.product.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { genericName: { contains: q } },
              { salts: { contains: q } },
              { brand: { contains: q } },
              { hsn: { contains: q } },
            ],
          }
        : undefined,
      include: {
        batches: {
          where: { branchId: ctx.branch.id },
          orderBy: { expDate: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // compute per-product aggregate stock + low-stock + near-expiry
    const enriched = products.map((p) => {
      const stockStrips = p.batches.reduce((s, b) => s + b.stockStrips, 0);
      const stockLoose = p.batches.reduce((s, b) => s + b.stockLoose, 0);
      const earliestExpiry = p.batches[0]?.expDate ?? null;
      const low = stockStrips <= p.reorderLevel;
      const nearExpiry = p.batches.some((b) => {
        const months =
          (new Date(b.expDate + "-01").getTime() - Date.now()) /
          (1000 * 60 * 60 * 24 * 30);
        return months <= 3;
      });
      return {
        id: p.id,
        name: p.name,
        genericName: p.genericName,
        brand: p.brand,
        category: p.category,
        hsn: p.hsn,
        schedule: p.schedule,
        salts: p.salts,
        packaging: p.packaging,
        tabletsPerStrip: p.tabletsPerStrip,
        cgstRate: p.cgstRate,
        sgstRate: p.sgstRate,
        reorderLevel: p.reorderLevel,
        stockStrips,
        stockLoose,
        earliestExpiry,
        low,
        nearExpiry,
        batches: p.batches.map((b) => ({
          id: b.id,
          batchNo: b.batchNo,
          barcode: b.barcode,
          mfgDate: b.mfgDate,
          expDate: b.expDate,
          mrp: b.mrp,
          purchaseRate: b.purchaseRate,
          stockStrips: b.stockStrips,
          stockLoose: b.stockLoose,
        })),
      };
    });

    const filtered = onlyLow ? enriched.filter((p) => p.low) : enriched;

    return NextResponse.json({
      branch: { id: ctx.branch.id, name: ctx.branch.name, city: ctx.branch.city },
      company: { name: ctx.company.name, gstin: ctx.company.gstin },
      staff: ctx.staff ? { id: ctx.staff.id, name: ctx.staff.name, role: ctx.staff.role } : null,
      count: filtered.length,
      items: filtered,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "inventory_failed", detail: message }, { status: 500 });
  }
}

export const GET = withProductAuth("pharmacy.inventory.GET", GET_impl);
