import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { withProductAuth } from "@/lib/nx/product-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function GET_impl() {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const customers = await db.customer.findMany({
      where: { sales: { some: {} } },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            items: { include: { product: { select: { name: true, genericName: true } } } },
          },
        },
      },
      take: 20,
    });
    const refillDue = customers
      .map((c) => {
        const lastSale = c.sales[0];
        if (!lastSale) return null;
        const daysSince = Math.floor((Date.now() - lastSale.createdAt.getTime()) / 86400000);
        const meds = lastSale.items.map((i) => i.product.name);
        return daysSince >= 25
          ? { customer: c.name, phone: c.phone, daysSince, meds, status: "refill_due" }
          : null;
      })
      .filter(Boolean);
    return NextResponse.json({ refills: refillDue, count: refillDue.length });
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export const GET = withProductAuth("pharmacy.auto-refill.GET", GET_impl);
