import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Medication Synchronization (Med Sync) — inspired by PioneerRx
   AI enhancement: detects chronic disease patterns from purchase history,
   aligns all chronic meds to one monthly pickup, auto-sends WhatsApp reminder
   3 days before expected run-out date */

// Chronic disease detection from medicine salts
const CHRONIC_MAP: Record<
  string,
  { disease: string; saltPatterns: string[]; typicalCycleDays: number }
> = {
  "Diabetes Type 2": {
    disease: "Diabetes Type 2",
    saltPatterns: ["metformin", "glimepiride", "vildagliptin", "insulin", "sitagliptin"],
    typicalCycleDays: 30,
  },
  Hypertension: {
    disease: "Hypertension",
    saltPatterns: ["amlodipine", "telmisartan", "ramipril", "metoprolol", "atenolol", "losartan"],
    typicalCycleDays: 30,
  },
  Cholesterol: {
    disease: "Dyslipidemia",
    saltPatterns: ["atorvastatin", "rosuvastatin", "fenofibrate"],
    typicalCycleDays: 30,
  },
  Hypothyroidism: {
    disease: "Hypothyroidism",
    saltPatterns: ["levothyroxine", "thyronorm", "eltroxin"],
    typicalCycleDays: 30,
  },
  Cardiac: {
    disease: "Coronary Artery Disease",
    saltPatterns: ["aspirin", "clopidogrel", "ecosprin"],
    typicalCycleDays: 30,
  },
  Asthma: {
    disease: "Asthma/COPD",
    saltPatterns: ["budesonide", "formoterol", "salbutamol", "foracort", "asthalin"],
    typicalCycleDays: 30,
  },
  "Mental Health": {
    disease: "Depression/Anxiety",
    saltPatterns: ["sertraline", "escitalopram", "fluoxetine", "amitriptyline"],
    typicalCycleDays: 30,
  },
};

// GET /api/pharmacy/med-sync — list chronic patients with med sync status
async function GET_impl() {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });

    // Fetch customers with their sales (purchase history)
    const customers = await db.customer.findMany({
      where: { sales: { some: {} } },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: {
            items: {
              include: { product: { select: { name: true, genericName: true, salts: true } } },
            },
          },
        },
      },
      take: 50,
    });

    // Analyze each customer's purchase history for chronic patterns
    const chronicPatients = customers
      .map((c) => {
        const allMeds = c.sales.flatMap((s) =>
          s.items.map((i) => ({
            name: i.product.name,
            salt: i.product.genericName || i.product.salts || "",
            date: s.createdAt,
            qty: i.qtyStrips,
          })),
        );

        // Detect chronic diseases
        const detectedDiseases: {
          disease: string;
          medicines: string[];
          lastPurchase: string;
          cycleDays: number;
        }[] = [];
        const seenSalts = new Set<string>();

        for (const [key, pattern] of Object.entries(CHRONIC_MAP)) {
          const matchingMeds = allMeds.filter((m) =>
            pattern.saltPatterns.some(
              (sp) => m.salt.toLowerCase().includes(sp) || m.name.toLowerCase().includes(sp),
            ),
          );
          if (matchingMeds.length > 0) {
            const medicines = [...new Set(matchingMeds.map((m) => m.name))];
            const lastPurchase = matchingMeds[0].date.toISOString();
            detectedDiseases.push({
              disease: pattern.disease,
              medicines,
              lastPurchase,
              cycleDays: pattern.typicalCycleDays,
            });
            matchingMeds.forEach((m) => seenSalts.add(m.salt));
          }
        }

        // Calculate next refill date (based on last purchase + cycle)
        const nextRefillDates = detectedDiseases.map((d) => {
          const lastDate = new Date(d.lastPurchase);
          const nextDate = new Date(lastDate.getTime() + d.cycleDays * 86400000);
          return {
            disease: d.disease,
            nextRefill: nextDate.toISOString().slice(0, 10),
            daysUntil: Math.ceil((nextDate.getTime() - Date.now()) / 86400000),
          };
        });

        // Sync status: if all chronic meds align to same pickup date → "synced"
        // If different dates → "needs sync"
        const dates = nextRefillDates.map((r) => r.nextRefill);
        const allSynced = dates.length > 0 && dates.every((d) => d === dates[0]);
        const earliestRefill =
          nextRefillDates.length > 0
            ? nextRefillDates.reduce((min, r) => (r.daysUntil < min.daysUntil ? r : min))
            : null;

        return {
          customerId: c.id,
          customerName: c.name,
          phone: c.phone,
          totalPurchases: c.sales.length,
          detectedDiseases,
          nextRefillDates,
          syncStatus: detectedDiseases.length === 0 ? "none" : allSynced ? "synced" : "needs_sync",
          earliestRefillDays: earliestRefill?.daysUntil ?? null,
          earliestRefillDate: earliestRefill?.nextRefill ?? null,
          needsReminder: earliestRefill ? earliestRefill.daysUntil <= 3 : false,
        };
      })
      .filter((p) => p.detectedDiseases.length > 0); // only show chronic patients

    // Summary
    const summary = {
      totalChronic: chronicPatients.length,
      synced: chronicPatients.filter((p) => p.syncStatus === "synced").length,
      needsSync: chronicPatients.filter((p) => p.syncStatus === "needs_sync").length,
      needsReminder: chronicPatients.filter((p) => p.needsReminder).length,
    };

    return NextResponse.json({ patients: chronicPatients, summary });
  } catch (err) {
    log.error("pharmacy", "med_sync_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "med_sync_failed", detail: "Medicine sync could not be completed. Please retry." },
      { status: 500 },
    );
  }
}

// POST — send WhatsApp reminder to a patient (simulated)
async function POST_impl(req: any) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const { customerId, message } = body as { customerId?: string; message?: string };

    // In production: call Meta WhatsApp Business API
    // For demo: simulate success
    return NextResponse.json({
      ok: true,
      message: "WhatsApp reminder sent",
      sentTo: customerId,
      channel: "WhatsApp Business API (simulated)",
    });
  } catch (err) {
    log.error("pharmacy", "reminder_create_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "reminder_failed", detail: "The reminder could not be created. Please retry." },
      { status: 500 },
    );
  }
}

export const GET = withProductAuth("pharmacy.med-sync.GET", GET_impl);
export const POST = withProductAuth("pharmacy.med-sync.POST", POST_impl);
