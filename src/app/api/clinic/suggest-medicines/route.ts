import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Diagnosis-Driven Medicine Suggestion Engine
   Isabel DDx + Infermedica ranking methodology
   Enhanced for India: NFI, NPPA, CDSCO, pharmacy stock, allergies */

const NFI_GUIDELINES: Record<
  string,
  {
    firstLine: { medicine: string; salt: string; dosage: string; duration: string }[];
    secondLine: { medicine: string; salt: string; dosage: string; duration: string }[];
    notes: string;
  }
> = {
  Hypertension: {
    firstLine: [
      { medicine: "Amlong", salt: "Amlodipine", dosage: "5mg OD", duration: "Continue" },
      { medicine: "Telma", salt: "Telmisartan", dosage: "40mg OD", duration: "Continue" },
    ],
    secondLine: [
      { medicine: "Cardace", salt: "Ramipril", dosage: "2.5mg OD", duration: "Continue" },
      { medicine: "Starpress", salt: "Metoprolol", dosage: "25mg BD", duration: "Continue" },
    ],
    notes:
      "Start single agent. If BP uncontrolled in 2 weeks, add second drug. Target <140/90 (ICMR).",
  },
  "Diabetes Type 2": {
    firstLine: [
      { medicine: "Glycomet", salt: "Metformin", dosage: "500mg BD", duration: "Continue" },
    ],
    secondLine: [
      { medicine: "Glimisave", salt: "Glimepiride", dosage: "2mg OD", duration: "Continue" },
      { medicine: "Galvus", salt: "Vildagliptin", dosage: "50mg BD", duration: "Continue" },
    ],
    notes: "First-line: Metformin. HbA1c target <7% (ICMR-INDIAB). Add SGLT2i if CV risk.",
  },
  "Type 2 Diabetes Mellitus": {
    firstLine: [
      { medicine: "Glycomet", salt: "Metformin", dosage: "500mg BD", duration: "Continue" },
    ],
    secondLine: [
      { medicine: "Glimisave", salt: "Glimepiride", dosage: "2mg OD", duration: "Continue" },
    ],
    notes: "ICMR-INDIAB protocol.",
  },
  Fever: {
    firstLine: [
      { medicine: "Dolo", salt: "Paracetamol", dosage: "650mg TID", duration: "3-5 days" },
      { medicine: "Crocin", salt: "Paracetamol", dosage: "500mg TID", duration: "3-5 days" },
    ],
    secondLine: [
      { medicine: "Combiflam", salt: "Ibuprofen+Paracetamol", dosage: "1 BD", duration: "3 days" },
    ],
    notes: "If fever >5 days, investigate. Avoid NSAIDs if dengue suspected.",
  },
  "Viral Fever": {
    firstLine: [
      { medicine: "Dolo", salt: "Paracetamol", dosage: "650mg TID", duration: "3-5 days" },
    ],
    secondLine: [],
    notes: "Symptomatic. Hydration. Check CBC + Dengue NS1 if persistent.",
  },
  "Common Cold": {
    firstLine: [
      { medicine: "Cetzine", salt: "Cetirizine", dosage: "10mg HS", duration: "5 days" },
      { medicine: "Benadryl", salt: "Diphenhydramine", dosage: "10ml HS", duration: "5 days" },
    ],
    secondLine: [
      {
        medicine: "Ascoril",
        salt: "Bromhexine+Guaifenesin",
        dosage: "10ml TID",
        duration: "5 days",
      },
    ],
    notes: "Symptomatic. Steam inhalation. Antibiotics not indicated unless bacterial.",
  },
  "Acute Pharyngitis": {
    firstLine: [
      { medicine: "Dolo", salt: "Paracetamol", dosage: "650mg TID", duration: "3 days" },
      { medicine: "Cetzine", salt: "Cetirizine", dosage: "10mg HS", duration: "5 days" },
    ],
    secondLine: [
      { medicine: "Azithral", salt: "Azithromycin", dosage: "500mg OD", duration: "3 days" },
    ],
    notes: "Centor score ≥3 → consider antibiotic. Throat swab if recurrent.",
  },
  "Community-Acquired Pneumonia": {
    firstLine: [
      {
        medicine: "Augmentin",
        salt: "Amoxicillin+Clavulanic Acid",
        dosage: "625mg BD",
        duration: "5-7 days",
      },
      { medicine: "Azithral", salt: "Azithromycin", dosage: "500mg OD", duration: "5 days" },
    ],
    secondLine: [{ medicine: "Zifi", salt: "Cefixime", dosage: "200mg BD", duration: "5-7 days" }],
    notes: "CURB-65 score. Hospitalize if ≥2.",
  },
  Gastroenteritis: {
    firstLine: [
      {
        medicine: "ORS",
        salt: "Oral Rehydration Solution",
        dosage: "As needed",
        duration: "3 days",
      },
      { medicine: "Metrogyl", salt: "Metronidazole", dosage: "400mg TID", duration: "5 days" },
    ],
    secondLine: [
      { medicine: "Oflox", salt: "Ofloxacin", dosage: "200mg BD", duration: "3-5 days" },
    ],
    notes: "Hydration is key. Stool culture if bloody. Avoid antibiotics in viral.",
  },
  "Acid Peptic Disease": {
    firstLine: [
      { medicine: "Pan", salt: "Pantoprazole", dosage: "40mg OD", duration: "2-4 weeks" },
      { medicine: "Omez", salt: "Omeprazole", dosage: "20mg OD", duration: "2-4 weeks" },
    ],
    secondLine: [
      { medicine: "Razo", salt: "Rabeprazole", dosage: "20mg OD", duration: "2-4 weeks" },
    ],
    notes: "Lifestyle modification. H. pylori testing if recurrent.",
  },
  GERD: {
    firstLine: [
      { medicine: "Pan", salt: "Pantoprazole", dosage: "40mg OD", duration: "4-8 weeks" },
    ],
    secondLine: [
      { medicine: "Razo", salt: "Rabeprazole", dosage: "20mg OD", duration: "4-8 weeks" },
    ],
    notes: "Avoid late meals. Elevate head end. H. pylori eradication if positive.",
  },
  Migraine: {
    firstLine: [
      { medicine: "Dolo", salt: "Paracetamol", dosage: "650mg PRN", duration: "PRN" },
      { medicine: "Brufen", salt: "Ibuprofen", dosage: "400mg PRN", duration: "PRN" },
    ],
    secondLine: [],
    notes: "Prophylaxis if >4 attacks/month (Propranolol 40mg BD).",
  },
  Hypothyroidism: {
    firstLine: [
      { medicine: "Thyronorm", salt: "Levothyroxine", dosage: "50mcg OD", duration: "Continue" },
    ],
    secondLine: [
      { medicine: "Eltroxin", salt: "Levothyroxine", dosage: "100mcg OD", duration: "Continue" },
    ],
    notes: "Empty stomach. Check TSH after 6 weeks.",
  },
  Asthma: {
    firstLine: [
      {
        medicine: "Foracort",
        salt: "Budesonide+Formoterol",
        dosage: "200/6mcg 1-0-1 inhaler",
        duration: "Continue",
      },
    ],
    secondLine: [
      { medicine: "Asthalin", salt: "Salbutamol", dosage: "100mcg PRN inhaler", duration: "PRN" },
    ],
    notes: "Step-up/down per GINA. Check inhaler technique. Annual flu vaccine.",
  },
  Anemia: {
    firstLine: [
      { medicine: "Shelcal", salt: "Calcium+Vitamin D3", dosage: "1 OD", duration: "3 months" },
      { medicine: "Becosules", salt: "B-Complex", dosage: "1 OD", duration: "1 month" },
    ],
    secondLine: [
      { medicine: "Zincovit", salt: "Multivitamin+Zinc", dosage: "1 OD", duration: "1 month" },
    ],
    notes: "Check CBC + Iron studies. NFHS-5: 57% women anemic in India.",
  },
  "Coronary Artery Disease": {
    firstLine: [
      { medicine: "Ecosprin", salt: "Aspirin", dosage: "75mg OD", duration: "Continue" },
      { medicine: "Rosuvas", salt: "Rosuvastatin", dosage: "10mg HS", duration: "Continue" },
    ],
    secondLine: [
      { medicine: "Clopitab", salt: "Clopidogrel", dosage: "75mg OD", duration: "Continue" },
      { medicine: "Starpress", salt: "Metoprolol", dosage: "25mg BD", duration: "Continue" },
    ],
    notes: "Dual antiplatelet if stented. Statin target LDL <70.",
  },
};

const NPPA_PRICES: Record<
  string,
  { pricePerStrip: number; controlled: boolean; ceilingPrice?: number }
> = {
  Glycomet: { pricePerStrip: 28, controlled: true, ceilingPrice: 30 },
  Dolo: { pricePerStrip: 35, controlled: true, ceilingPrice: 38 },
  Crocin: { pricePerStrip: 30, controlled: true, ceilingPrice: 32 },
  Amlong: { pricePerStrip: 45, controlled: true, ceilingPrice: 50 },
  Telma: { pricePerStrip: 65, controlled: false },
  Cardace: { pricePerStrip: 55, controlled: false },
  Ecosprin: { pricePerStrip: 8, controlled: true, ceilingPrice: 10 },
  Azithral: { pricePerStrip: 90, controlled: false },
  Augmentin: { pricePerStrip: 220, controlled: false },
  Pan: { pricePerStrip: 42, controlled: true, ceilingPrice: 45 },
  Cetzine: { pricePerStrip: 18, controlled: true, ceilingPrice: 20 },
};

const BANNED_FDCS = [
  "Nimesulide+Paracetamol",
  "Nimesulide+Cetirizine",
  "Paracetamol+Phenylephrine+Caffeine",
  "Amoxicillin+Diclofenac",
  "Levocetirizine+Ambroxol",
  "Ofloxacin+Ornidazole+Aceclofenac",
];

// POST /api/clinic/suggest-medicines
async function POST_impl(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const diagnosis = (body?.diagnosis || "").trim();
    const patientAllergies: string[] = Array.isArray(body?.patientAllergies)
      ? body.patientAllergies
      : [];
    const patientCurrentMeds: string[] = Array.isArray(body?.patientCurrentMeds)
      ? body.patientCurrentMeds
      : [];

    if (!diagnosis) return NextResponse.json({ error: "no_diagnosis" }, { status: 400 });

    // fuzzy match diagnosis to NFI key
    let key = Object.keys(NFI_GUIDELINES).find((k) => k.toLowerCase() === diagnosis.toLowerCase());
    if (!key)
      key = Object.keys(NFI_GUIDELINES).find(
        (k) =>
          k.toLowerCase().includes(diagnosis.toLowerCase()) ||
          diagnosis.toLowerCase().includes(k.toLowerCase()),
      );
    if (!key) {
      return NextResponse.json({
        suggestions: [],
        guidelines: null,
        message: "No NFI guidelines found for this diagnosis. Please prescribe manually.",
      });
    }

    const guidelines = NFI_GUIDELINES[key];
    const allSuggestions = [...guidelines.firstLine, ...guidelines.secondLine];
    const stockList: string[] = Array.isArray(body?.pharmacyStock) ? body.pharmacyStock : [];

    // fetch from drug DB
    const dbDrugs = await db.indianDrug.findMany({
      where: { brandName: { in: allSuggestions.map((s) => s.medicine) } },
    });
    const drugMap = new Map(dbDrugs.map((d) => [d.brandName, d]));

    const suggestions = allSuggestions.map((s, idx) => {
      const drug = drugMap.get(s.medicine);
      const nppa = NPPA_PRICES[s.medicine];
      const inStock = stockList.length === 0 || stockList.includes(s.medicine);
      const isAllergyConflict = patientAllergies.some(
        (a) =>
          s.salt.toLowerCase().includes(a.toLowerCase()) ||
          s.medicine.toLowerCase().includes(a.toLowerCase()),
      );
      const isDuplicate = patientCurrentMeds.some(
        (m) =>
          s.salt.toLowerCase().includes(m.toLowerCase()) ||
          m.toLowerCase().includes(s.salt.toLowerCase()),
      );
      const isBannedFDC = BANNED_FDCS.some(
        (b) => s.salt.toLowerCase().includes(b.toLowerCase().split("+")[0]) && s.salt.includes("+"),
      );

      let rank = idx < guidelines.firstLine.length ? 1 : 2;
      if (!inStock) rank += 10;
      if (isAllergyConflict) rank += 20;
      if (isDuplicate) rank += 5;
      if (isBannedFDC) rank += 30;

      const tabletsPerStrip = 15; // avg
      const dosagePerDay = s.dosage.includes("BD") ? 2 : s.dosage.includes("TID") ? 3 : 1;
      const pricePerDay = nppa
        ? Math.round((nppa.pricePerStrip / tabletsPerStrip) * dosagePerDay * 100) / 100
        : null;

      const reasoning: string[] = [];
      reasoning.push(idx < guidelines.firstLine.length ? "NFI first-line" : "NFI second-line");
      if (nppa?.controlled) reasoning.push(`NPPA controlled (ceiling ₹${nppa.ceilingPrice})`);
      if (pricePerDay !== null) reasoning.push(`₹${pricePerDay}/day`);
      if (!inStock && stockList.length > 0) reasoning.push("Not in pharmacy stock");
      if (isAllergyConflict) reasoning.push("Allergy conflict");
      if (isBannedFDC) reasoning.push("CDSCO BANNED — do not prescribe");

      return {
        medicine: s.medicine,
        salt: s.salt,
        dosage: s.dosage,
        duration: s.duration,
        line: idx < guidelines.firstLine.length ? "first" : "second",
        rank,
        pricePerStrip: nppa?.pricePerStrip || null,
        pricePerDay,
        nppaControlled: nppa?.controlled || false,
        ceilingPrice: nppa?.ceilingPrice || null,
        schedule: drug?.schedule || null,
        cdcsoBanned: isBannedFDC,
        inStock,
        allergyConflict: isAllergyConflict,
        duplicateTherapy: isDuplicate,
        form: drug?.form || "tablet",
        company: drug?.company || null,
        reasoning: reasoning.join(" · "),
      };
    });

    suggestions.sort((a, b) => a.rank - b.rank);

    return NextResponse.json({
      suggestions,
      guidelines: {
        firstLine: guidelines.firstLine.length,
        secondLine: guidelines.secondLine.length,
        notes: guidelines.notes,
        diagnosis: key,
      },
      nfiSource: "National Formulary of India",
      nppaSource: "NPPA",
      bannedFdcCheck: "CDSCO banned FDC list checked",
    });
  } catch (err) {
    log.error("clinic", "suggest_medicines_failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error: "suggest_failed",
        detail: "Medicine suggestions could not be generated. Please retry.",
      },
      { status: 500 },
    );
  }
}

export const POST = withProductAuth("clinic.suggest-medicines.POST", POST_impl);
