import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoContext } from "@/lib/pharmacy-context";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Patient Risk Scoring — inspired by PioneerRx patient risk stratification
   AI enhancement for India: ICMR-INDIAB diabetes risk, NFHS-5 anemia/nutrition,
   medication combinations, purchase adherence patterns */

// Risk weights based on Indian epidemiological data
const RISK_FACTORS: { factor: string; weight: number; source: string }[] = [
  { factor: "Diabetes medication (Metformin/Glimepiride/Insulin)", weight: 25, source: "ICMR-INDIAB" },
  { factor: "Hypertension medication (2+ agents)", weight: 20, source: "ICMR HTN Study" },
  { factor: "Cardiac medication (Aspirin+Clopidogrel+Statin)", weight: 30, source: "ICMR CAD Registry" },
  { factor: "Chronic kidney disease medication", weight: 35, source: "ICKD Study" },
  { factor: "Psychiatric medication (antidepressants)", weight: 15, source: "NMHS India" },
  { factor: "Respiratory medication (inhalers/steroids)", weight: 15, source: "GAN India" },
  { factor: "Thyroid medication", weight: 10, source: "ICMR Thyroid Survey" },
  { factor: "Multiple chronic diseases (3+)", weight: 20, source: "ICMR Multimorbidity" },
  { factor: "High purchase frequency (>10 purchases/month)", weight: 10, source: "Adherence Pattern" },
  { factor: "Gap in medication refill (>40 days)", weight: 15, source: "Adherence Gap" },
  { factor: "Senior citizen (age >60)", weight: 10, source: "NFHS-5 Elderly" },
  { factor: "Female + Anemia medication", weight: 15, source: "NFHS-5 (57% women anemic)" },
];

const CHRONIC_MED_MAP: { salts: string[]; disease: string; weight: number; source: string }[] = [
  { salts: ["metformin", "glimepiride", "vildagliptin", "insulin", "sitagliptin"], disease: "Diabetes Type 2", weight: 25, source: "ICMR-INDIAB" },
  { salts: ["amlodipine", "telmisartan", "ramipril", "metoprolol", "atenolol", "losartan"], disease: "Hypertension", weight: 20, source: "ICMR HTN" },
  { salts: ["aspirin", "clopidogrel", "ecosprin", "clopitab"], disease: "Coronary Artery Disease", weight: 30, source: "ICMR CAD" },
  { salts: ["atorvastatin", "rosuvastatin", "fenofibrate"], disease: "Dyslipidemia", weight: 10, source: "Indian Lipid Guidelines" },
  { salts: ["levothyroxine", "thyronorm", "eltroxin"], disease: "Hypothyroidism", weight: 10, source: "ICMR Thyroid" },
  { salts: ["sertraline", "escitalopram", "fluoxetine", "amitriptyline"], disease: "Depression/Anxiety", weight: 15, source: "NMHS India" },
  { salts: ["budesonide", "formoterol", "salbutamol", "foracort"], disease: "Asthma/COPD", weight: 15, source: "GAN India" },
  { salts: ["shelcal", "calcium", "vitamin d"], disease: "Calcium/Vit D Deficiency", weight: 5, source: "NFHS-5 Nutrition" },
  { salts: ["iron", "folic acid", "ferrous"], disease: "Anemia", weight: 15, source: "NFHS-5 (57% women)" },
];

// GET /api/pharmacy/risk-score — all customers with risk scores
async function GET_impl(req: NextRequest) {
  try {
    const ctx = await getDemoContext();
    if (!ctx) return NextResponse.json({ error: "no_branch" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    const customers = await db.customer.findMany({
      where: customerId ? { id: customerId } : { sales: { some: {} } },
      include: {
        sales: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { items: { include: { product: { select: { name: true, genericName: true, salts: true } } } } },
        },
      },
      take: 50,
    });

    const scored = customers.map(c => {
      const allMeds = c.sales.flatMap(s => s.items.map(i => ({
        name: i.product.name,
        salt: (i.product.genericName || i.product.salts || "").toLowerCase(),
        date: s.createdAt,
      })));

      // Detect chronic diseases
      const detectedDiseases: { disease: string; weight: number; source: string; medicines: string[] }[] = [];
      for (const cm of CHRONIC_MED_MAP) {
        const matching = allMeds.filter(m => cm.salts.some(sp => m.salt.includes(sp) || m.name.toLowerCase().includes(sp)));
        if (matching.length > 0) {
          detectedDiseases.push({
            disease: cm.disease,
            weight: cm.weight,
            source: cm.source,
            medicines: [...new Set(matching.map(m => m.name))],
          });
        }
      }

      // Calculate base risk from diseases
      let riskScore = detectedDiseases.reduce((sum, d) => sum + d.weight, 0);

      // Multi-morbidity bonus
      if (detectedDiseases.length >= 3) riskScore += 20;
      else if (detectedDiseases.length >= 2) riskScore += 10;

      // Adherence gap detection (if last purchase >40 days ago for chronic med)
      const lastPurchase = c.sales[0]?.createdAt;
      if (lastPurchase) {
        const daysSince = Math.floor((Date.now() - lastPurchase.getTime()) / 86400000);
        if (daysSince > 40 && detectedDiseases.length > 0) riskScore += 15;
      }

      // Purchase frequency
      const monthlyPurchases = c.sales.length / Math.max(1, Math.floor((Date.now() - (c.sales[c.sales.length - 1]?.createdAt || new Date()).getTime()) / (30 * 86400000)));
      if (monthlyPurchases > 10) riskScore += 10;

      // Cap at 100
      riskScore = Math.min(100, riskScore);

      // Risk level
      const riskLevel = riskScore >= 60 ? "high" : riskScore >= 30 ? "moderate" : riskScore > 0 ? "low" : "none";
      const riskColor = riskLevel === "high" ? "#EF4444" : riskLevel === "moderate" ? "#F59E0B" : riskLevel === "low" ? "#22C55E" : "#6B7280";

      // Recommendations based on risk
      const recommendations: string[] = [];
      if (detectedDiseases.some(d => d.disease === "Diabetes Type 2")) recommendations.push("Schedule HbA1c check every 3 months (ICMR-INDIAB)");
      if (detectedDiseases.some(d => d.disease === "Hypertension")) recommendations.push("Monitor BP weekly — target <140/90 (ICMR)");
      if (detectedDiseases.some(d => d.disease === "Coronary Artery Disease")) recommendations.push("Annual ECG + Echo — refer cardiologist");
      if (detectedDiseases.length >= 3) recommendations.push("Medication Therapy Management (MTM) review recommended");
      if (riskScore >= 60) recommendations.push("High-risk patient — prioritise refill reminders & adherence counseling");

      return {
        customerId: c.id,
        customerName: c.name,
        phone: c.phone,
        riskScore,
        riskLevel,
        riskColor,
        detectedDiseases: detectedDiseases.map(d => ({ disease: d.disease, medicines: d.medicines, source: d.source })),
        diseaseCount: detectedDiseases.length,
        totalPurchases: c.sales.length,
        recommendations,
        sources: ["ICMR-INDIAB", "NFHS-5", "NMHS India", "ICMR CAD Registry"],
      };
    });

    // Sort by risk score descending
    scored.sort((a, b) => b.riskScore - a.riskScore);

    const summary = {
      total: scored.length,
      high: scored.filter(s => s.riskLevel === "high").length,
      moderate: scored.filter(s => s.riskLevel === "moderate").length,
      low: scored.filter(s => s.riskLevel === "low").length,
      none: scored.filter(s => s.riskLevel === "none").length,
    };

    return NextResponse.json({ patients: scored, summary });
  } catch (err) {
    log.error("pharmacy", "risk_score_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "risk_score_failed", detail: "Risk scores could not be generated. Please retry." }, { status: 500 });
  }
}

export const GET = withProductAuth("pharmacy.risk-score.GET", GET_impl);
