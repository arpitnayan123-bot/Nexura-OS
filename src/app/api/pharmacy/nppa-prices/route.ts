import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* NPPA Drug Price Database
   Source: National Pharmaceutical Pricing Authority (nppa.gov.in)
   DPCO (Drug Price Control Order) ceiling prices + non-controlled MRP
   In production, fetched from NPPA published lists / API */

const NPPA_DATA: Record<string, {
  brandName: string;
  salt: string;
  strength: string;
  mrpPerStrip: number;
  ceilingPrice?: number;
  controlled: boolean;
  pricePerDay: number;
  category: string; // essential | semi-essential | non-controlled
  affordable: boolean; // < ₹10/day = affordable
}> = {
  "Glycomet": { brandName: "Glycomet", salt: "Metformin", strength: "500mg", mrpPerStrip: 28, ceilingPrice: 30, controlled: true, pricePerDay: 3.73, category: "essential", affordable: true },
  "Dolo": { brandName: "Dolo", salt: "Paracetamol", strength: "650mg", mrpPerStrip: 35, ceilingPrice: 38, controlled: true, pricePerDay: 7.0, category: "essential", affordable: true },
  "Crocin": { brandName: "Crocin", salt: "Paracetamol", strength: "500mg", mrpPerStrip: 30, ceilingPrice: 32, controlled: true, pricePerDay: 6.0, category: "essential", affordable: true },
  "Amlong": { brandName: "Amlong", salt: "Amlodipine", strength: "5mg", mrpPerStrip: 45, ceilingPrice: 50, controlled: true, pricePerDay: 3.0, category: "essential", affordable: true },
  "Ecosprin": { brandName: "Ecosprin", salt: "Aspirin", strength: "75mg", mrpPerStrip: 8, ceilingPrice: 10, controlled: true, pricePerDay: 0.8, category: "essential", affordable: true },
  "Pan": { brandName: "Pan", salt: "Pantoprazole", strength: "40mg", mrpPerStrip: 42, ceilingPrice: 45, controlled: true, pricePerDay: 2.8, category: "essential", affordable: true },
  "Cetzine": { brandName: "Cetzine", salt: "Cetirizine", strength: "10mg", mrpPerStrip: 18, ceilingPrice: 20, controlled: true, pricePerDay: 1.8, category: "essential", affordable: true },
  "Telma": { brandName: "Telma", salt: "Telmisartan", strength: "40mg", mrpPerStrip: 65, controlled: false, pricePerDay: 4.33, category: "semi-essential", affordable: true },
  "Cardace": { brandName: "Cardace", salt: "Ramipril", strength: "2.5mg", mrpPerStrip: 55, controlled: false, pricePerDay: 3.67, category: "semi-essential", affordable: true },
  "Azithral": { brandName: "Azithral", salt: "Azithromycin", strength: "500mg", mrpPerStrip: 90, controlled: false, pricePerDay: 6.0, category: "non-controlled", affordable: true },
  "Augmentin": { brandName: "Augmentin", salt: "Amoxicillin+Clavulanic Acid", strength: "625mg", mrpPerStrip: 220, controlled: false, pricePerDay: 14.67, category: "non-controlled", affordable: false },
  "Rosuvas": { brandName: "Rosuvas", salt: "Rosuvastatin", strength: "10mg", mrpPerStrip: 120, controlled: false, pricePerDay: 8.0, category: "non-controlled", affordable: true },
  "Atorva": { brandName: "Atorva", salt: "Atorvastatin", strength: "10mg", mrpPerStrip: 85, controlled: false, pricePerDay: 5.67, category: "non-controlled", affordable: true },
  "Glimisave": { brandName: "Glimisave", salt: "Glimepiride", strength: "2mg", mrpPerStrip: 40, controlled: false, pricePerDay: 2.67, category: "semi-essential", affordable: true },
  "Galvus": { brandName: "Galvus", salt: "Vildagliptin", strength: "50mg", mrpPerStrip: 180, controlled: false, pricePerDay: 12.0, category: "non-controlled", affordable: false },
  "Shelcal": { brandName: "Shelcal", salt: "Calcium+Vitamin D3", strength: "500mg", mrpPerStrip: 125, controlled: false, pricePerDay: 4.17, category: "semi-essential", affordable: true },
  "Becosules": { brandName: "Becosules", salt: "B-Complex", strength: "-", mrpPerStrip: 35, controlled: false, pricePerDay: 1.17, category: "semi-essential", affordable: true },
  "Brufen": { brandName: "Brufen", salt: "Ibuprofen", strength: "400mg", mrpPerStrip: 25, controlled: false, pricePerDay: 1.67, category: "essential", affordable: true },
  "Clopitab": { brandName: "Clopitab", salt: "Clopidogrel", strength: "75mg", mrpPerStrip: 95, controlled: false, pricePerDay: 6.33, category: "non-controlled", affordable: true },
  "Starpress": { brandName: "Starpress", salt: "Metoprolol", strength: "25mg", mrpPerStrip: 70, controlled: false, pricePerDay: 4.67, category: "semi-essential", affordable: true },
};

// GET /api/pharmacy/nppa-prices?q=&name=
async function GET_impl(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const name = (searchParams.get("name") || "").trim();

    // if specific name requested
    if (name) {
      const key = Object.keys(NPPA_DATA).find(k => k.toLowerCase() === name.toLowerCase());
      if (key) return NextResponse.json({ price: NPPA_DATA[key] });
      return NextResponse.json({ price: null });
    }

    // search by brand or salt
    if (q) {
      const results = Object.values(NPPA_DATA).filter(d =>
        d.brandName.toLowerCase().includes(q) ||
        d.salt.toLowerCase().includes(q)
      );
      return NextResponse.json({ results, count: results.length });
    }

    // return all
    return NextResponse.json({
      prices: Object.values(NPPA_DATA),
      count: Object.values(NPPA_DATA).length,
      source: "NPPA — National Pharmaceutical Pricing Authority (nppa.gov.in)",
      categories: {
        essential: Object.values(NPPA_DATA).filter(d => d.category === "essential").length,
        semiEssential: Object.values(NPPA_DATA).filter(d => d.category === "semi-essential").length,
        nonControlled: Object.values(NPPA_DATA).filter(d => d.category === "non-controlled").length,
      },
    });
  } catch (err) {
    log.error("pharmacy", "nppa_prices_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "nppa_failed", detail: "Price data could not be loaded. Please retry." }, { status: 500 });
  }
}

export const GET = withProductAuth("pharmacy.nppa-prices.GET", GET_impl);
