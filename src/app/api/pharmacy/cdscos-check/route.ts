import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* CDSCO Banned FDC Database + Medicine Safety Checker
   Source: Central Drugs Standard Control Organization (cdsco.gov.in)
   Drugs & Cosmetics Act, 1940 — Section 26A banned combinations
   Plus: banned single drugs, schedule X restrictions */

// CDSCO banned Fixed Dose Combinations (FDCs)
// These are combinations prohibited from manufacture and sale in India
const BANNED_FDCS: { combination: string; reason: string; banDate: string; category: string }[] = [
  { combination: "Nimesulide+Paracetamol", reason: "Hepatotoxicity risk — synergistic liver damage", banDate: "2011", category: "NSAID+Analgesic" },
  { combination: "Nimesulide+Cetirizine", reason: "Irrational FDC — no therapeutic justification", banDate: "2011", category: "NSAID+Antihistamine" },
  { combination: "Nimesulide+Ofloxacin", reason: "Irrational FDC — antibiotic+NSAID without indication", banDate: "2011", category: "NSAID+Antibiotic" },
  { combination: "Paracetamol+Phenylephrine+Caffeine", reason: "Irrational combination — safety concerns", banDate: "2011", category: "Analgesic+Decongestant+CNS" },
  { combination: "Paracetamol+Levocetirizine", reason: "Irrational FDC — unnecessary combination", banDate: "2011", category: "Analgesic+Antihistamine" },
  { combination: "Amoxicillin+Diclofenac", reason: "Irrational FDC — antibiotic+NSAID", banDate: "2011", category: "Antibiotic+NSAID" },
  { combination: "Levocetirizine+Ambroxol", reason: "Irrational FDC — antihistamine+mucolytic", banDate: "2011", category: "Antihistamine+Mucolytic" },
  { combination: "Ofloxacin+Ornidazole+Aceclofenac", reason: "Triple irrational FDC", banDate: "2011", category: "Antibiotic+Antiprotozoal+NSAID" },
  { combination: "Amoxicillin+Cloxacillin", reason: "Irrational dual antibiotic FDC", banDate: "2011", category: "Dual Antibiotic" },
  { combination: "Cetirizine+Paracetamol", reason: "Irrational FDC — no added benefit", banDate: "2011", category: "Antihistamine+Analgesic" },
  { combination: "Diclofenac+Paracetamol+Chlorzoxazone", reason: "Irrational triple FDC", banDate: "2011", category: "NSAID+Analgesic+Muscle Relaxant" },
  { combination: "Ibuprofen+Dextropropoxyphene", reason: "Dextropropoxyphene banned globally", banDate: "2011", category: "NSAID+Opioid" },
  { combination: "Ranitidine+Domperidone", reason: "Irrational FDC", banDate: "2011", category: "Antacid+Prokinetic" },
  { combination: "Pantoprazole+Domperidone", reason: "Irrational FDC — separate dosing preferred", banDate: "2011", category: "PPI+Prokinetic" },
  { combination: "Azithromycin+Ambroxol", reason: "Irrational FDC — antibiotic+mucolytic", banDate: "2011", category: "Antibiotic+Mucolytic" },
  { combination: "Cefixime+Ofloxacin", reason: "Dual fluoroquinolone-cephalosporin — promotes resistance", banDate: "2011", category: "Dual Antibiotic" },
  { combination: "Metformin+Glimepiride+Pioglitazone", reason: "Triple anti-diabetic FDC — safety concerns", banDate: "2011", category: "Triple Antidiabetic" },
  { combination: "Diclofenac+Tramadol", reason: "Safety concerns — CNS depression risk", banDate: "2011", category: "NSAID+Opioid" },
  { combination: "Chloramphenicol+Steroids", reason: "High risk of blindness if used topically", banDate: "2011", category: "Antibiotic+Steroid" },
  { combination: "Sibutramine+Any", reason: "Sibutramine banned — cardiovascular risk", banDate: "2011", category: "Anti-obesity" },
];

// CDSCO banned single drugs
const BANNED_DRUGS: { drug: string; reason: string }[] = [
  { drug: "Sibutramine", reason: "Banned — cardiovascular risk (stroke, MI)" },
  { drug: "Rimonabant", reason: "Banned — psychiatric side effects (suicidal ideation)" },
  { drug: "Dextropropoxyphene", reason: "Banned — cardiac toxicity, overdose risk" },
  { drug: "Nimesulide (in children <12)", reason: "Banned for pediatric use — hepatotoxicity" },
  { drug: "Phenylpropanolamine", reason: "Banned — stroke risk" },
  { drug: "Gatifloxacin (oral)", reason: "Banned (oral) — dysglycemia risk. Topical OK" },
  { drug: "Tegaserod", reason: "Banned — cardiovascular ischemic events" },
  { drug: "Rosiglitazone", reason: "Banned — cardiovascular risk" },
  { drug: "Halogenated fluoroalkanes (CFC inhalers)", reason: "Banned — environmental (Montreal Protocol)" },
];

// GET /api/pharmacy/cdscos-check?q=medicine+salt — check if drug is banned
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    if (!q) {
      return NextResponse.json({
        bannedFDCs: BANNED_FDCS.length,
        bannedDrugs: BANNED_DRUGS.length,
        source: "CDSCO — Central Drugs Standard Control Organization (cdsco.gov.in)",
        lawReference: "Drugs & Cosmetics Act, 1940 — Section 26A",
      });
    }

    // Check FDC bans
    // FDC ban: only flag if BOTH parts of a combination are present in the query
    const fdcMatch = BANNED_FDCS.find(f => {
      const parts = f.combination.toLowerCase().split("+").map(p => p.trim());
      // require ALL parts present AND query contains "+" or "and" (indicating a combination)
      const isCombinationQuery = q.includes("+") || q.includes(" and ") || q.includes(" with ");
      return isCombinationQuery && parts.every(part => q.includes(part));
    });

    // Check single drug bans
    // Single drug ban: match if the drug name appears as a standalone word
    const drugMatch = BANNED_DRUGS.find(d => {
      const drugLower = d.drug.toLowerCase();
      // for "Nimesulide (in children <12)" — extract base name
      const baseDrug = drugLower.split(" ")[0];
      return q === baseDrug || q.startsWith(baseDrug + " ") || q.includes(" " + baseDrug + " ") || q.endsWith(" " + baseDrug);
    });

    return NextResponse.json({
      query: q,
      isBanned: !!(fdcMatch || drugMatch),
      fdcBan: fdcMatch ? { combination: fdcMatch.combination, reason: fdcMatch.reason, banDate: fdcMatch.banDate, category: fdcMatch.category } : null,
      drugBan: drugMatch ? { drug: drugMatch.drug, reason: drugMatch.reason } : null,
      source: "CDSCO — cdsco.gov.in",
      lawReference: "Section 26A, Drugs & Cosmetics Act, 1940",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "cdsco_check_failed", detail: message }, { status: 500 });
  }
}
