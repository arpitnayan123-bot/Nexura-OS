import { NextRequest, NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { withProductAuth } from "@/lib/nx/product-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* National Formulary of India — Standard Treatment Guidelines
   Published by Ministry of Health & Family Welfare, Government of India
   This is a simplified subset for demo — full NFI has 500+ guidelines */

const NFI_GUIDELINES: Record<string, {
  diagnosis: string;
  icd10: string;
  firstLine: { drug: string; dose: string; duration: string; route: string }[];
  secondLine: { drug: string; dose: string; duration: string; route: string }[];
  nonPharmacological: string[];
  whenToRefer: string;
  monitoring: string;
  icmrTarget?: string;
  pregnancyCategory?: string;
  source: string;
}> = {
  "Hypertension": {
    diagnosis: "Hypertension (Essential)",
    icd10: "I10",
    firstLine: [
      { drug: "Amlodipine 5mg", dose: "5mg OD", duration: "Lifelong", route: "Oral" },
      { drug: "Telmisartan 40mg", dose: "40mg OD", duration: "Lifelong", route: "Oral" },
    ],
    secondLine: [
      { drug: "Ramipril 2.5mg", dose: "2.5mg OD → 5mg", duration: "Lifelong", route: "Oral" },
      { drug: "Metoprolol 25mg", dose: "25mg BD", duration: "Lifelong", route: "Oral" },
    ],
    nonPharmacological: [
      "DASH diet (low salt <5g/day, high fruits & vegetables)",
      "Regular aerobic exercise 30 min/day, 5 days/week",
      "Weight reduction if BMI >25",
      "Avoid tobacco & alcohol",
      "Stress management — yoga, meditation",
    ],
    whenToRefer: "Refer to cardiologist if: BP >180/120 (hypertensive emergency), resistant HTN on 3 drugs, suspected secondary HTN, age <30 with HTN",
    monitoring: "Monitor BP every 2 weeks until controlled, then every 3 months. Annual: fundoscopy, ECG, serum creatinine, electrolytes, urine albumin",
    icmrTarget: "Target BP: <140/90 mmHg (ICMR 2024). For diabetes: <130/80",
    pregnancyCategory: "Avoid ACE inhibitors & ARBs in pregnancy — use Methyldopa",
    source: "National Formulary of India 2024 + ICMR Hypertension Guidelines",
  },
  "Diabetes Type 2": {
    diagnosis: "Type 2 Diabetes Mellitus",
    icd10: "E11.9",
    firstLine: [
      { drug: "Metformin 500mg", dose: "500mg BD → 1000mg BD", duration: "Lifelong", route: "Oral" },
    ],
    secondLine: [
      { drug: "Glimepiride 2mg", dose: "2mg OD", duration: "Lifelong", route: "Oral" },
      { drug: "Vildagliptin 50mg", dose: "50mg BD", duration: "Lifelong", route: "Oral" },
    ],
    nonPharmacological: [
      "Diabetic diet — low glycemic index foods, calorie restriction if overweight",
      "Exercise 150 min/week (walking, cycling)",
      "Self-monitoring of blood glucose (SMBG)",
      "Foot care — daily inspection, proper footwear",
      "Annual: eye exam, foot exam, dental, HbA1c",
    ],
    whenToRefer: "Refer if: HbA1c >9% despite 3 drugs, recurrent hypoglycemia, ketones, foot ulcer, nephropathy (eGFR <60)",
    monitoring: "HbA1c every 3 months. Fasting & PP blood sugar monthly. Annual: lipid profile, serum creatinine, urine microalbumin, fundus exam, foot exam",
    icmrTarget: "HbA1c target: <7% (ICMR-INDIAB). For elderly: <8%",
    pregnancyCategory: "Insulin preferred in pregnancy — oral agents not recommended",
    source: "NFI 2024 + ICMR-INDIAB Treatment Guidelines 2023",
  },
  "Fever": {
    diagnosis: "Acute Undifferentiated Fever",
    icd10: "R50.9",
    firstLine: [
      { drug: "Paracetamol 650mg", dose: "650mg TID PRN", duration: "3-5 days", route: "Oral" },
    ],
    secondLine: [
      { drug: "Ibuprofen 400mg", dose: "400mg BD PRN", duration: "3 days", route: "Oral" },
    ],
    nonPharmacological: [
      "Adequate hydration — 2-3 liters/day",
      "Tepid sponging if temp >102°F",
      "Rest",
      "Monitor for danger signs: rash, bleeding, breathlessness, altered sensorium",
    ],
    whenToRefer: "Refer if: fever >5 days, temp >103°F, bleeding signs, BP <90 systolic, altered sensorium, pregnancy",
    monitoring: "Temperature every 6 hours. CBC if fever >3 days. Dengue NS1 if fever <5 days in endemic area. Widal if >7 days",
    icmrTarget: "If dengue suspected: check platelets daily, avoid NSAIDs (bleeding risk)",
    pregnancyCategory: "Paracetamol is safe in pregnancy. Avoid NSAIDs in 3rd trimester",
    source: "NFI 2024 + NCDC Dengue Guidelines India",
  },
  "Community-Acquired Pneumonia": {
    diagnosis: "Community-Acquired Pneumonia",
    icd10: "J18.9",
    firstLine: [
      { drug: "Amoxicillin+Clavulanic Acid 625mg", dose: "625mg BD", duration: "5-7 days", route: "Oral" },
      { drug: "Azithromycin 500mg", dose: "500mg OD", duration: "5 days", route: "Oral" },
    ],
    secondLine: [
      { drug: "Cefixime 200mg", dose: "200mg BD", duration: "5-7 days", route: "Oral" },
    ],
    nonPharmacological: [
      "Adequate hydration",
      "Rest",
      "Steam inhalation 2-3 times/day",
      "Oxygen if SpO₂ <94%",
      "Avoid smoking",
    ],
    whenToRefer: "Refer if: CURB-65 score ≥2, SpO₂ <90%, age >65 with comorbidities, no improvement in 72 hours",
    monitoring: "Temperature, SpO₂, respiratory rate daily. Chest X-ray if not improving. CBC, CRP baseline",
    icmrTarget: "CURB-65: Confusion, Urea >7, RR >30, BP <90/60, Age >65. Score ≥2 → hospitalize",
    source: "NFI 2024 + ICMR CAP Guidelines + ATS/IDSA adapted for India",
  },
  "GERD": {
    diagnosis: "Gastroesophageal Reflux Disease",
    icd10: "K21.9",
    firstLine: [
      { drug: "Pantoprazole 40mg", dose: "40mg OD (before breakfast)", duration: "4-8 weeks", route: "Oral" },
    ],
    secondLine: [
      { drug: "Rabeprazole 20mg", dose: "20mg OD", duration: "4-8 weeks", route: "Oral" },
      { drug: "Omeprazole 20mg", dose: "20mg OD", duration: "4-8 weeks", route: "Oral" },
    ],
    nonPharmacological: [
      "Avoid spicy, fatty foods, coffee, tea",
      "Avoid late meals (eat 3 hours before bed)",
      "Elevate head end of bed 6 inches",
      "Weight reduction if BMI >25",
      "Avoid smoking & alcohol",
    ],
    whenToRefer: "Refer if: dysphagia, weight loss, anemia, hematemesis, recurrent despite 8 weeks PPI, age >55 with new symptoms",
    monitoring: "Symptom assessment at 4 weeks. Endoscopy if red flags present",
    icmrTarget: "Step-down therapy: after 8 weeks, reduce to alternate day → stop",
    source: "NFI 2024 + Indian Society of Gastroenterology Guidelines",
  },
  "Hypothyroidism": {
    diagnosis: "Primary Hypothyroidism",
    icd10: "E03.9",
    firstLine: [
      { drug: "Levothyroxine (Thyronorm)", dose: "1.6 mcg/kg/day (start 50mcg OD)", duration: "Lifelong", route: "Oral (empty stomach)" },
    ],
    secondLine: [
      { drug: "Levothyroxine (Eltroxin)", dose: "100mcg OD", duration: "Lifelong", route: "Oral (empty stomach)" },
    ],
    nonPharmacological: [
      "Take on empty stomach 30 min before food",
      "Avoid calcium, iron supplements within 4 hours",
      "Iodized salt",
      "Monitor for hyperthyroid symptoms (palpitations, sweating) — over-replacement",
    ],
    whenToRefer: "Refer if: pregnancy (dose needs adjustment), cardiac disease (start 25mcg), myxedema coma, papillary thyroid carcinoma",
    monitoring: "TSH after 6 weeks of starting → adjust dose. Once stable: TSH every 6 months. Free T4 if needed",
    icmrTarget: "TSH target: 0.5–5.0 mIU/L. In pregnancy: <2.5 (1st trimester), <3.0 (2nd-3rd)",
    pregnancyCategory: "Dose increases 25-50% in pregnancy. Monitor TSH every 4 weeks",
    source: "NFI 2024 + ICMR Thyroid Management Guidelines + ATA adapted for India",
  },
  "Asthma": {
    diagnosis: "Bronchial Asthma",
    icd10: "J45.9",
    firstLine: [
      { drug: "Budesonide+Formoterol (Foracort) 200/6mcg", dose: "1 puff BD via inhaler with spacer", duration: "Continue", route: "Inhalation" },
    ],
    secondLine: [
      { drug: "Salbutamol (Asthalin) 100mcg", dose: "2 puffs PRN", duration: "PRN (rescue)", route: "Inhalation" },
      { drug: "Montelukast 10mg", dose: "10mg HS", duration: "Continue if allergic", route: "Oral" },
    ],
    nonPharmacological: [
      "Identify & avoid triggers (dust, pollen, cold air, smoke)",
      "Inhaler technique training — critical!",
      "Annual influenza vaccine",
      "Avoid smoking & secondhand smoke",
      "Peak flow monitoring at home",
    ],
    whenToRefer: "Refer if: not controlled on Step 3 (ICS+LABA+LTRA), frequent exacerbations, ICU admission needed, suspected COPD overlap",
    monitoring: "Symptom assessment every 3 months. Peak expiratory flow rate. Spirometry annually. Check inhaler technique every visit",
    icmrTarget: "GINA Step-wise: Step up if >2 reliever uses/week. Step down if controlled 3 months. Target: no night symptoms, no exacerbations",
    pregnancyCategory: "Inhaled corticosteroids are safe in pregnancy — do not stop",
    source: "NFI 2024 + GINA 2024 adapted for India + ICMR Asthma Guidelines",
  },
  "Coronary Artery Disease": {
    diagnosis: "Chronic Stable Angina / CAD",
    icd10: "I25.1",
    firstLine: [
      { drug: "Aspirin (Ecosprin) 75mg", dose: "75mg OD after food", duration: "Lifelong", route: "Oral" },
      { drug: "Atorvastatin 10mg", dose: "10mg HS", duration: "Lifelong", route: "Oral" },
    ],
    secondLine: [
      { drug: "Clopidogrel (Clopitab) 75mg", dose: "75mg OD (if stented: 12 months DAPT)", duration: "Lifelong/12mo", route: "Oral" },
      { drug: "Metoprolol 25mg", dose: "25mg BD", duration: "Lifelong", route: "Oral" },
    ],
    nonPharmacological: [
      "Low fat, low salt diet (Mediterranean)",
      "Exercise: 30 min walk/day (if cleared by cardiologist)",
      "Strict BP control (<130/80) and diabetes control (HbA1c <7%)",
      "Complete smoking cessation",
      "Weight management (BMI 18.5-24.9)",
    ],
    whenToRefer: "Refer to cardiologist if: unstable angina, MI, planned PCI/CABG, LVEF <40%, recurrent symptoms despite optimal therapy",
    monitoring: "BP, HR every visit. Lipid profile every 3 months (target LDL <70). LFT, renal function every 6 months. ECG annually. Echo if symptoms change",
    icmrTarget: "LDL target: <70 mg/dL (high risk). HbA1c <7%. BP <130/80. All 3 = optimal secondary prevention (ICMR)",
    pregnancyCategory: "Aspirin: avoid in 3rd trimester. Statins: contraindicated. Use heparin instead",
    source: "NFI 2024 + ICMR CAD Secondary Prevention Guidelines + ACC/AHA adapted for India",
  },
  "Migraine": {
    diagnosis: "Migraine without Aura",
    icd10: "G43.0",
    firstLine: [
      { drug: "Paracetamol 650mg", dose: "650mg stat at onset", duration: "PRN", route: "Oral" },
      { drug: "Ibuprofen 400mg", dose: "400mg stat at onset", duration: "PRN", route: "Oral" },
    ],
    secondLine: [
      { drug: "Naproxen 500mg", dose: "500mg stat", duration: "PRN", route: "Oral" },
      { drug: "Propranolol 40mg (prophylaxis)", dose: "40mg BD", duration: "3-6 months if >4 attacks/month", route: "Oral" },
    ],
    nonPharmacological: [
      "Identify & avoid triggers (stress, lack of sleep, specific foods, bright light)",
      "Maintain regular sleep schedule",
      "Hydration — 2-3 liters/day",
      "Maintain headache diary",
    ],
    whenToRefer: "Refer if: new onset after age 50, worst headache ever, neurological deficit, fever + headache, visual changes, pattern change",
    monitoring: "Headache diary (frequency, triggers, response). Assess every 3 months. Consider prophylaxis if >4 attacks/month or >4 headache days/month",
    icmrTarget: "Prophylaxis: Propranolol 40mg BD OR Amitriptyline 10mg HS OR Flunarizine 10mg HS. Choose based on comorbidities",
    pregnancyCategory: "Paracetamol is safe. Avoid NSAIDs in 3rd trimester. Propranolol: weigh benefit/risk",
    source: "NFI 2024 + Indian Headache Society Guidelines + IHS adapted for India",
  },
  "Anemia": {
    diagnosis: "Iron Deficiency Anemia",
    icd10: "D50.9",
    firstLine: [
      { drug: "Ferrous Sulphate 325mg", dose: "1 tablet OD with Vit C", duration: "3 months after Hb normalizes", route: "Oral" },
      { drug: "Folic Acid 5mg", dose: "5mg OD", duration: "3 months", route: "Oral" },
    ],
    secondLine: [
      { drug: "Iron Sucrose IV", dose: "100mg IV alternate days", duration: "Till total dose given", route: "IV (if oral intolerant)" },
    ],
    nonPharmacological: [
      "Iron-rich diet: green leafy vegetables, jaggery, dates, meat, eggs",
      "Vitamin C rich foods with meals (enhances iron absorption)",
      "Avoid tea/coffee within 1 hour of meals (tannins inhibit absorption)",
      "Deworming: Albendazole 400mg single dose (if hookworm endemic)",
    ],
    whenToRefer: "Refer if: Hb <7 g/dL, no response to oral iron in 4 weeks, underlying cause (fibroids, GI bleed), pregnancy with Hb <8",
    monitoring: "Hb every 4 weeks. Reticulocyte count at 7-10 days (response marker). Ferritin, TIBC at baseline. Continue iron 3 months after Hb normal",
    icmrTarget: "NFHS-5: 57% Indian women anemic. Target Hb: >12 (women), >13 (men). Screen all pregnant women, adolescent girls",
    pregnancyCategory: "Iron supplementation mandatory in pregnancy (IFA tablet: 60mg iron + 0.5mg folic acid daily)",
    source: "NFI 2024 + NFHS-5 Guidelines + Ministry of Health Anemia Mukt Bharat",
  },
};

// GET /api/clinic/nfi-guidelines?diagnosis=Hypertension
async function GET_impl(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const diagnosis = (searchParams.get("diagnosis") || "").trim();

    if (diagnosis) {
      // fuzzy match
      let key = Object.keys(NFI_GUIDELINES).find(k => k.toLowerCase() === diagnosis.toLowerCase());
      if (!key) key = Object.keys(NFI_GUIDELINES).find(k => k.toLowerCase().includes(diagnosis.toLowerCase()) || diagnosis.toLowerCase().includes(k.toLowerCase()));

      if (key) {
        return NextResponse.json({ guideline: NFI_GUIDELINES[key], source: "National Formulary of India 2024" });
      }
      return NextResponse.json({ guideline: null, message: "No NFI guideline found for this diagnosis" });
    }

    // return list of available guidelines
    return NextResponse.json({
      guidelines: Object.keys(NFI_GUIDELINES).map(k => ({ diagnosis: k, icd10: NFI_GUIDELINES[k].icd10 })),
      count: Object.keys(NFI_GUIDELINES).length,
      source: "National Formulary of India — Ministry of Health & Family Welfare",
    });
  } catch (err) {
    log.error("clinic", "nfi_guidelines_failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "nfi_failed", detail: "NFI guidelines could not be loaded. Please retry." }, { status: 500 });
  }
}

export const GET = withProductAuth("clinic.nfi-guidelines.GET", GET_impl);
