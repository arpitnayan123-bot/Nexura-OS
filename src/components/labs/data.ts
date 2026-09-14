"use client";

/* ============================================================
   NEXURA LABS — catalog data
   ------------------------------------------------------------
   Static, deterministic demo data for the Labs experience:
   popular panels, the searchable test catalog, collection
   slots and the mock AI-decoded report. All prices in INR.
   ============================================================ */

export type LabTest = {
  id: string;
  name: string;
  category: "Blood" | "Thyroid" | "Diabetes" | "Heart" | "Vitamin" | "Liver" | "Kidney";
  price: number;
  mrp: number;
  reportsIn: string;
  fasting?: boolean;
  popular?: boolean;
  sample: string;
};

export const LAB_TESTS: LabTest[] = [
  { id: "cbc", name: "Complete Blood Count (CBC)", category: "Blood", price: 299, mrp: 550, reportsIn: "6 hrs", sample: "Blood", popular: true },
  { id: "hba1c", name: "HbA1c — Glycated Hemoglobin", category: "Diabetes", price: 449, mrp: 800, reportsIn: "6 hrs", sample: "Blood", popular: true },
  { id: "tsh", name: "TSH — Thyroid Stimulating Hormone", category: "Thyroid", price: 299, mrp: 500, reportsIn: "6 hrs", sample: "Blood" },
  { id: "thyroid-profile", name: "Thyroid Profile (T3, T4, TSH)", category: "Thyroid", price: 599, mrp: 1100, reportsIn: "8 hrs", sample: "Blood", popular: true },
  { id: "lipid", name: "Lipid Profile — Cholesterol Panel", category: "Heart", price: 499, mrp: 900, reportsIn: "6 hrs", fasting: true, sample: "Blood", popular: true },
  { id: "vitd", name: "Vitamin D (25-OH)", category: "Vitamin", price: 799, mrp: 1500, reportsIn: "12 hrs", sample: "Blood", popular: true },
  { id: "vitb12", name: "Vitamin B12 (Cobalamin)", category: "Vitamin", price: 649, mrp: 1200, reportsIn: "12 hrs", sample: "Blood" },
  { id: "lft", name: "Liver Function Test (LFT)", category: "Liver", price: 549, mrp: 1000, reportsIn: "8 hrs", fasting: true, sample: "Blood" },
  { id: "kft", name: "Kidney Function Test (KFT)", category: "Kidney", price: 549, mrp: 1000, reportsIn: "8 hrs", fasting: true, sample: "Blood" },
  { id: "fbs", name: "Fasting Blood Sugar (FBS)", category: "Diabetes", price: 149, mrp: 300, reportsIn: "6 hrs", fasting: true, sample: "Blood" },
  { id: "crp", name: "CRP — Inflammation Marker", category: "Blood", price: 499, mrp: 900, reportsIn: "8 hrs", sample: "Blood" },
  { id: "troponin", name: "Troponin-I — Cardiac Marker", category: "Heart", price: 899, mrp: 1600, reportsIn: "4 hrs", sample: "Blood" },
  { id: "ferritin", name: "Ferritin — Iron Storage", category: "Blood", price: 599, mrp: 1100, reportsIn: "12 hrs", sample: "Blood" },
  { id: "urine", name: "Urine Routine & Microscopy", category: "Kidney", price: 199, mrp: 400, reportsIn: "6 hrs", sample: "Urine" },
  { id: "ecg", name: "Resting ECG at Home", category: "Heart", price: 699, mrp: 1200, reportsIn: "1 hr", sample: "Leads", popular: true },
];

export const CATEGORIES = ["All", "Blood", "Diabetes", "Thyroid", "Heart", "Vitamin", "Liver", "Kidney"] as const;

export type Panel = {
  id: string;
  name: string;
  tagline: string;
  tests: number;
  price: number;
  mrp: number;
  includes: string[];
  flag: string;
};

export const PANELS: Panel[] = [
  {
    id: "fullbody",
    name: "Full Body Gold",
    tagline: "The complete annual picture — 92 biomarkers across blood, organs, vitamins and cardiac risk.",
    tests: 92,
    price: 2499,
    mrp: 5999,
    includes: ["CBC + ESR", "LFT + KFT", "Lipid + HbA1c", "Thyroid trio", "Vitamin D + B12", "Urine routine"],
    flag: "Most booked",
  },
  {
    id: "diabetes",
    name: "Diabetes Care Panel",
    tagline: "Sugar control, tracked properly — HbA1c with the kidney and lipid markers diabetics actually need.",
    tests: 24,
    price: 999,
    mrp: 2400,
    includes: ["HbA1c", "Fasting sugar", "Lipid profile", "KFT", "Urine microalbumin"],
    flag: "Chronic care",
  },
  {
    id: "thyroid",
    name: "Thyroid Care Trio",
    tagline: "T3, T4 and TSH together — because one number never tells the thyroid story.",
    tests: 3,
    price: 599,
    mrp: 1100,
    includes: ["T3", "T4", "TSH", "AI interpretation"],
    flag: "6-hr report",
  },
  {
    id: "heart",
    name: "Heart Risk Screen",
    tagline: "India's #1 risk, measured — cholesterol fractions, inflammation and cardiac markers in one draw.",
    tests: 18,
    price: 1299,
    mrp: 3100,
    includes: ["Lipid profile", "HS-CRP", "Troponin-I", "Homocysteine", "ECG at home"],
    flag: "Guardian pick",
  },
  {
    id: "women",
    name: "Women's Wellness",
    tagline: "Iron, hormones, vitamins and thyroid — the panel built for the deficiencies Indian women face most.",
    tests: 41,
    price: 1599,
    mrp: 3800,
    includes: ["CBC + Ferritin", "Vitamin D + B12", "Thyroid trio", "Hormone screen", "Calcium"],
    flag: "Female phlebotomist",
  },
  {
    id: "senior",
    name: "Senior Citizen 60+",
    tagline: "Bone, kidney, heart and sugar — a dignified annual screen for parents, from home.",
    tests: 68,
    price: 1899,
    mrp: 4600,
    includes: ["CBC", "LFT + KFT", "Bone profile", "Lipid + HbA1c", "PSA / Pap option"],
    flag: "Priority slot",
  },
];

export const STEPS = [
  {
    step: "01",
    title: "Book in 30 seconds",
    body: "Pick a panel or build your own cart, choose today or tomorrow, and lock a 30-minute collection window.",
  },
  {
    step: "02",
    title: "Phlebotomist at your door",
    body: "A certified, background-verified phlebotomist arrives in your window — sealed kit, single-use needle, ID on arrival.",
  },
  {
    step: "03",
    title: "NABL-certified labs run it",
    body: "Samples travel temperature-tracked to our NABL-accredited partner labs. Every machine calibration is logged.",
  },
  {
    step: "04",
    title: "AI-decoded report in hours",
    body: "Ranges translated into plain language, trends against your history, flags your doctor can act on. Six hours, most panels.",
  },
];

export const SLOT_DAYS = ["Today", "Tomorrow", "Sat 14", "Mon 16"];

export const SLOT_TIMES = ["07:00 – 07:30", "08:00 – 08:30", "09:30 – 10:00", "17:00 – 17:30", "19:00 – 19:30"];

export type Biomarker = {
  name: string;
  value: string;
  unit: string;
  range: string;
  status: "in" | "watch" | "out";
  note: string;
};

export const MOCK_REPORT: Biomarker[] = [
  { name: "Hemoglobin", value: "13.8", unit: "g/dL", range: "13.0 – 17.0", status: "in", note: "Healthy oxygen-carrying capacity." },
  { name: "HbA1c", value: "5.9", unit: "%", range: "4.0 – 5.6", status: "watch", note: "Slightly above ideal — trending toward pre-diabetes. Diet review recommended." },
  { name: "LDL Cholesterol", value: "148", unit: "mg/dL", range: "< 100", status: "out", note: "Above target. Consider lipid clinic consult and dietary changes." },
  { name: "Vitamin D", value: "18", unit: "ng/mL", range: "30 – 100", status: "out", note: "Deficient — common in India. 8-week supplement course suggested." },
  { name: "TSH", value: "2.4", unit: "µIU/mL", range: "0.4 – 4.0", status: "in", note: "Thyroid function well within range." },
  { name: "SGPT (ALT)", value: "31", unit: "U/L", range: "7 – 56", status: "in", note: "Liver enzymes normal." },
];
