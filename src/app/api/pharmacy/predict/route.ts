import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pharmacy/predict
// Returns: dump-stock (near expiry vs sales velocity), reorder list (below reorder level),
// and seasonal demand hint per product.
async function GET_impl() {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });

    const products = await db.product.findMany({
      include: {
        batches: { where: { branchId: ctx.branch.id }, orderBy: { expDate: "asc" } },
        saleItems: { include: { sale: true } },
      },
    });

    const now = Date.now();
    const days30 = 1000 * 60 * 60 * 24 * 30;

    const dumpStock: {
      product: string;
      batchNo: string;
      expDate: string;
      monthsToExpiry: number;
      stockStrips: number;
      risk: "high" | "medium" | "low";
    }[] = [];

    const reorder: {
      product: string;
      genericName: string | null;
      currentStock: number;
      reorderLevel: number;
      avgMonthlySales: number;
      suggestedQty: number;
    }[] = [];

    const demand: { product: string; season: "peak" | "moderate" | "low"; note: string }[] = [];

    for (const p of products) {
      const totalStock = p.batches.reduce((s, b) => s + b.stockStrips, 0);
      const last30 = p.saleItems.filter((si) => now - si.sale.createdAt.getTime() < days30);
      const last90 = p.saleItems.filter((si) => now - si.sale.createdAt.getTime() < days30 * 3);
      const sold30 = last30.reduce((s, si) => s + si.qtyStrips, 0);
      const sold90 = last90.reduce((s, si) => s + si.qtyStrips, 0);
      const avgMonthly = sold90 > 0 ? sold90 / 3 : sold30;

      // dump-stock: batches expiring within 3 months that we can't sell in time
      for (const b of p.batches) {
        const exp = new Date(b.expDate + "-01").getTime();
        const months = (exp - now) / days30;
        if (months <= 3 && b.stockStrips > 0) {
          // can we sell this stock before expiry?
          const canSell = avgMonthly * Math.max(months, 0.5);
          const risk: "high" | "medium" | "low" =
            b.stockStrips > canSell * 1.5 ? "high" : months < 1.5 ? "medium" : "low";
          dumpStock.push({
            product: p.name,
            batchNo: b.batchNo,
            expDate: b.expDate,
            monthsToExpiry: +months.toFixed(1),
            stockStrips: b.stockStrips,
            risk,
          });
        }
      }

      // reorder
      if (totalStock <= p.reorderLevel) {
        const suggestedQty = Math.max(p.reorderLevel * 2 - totalStock, Math.round(avgMonthly * 2));
        reorder.push({
          product: p.name,
          genericName: p.genericName,
          currentStock: totalStock,
          reorderLevel: p.reorderLevel,
          avgMonthlySales: +avgMonthly.toFixed(1),
          suggestedQty,
        });
      }

      // seasonal demand heuristic (based on category / generic name)
      const g = (p.genericName || "").toLowerCase();
      let season: "peak" | "moderate" | "low" = "moderate";
      let note = "Steady year-round demand.";
      if (g.includes("paracetamol") || g.includes("cetirizine") || g.includes("azithromycin")) {
        season = "peak";
        note = "Peak during monsoon & winter (Jul–Oct, Dec–Feb). Stock +40%.";
      } else if (g.includes("metformin") || g.includes("calcium")) {
        season = "moderate";
        note = "Chronic-use, stable demand.";
      } else if (g.includes("amoxicillin")) {
        season = "peak";
        note = "Antibiotic — higher in seasonal infection months.";
      }
      demand.push({ product: p.name, season, note });
    }

    dumpStock.sort((a, b) => a.monthsToExpiry - b.monthsToExpiry);
    reorder.sort((a, b) => a.currentStock - b.currentStock);

    return NextResponse.json({
      dumpStock,
      reorder,
      demand,
      summary: {
        dumpCount: dumpStock.length,
        highRisk: dumpStock.filter((d) => d.risk === "high").length,
        reorderCount: reorder.length,
        totalStockUnits: products.reduce((s, p) => s + p.batches.reduce((b, x) => b + x.stockStrips, 0), 0),
      },
    });
  } catch (err) {
    log.error("pharmacy", "predict_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "predict_failed", detail: "Demand predictions could not be generated. Please retry." }, { status: 500 });
  }
}

export const GET = withProductAuth("pharmacy.predict.GET", GET_impl);
