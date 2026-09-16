/**
 * Nexura OS — Portal Seed (Round 22)
 *
 * Idempotent: safe to re-run. Creates:
 *   1 PortalUser       — Suresh Nair, linked to existing HospitalPatient
 *   4 Phlebotomists    — Mumbai-wide field collectors
 *   4 BloodBookings    — completed / in-progress / upcoming / cancelled
 *
 * Run:  bunx tsx scripts/seed-portal.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

/* Demo-seed guard: demo seeds write synthetic patients/staff with known
   passwords and demo API keys — they must never run against a production
   database by accident. Override requires an explicit, intentional flag. */
if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO_OVERRIDE !== "true") {
  console.error(
    "[seed] Refusing to seed demo data: NODE_ENV=production. If this is genuinely intentional, re-run with SEED_DEMO_OVERRIDE=true."
  );
  process.exit(1);
}

const db = new PrismaClient();

// ============================================================================
// Types
// ============================================================================
type LabTest = {
  name: string;
  value: string;
  unit: string;
  refRange: string;
  flag: "normal" | "borderline" | "high" | "low" | "critical";
  category: string;
};

type LabReport = {
  panelCode: string;
  panelName: string;
  collectedAt: string;
  reportedAt: string;
  labName: string;
  tests: LabTest[];
};

// ============================================================================
// HELPERS
// ============================================================================
function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(10, 30, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function daysAhead(n: number): Date {
  const d = new Date();
  d.setHours(7, 30, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function genBookingRef(year: number, seq: number): string {
  return `NX-BLD-${year}-${String(seq).padStart(5, "0")}`;
}

// ============================================================================
// REPORT DATA — realistic Indian lab values
// ============================================================================

// 22-test Full Body Checkup report (CBC + LFT + KFT + Lipid + Thyroid + HbA1c + Vitamins)
function fullBodyReport(): LabReport {
  return {
    panelCode: "FULL_BODY",
    panelName: "Full Body Health Checkup (22 tests)",
    collectedAt: daysAgo(28).toISOString(),
    reportedAt: daysAgo(26).toISOString(),
    labName: "Nexura Diagnostics · Andheri East, Mumbai",
    tests: [
      // ---- CBC (6) ----
      { name: "Hemoglobin", value: "14.2", unit: "g/dL", refRange: "13.0–17.0", flag: "normal", category: "Complete Blood Count" },
      { name: "RBC Count", value: "5.1", unit: "mill/uL", refRange: "4.5–5.5", flag: "normal", category: "Complete Blood Count" },
      { name: "WBC Count", value: "6800", unit: "/uL", refRange: "4000–11000", flag: "normal", category: "Complete Blood Count" },
      { name: "Platelet Count", value: "2.4", unit: "lakh/uL", refRange: "1.5–4.5", flag: "normal", category: "Complete Blood Count" },
      { name: "Hematocrit (PCV)", value: "44.5", unit: "%", refRange: "40–50", flag: "normal", category: "Complete Blood Count" },
      { name: "MCV", value: "87.3", unit: "fL", refRange: "80–100", flag: "normal", category: "Complete Blood Count" },

      // ---- LFT (4) ----
      { name: "Total Bilirubin", value: "0.9", unit: "mg/dL", refRange: "0.2–1.2", flag: "normal", category: "Liver Function" },
      { name: "ALT (SGPT)", value: "48", unit: "U/L", refRange: "10–40", flag: "high", category: "Liver Function" },
      { name: "AST (SGOT)", value: "36", unit: "U/L", refRange: "10–40", flag: "borderline", category: "Liver Function" },
      { name: "Alkaline Phosphatase", value: "112", unit: "U/L", refRange: "80–240", flag: "normal", category: "Liver Function" },

      // ---- KFT (4) ----
      { name: "Urea", value: "28", unit: "mg/dL", refRange: "15–40", flag: "normal", category: "Kidney Function" },
      { name: "Creatinine", value: "0.9", unit: "mg/dL", refRange: "0.6–1.2", flag: "normal", category: "Kidney Function" },
      { name: "Uric Acid", value: "5.4", unit: "mg/dL", refRange: "3.5–7.2", flag: "normal", category: "Kidney Function" },
      { name: "eGFR", value: "98", unit: "mL/min", refRange: "> 90", flag: "normal", category: "Kidney Function" },

      // ---- Lipid Profile (5) ----
      { name: "Total Cholesterol", value: "212", unit: "mg/dL", refRange: "< 200", flag: "high", category: "Lipid Profile" },
      { name: "Triglycerides", value: "184", unit: "mg/dL", refRange: "< 150", flag: "high", category: "Lipid Profile" },
      { name: "HDL Cholesterol", value: "38", unit: "mg/dL", refRange: "> 40", flag: "low", category: "Lipid Profile" },
      { name: "LDL Cholesterol", value: "138", unit: "mg/dL", refRange: "< 100", flag: "high", category: "Lipid Profile" },
      { name: "VLDL", value: "36", unit: "mg/dL", refRange: "10–40", flag: "borderline", category: "Lipid Profile" },

      // ---- Thyroid (3) ----
      { name: "TSH", value: "2.8", unit: "uIU/mL", refRange: "0.4–4.0", flag: "normal", category: "Thyroid Profile" },
      { name: "Free T3", value: "3.2", unit: "pg/mL", refRange: "2.3–4.2", flag: "normal", category: "Thyroid Profile" },
      { name: "Free T4", value: "1.3", unit: "ng/dL", refRange: "0.8–1.8", flag: "normal", category: "Thyroid Profile" },

      // ---- HbA1c ----
      { name: "HbA1c (Glycated Hemoglobin)", value: "5.7", unit: "%", refRange: "< 5.7", flag: "borderline", category: "Diabetes Marker" },
      { name: "Fasting Blood Sugar", value: "104", unit: "mg/dL", refRange: "70–100", flag: "borderline", category: "Diabetes Marker" },

      // ---- Vitamins (2) ----
      { name: "Vitamin D (25-OH)", value: "18.5", unit: "ng/mL", refRange: "30–100", flag: "low", category: "Vitamins" },
      { name: "Vitamin B12", value: "312", unit: "pg/mL", refRange: "200–900", flag: "normal", category: "Vitamins" },
    ],
  };
}

// 5-test Diabetes Panel report (pre-diabetes detected)
function diabetesReport(): LabReport {
  return {
    panelCode: "DIABETES",
    panelName: "Diabetes Screening Panel (5 tests)",
    collectedAt: daysAgo(4).toISOString(),
    reportedAt: daysAgo(2).toISOString(),
    labName: "Nexura Diagnostics · Andheri East, Mumbai",
    tests: [
      { name: "Fasting Blood Sugar", value: "118", unit: "mg/dL", refRange: "70–100", flag: "high", category: "Glucose" },
      { name: "Post Prandial Sugar (2hr)", value: "172", unit: "mg/dL", refRange: "< 140", flag: "high", category: "Glucose" },
      { name: "HbA1c", value: "6.1", unit: "%", refRange: "< 5.7", flag: "high", category: "Glycemic Marker" },
      { name: "Estimated Average Glucose (eAG)", value: "128", unit: "mg/dL", refRange: "< 117", flag: "high", category: "Glycemic Marker" },
      { name: "Random Blood Sugar", value: "156", unit: "mg/dL", refRange: "< 140", flag: "high", category: "Glucose" },
    ],
  };
}

// ============================================================================
// AI INTERPRETATIONS — clinical-LLM quality (rule-based fallback content)
// ============================================================================

function fullBodyInterpretation(): string {
  return `## 🩺 Nexa AI — Clinical Interpretation

**Overall assessment:** Your results show a **moderately elevated cardiovascular risk profile**, primarily driven by lipid abnormalities and borderline glycemia. Liver enzymes show mild elevation that warrants monitoring.

### Key findings

**1. Dyslipidemia (Abnormal Lipids) — ⚠️ Needs attention**
- Total cholesterol **212 mg/dL** (high), LDL **138 mg/dL** (high), HDL **38 mg/dL** (low), Triglycerides **184 mg/dL** (high).
- This combination — high LDL + low HDL + high triglycerides — is classic **atherogenic dyslipidemia**, common in Indian adults and strongly linked to early coronary artery disease.
- Your LDL/HDL ratio is **3.6**, ideally should be **< 3.0**.

**2. Pre-diabetes signal — ⚠️ Borderline**
- HbA1c **5.7%** sits at the upper threshold of normal (pre-diabetes starts at 5.7%).
- Fasting sugar **104 mg/dL** is borderline (normal < 100, pre-diabetes 100–125).
- Recommend repeating HbA1c in 3 months.

**3. Mild liver enzyme elevation**
- ALT (SGPT) **48 U/L** is mildly elevated (upper limit 40). AST is borderline at 36.
- Most commonly due to **fatty liver (NAFLD)**, which affects ~30% of urban Indian adults and frequently coexists with dyslipidemia. Consider an ultrasound abdomen.

**4. Vitamin D deficiency**
- Vitamin D **18.5 ng/mL** is **deficient** (< 30). Very common in Indian skin tones due to melanin.

### ✅ Recommended next steps
1. **Consult a physician** within 2 weeks to discuss statin therapy (consider Atorvastatin 10–20 mg).
2. **Repeat LFT after 4 weeks** of lifestyle modification; if persistent, request **USG abdomen** for fatty liver.
3. **Vitamin D3 supplementation**: 60,000 IU weekly × 8 weeks, then monthly maintenance.
4. **Diet**: Mediterranean/Indian high-fiber, reduce refined carbs & saturated fats; aim 30 g fiber/day.
5. **Exercise**: 150 minutes/week moderate aerobic + 2× resistance training.

### 📊 What's reassuring
- Kidney function (eGFR 98), CBC, and thyroid panel are **entirely normal**.

---
> ⚠️ **Disclaimer:** This AI-generated summary is for informational purposes only and is **not a medical diagnosis**. Please consult a registered medical practitioner before acting on any recommendation. Nexura AI does not replace clinical judgment. In case of emergency, call 112.`;
}

function diabetesInterpretation(): string {
  return `## 🩺 Nexa AI — Clinical Interpretation

**Overall assessment:** Your results are consistent with **pre-diabetes (HbA1c 6.1%)**. Fasting and post-prandial glucose are both elevated. Early lifestyle intervention can prevent progression to Type 2 Diabetes in **58% of cases** (Diabetes Prevention Program, NIH).

### Key findings

**1. HbA1c 6.1% — Pre-diabetes confirmed**
- Normal: < 5.7% · Pre-diabetes: **5.7–6.4%** · Diabetes: ≥ 6.5%
- Your HbA1c of 6.1% reflects an average blood sugar of ~128 mg/dL over the last 3 months.

**2. Fasting glucose 118 mg/dL — Impaired Fasting Glucose (IFG)**
- Normal < 100 · Pre-diabetes 100–125 · Diabetes ≥ 126
- Indicates hepatic insulin resistance — your liver is overproducing glucose overnight.

**3. Post-prandial (2-hr) sugar 172 mg/dL — Impaired Glucose Tolerance (IGT)**
- Normal < 140 · Pre-diabetes 140–199 · Diabetes ≥ 200
- Indicates muscle insulin resistance — your muscles aren't absorbing glucose efficiently after meals.

### 🎯 Recommended action plan (90-day)
1. **Reconfirm with OGTT (Oral Glucose Tolerance Test)** if physician advises.
2. **Diet overhaul** (most important step):
   - Reduce rice/roti portion by 30%; replace with millets (ragi, jowar), quinoa.
   - Add 1 cup green leafy vegetables + 30 g protein at each meal.
   - Walk 10 minutes after every meal — drops post-meal sugar by 30–40 mg/dL.
3. **Weight loss** of 5–7% body weight can reverse pre-diabetes in 6 months.
4. **Re-test HbA1c in 3 months** to track progress.
5. **Screen for complications**: Annual eye exam (retinopathy), foot check, urine microalbumin.

### ⚠️ When to seek urgent care
- Fasting sugar consistently > 180 mg/dL
- Excessive thirst / urination / unexplained weight loss
- HbA1c ≥ 6.5% on retest → frank diabetes

---
> ⚠️ **Disclaimer:** This AI-generated summary is informational and **not a substitute for medical advice**. Please consult your physician before starting any treatment. Nexura AI does not diagnose diabetes. In an emergency, call 112.`;
}

// ============================================================================
// TEST PANEL CATALOG (8 panels)
// ============================================================================
const TEST_PANELS = [
  { code: "FULL_BODY", name: "Full Body Checkup", price: 2999, tests: "CBC, LFT, KFT, Lipid, Thyroid, HbA1c, Vitamins", icon: "🩺" },
  { code: "DIABETES", name: "Diabetes Panel", price: 499, tests: "FBS, PPBS, HbA1c, eAG, RBS", icon: "🩸" },
  { code: "THYROID", name: "Thyroid Profile", price: 399, tests: "TSH, Free T3, Free T4", icon: "🦋" },
  { code: "CBC", name: "Complete Blood Count", price: 199, tests: "Hemogram, RBC, WBC, Platelets", icon: "🧫" },
  { code: "LIPID", name: "Lipid Profile", price: 349, tests: "Total Chol, HDL, LDL, Triglycerides, VLDL", icon: "❤️" },
  { code: "LIVER", name: "Liver Function Test", price: 449, tests: "Bilirubin, ALT, AST, ALP, Protein", icon: "🫀" },
  { code: "KIDNEY", name: "Kidney Function Test", price: 449, tests: "Urea, Creatinine, Uric Acid, eGFR", icon: "🫘" },
  { code: "VITAMIN", name: "Vitamin Profile", price: 899, tests: "Vitamin D, B12, Folate, Iron Studies", icon: "💊" },
];

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  console.log("\n🌱 Seeding Nexura Portal (Round 22)…\n");

  // ---- 1. Find linked HospitalPatient ----
  const suresh = await db.hospitalPatient.findFirst({
    where: { fullName: { contains: "Suresh" } },
    include: { appointments: true, admissions: true, vitals: true, bills: true, insuranceClaims: true, orders: true },
  });

  if (!suresh) {
    console.warn("⚠️  HospitalPatient 'Suresh' not found — linking will be skipped. Run seed-hospital.ts first.");
  } else {
    console.log(`✓ Found HospitalPatient: ${suresh.fullName} (UHID: ${suresh.uhid}, blood: ${suresh.bloodGroup})`);
  }

  // ---- 2. Seed Phlebotomists (4) ----
  console.log("\n→ Seeding Phlebotomists…");
  const phlebData = [
    { name: "Rajesh Kumar", phone: "+91 98330 11101", city: "Mumbai", zones: "Andheri, JVLR, Goregaon", rating: 4.9, totalCollections: 412, vehicleNo: "MH-02-PT-9081" },
    { name: "Sunil Sharma", phone: "+91 98330 11102", city: "Mumbai", zones: "Bandra, Kurla, BKC", rating: 4.7, totalCollections: 318, vehicleNo: "MH-02-PT-9082" },
    { name: "Anjali Verma", phone: "+91 98330 11103", city: "Mumbai", zones: "Powai, Vikhroli, Kanjurmarg", rating: 4.8, totalCollections: 356, vehicleNo: "MH-02-PT-9083" },
    { name: "Deepak Patil", phone: "+91 98330 11104", city: "Mumbai", zones: "Dadar, Worli, Prabhadevi", rating: 4.6, totalCollections: 289, vehicleNo: "MH-02-PT-9084" },
  ];

  const phlebotomists: Record<string, { id: string; name: string; phone: string }> = {};
  for (const p of phlebData) {
    const existing = await db.phlebotomist.findFirst({ where: { phone: p.phone } });
    if (existing) {
      await db.phlebotomist.update({ where: { id: existing.id }, data: { name: p.name, city: p.city, zones: p.zones, rating: p.rating, totalCollections: p.totalCollections, vehicleNo: p.vehicleNo, isAvailable: true, currentBookingId: null } });
      phlebotomists[p.name] = { id: existing.id, name: existing.name, phone: existing.phone };
      console.log(`  ↻ updated ${p.name} (${p.rating}★)`);
    } else {
      const created = await db.phlebotomist.create({ data: p });
      phlebotomists[p.name] = { id: created.id, name: created.name, phone: created.phone };
      console.log(`  + created ${p.name} (${p.rating}★)`);
    }
  }

  // ---- 3. Seed PortalUser ----
  console.log("\n→ Seeding PortalUser…");
  const phone = "+919820099880";
  const abhaId = "91-2345-6789-0123";
  const existingUser = await db.portalUser.findFirst({ where: { phone } });

  let user;
  if (existingUser) {
    user = await db.portalUser.update({
      where: { id: existingUser.id },
      data: {
        fullName: "Suresh Nair",
        phone,
        abhaId,
        bloodGroup: "O+",
        dob: "1990-05-15",
        gender: "male",
        address: "A-204, Lokhandwala Complex, Andheri West",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400053",
        hospitalPatientUhid: suresh?.uhid ?? null,
        isOnboarded: true,
        lastLoginAt: new Date(),
      },
    });
    console.log(`  ↻ updated ${user.fullName} (${user.phone}) → UHID ${user.hospitalPatientUhid ?? "—"}`);
  } else {
    user = await db.portalUser.create({
      data: {
        fullName: "Suresh Nair",
        phone,
        abhaId,
        bloodGroup: "O+",
        dob: "1990-05-15",
        gender: "male",
        address: "A-204, Lokhandwala Complex, Andheri West",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400053",
        hospitalPatientUhid: suresh?.uhid ?? null,
        isOnboarded: true,
        lastLoginAt: new Date(),
      },
    });
    console.log(`  + created ${user.fullName} (${user.phone}) → UHID ${user.hospitalPatientUhid ?? "—"}`);
  }

  // ---- 4. Seed BloodBookings (4) ----
  console.log("\n→ Seeding BloodBookings…");

  // 4a. COMPLETED — Full Body Checkup, 28 days ago, report ready, AI done
  await upsertBooking(db, user.id, {
    bookingRef: genBookingRef(2025, 10001),
    testPanelName: "Full Body Checkup",
    testPanelCode: "FULL_BODY",
    testsIncluded: "CBC, LFT, KFT, Lipid, Thyroid, HbA1c, Vitamins",
    price: 2999,
    scheduledDate: daysAgo(28),
    timeSlot: "07:30–08:00",
    address: "A-204, Lokhandwala Complex, Andheri West",
    city: "Mumbai",
    pincode: "400053",
    phlebotomistId: phlebotomists["Rajesh Kumar"].id,
    phlebotomistName: "Rajesh Kumar",
    phlebotomistPhone: phlebotomists["Rajesh Kumar"].phone,
    status: "report_ready",
    sampleCollectedAt: daysAgo(28),
    reportReadyAt: daysAgo(26),
    reportJson: JSON.stringify(fullBodyReport()),
    aiInterpretation: fullBodyInterpretation(),
    paymentMode: "upi",
    paymentStatus: "paid",
  });

  // 4b. IN-PROGRESS — Diabetes Panel, 4 days ago, report ready, AI done
  await upsertBooking(db, user.id, {
    bookingRef: genBookingRef(2025, 10002),
    testPanelName: "Diabetes Panel",
    testPanelCode: "DIABETES",
    testsIncluded: "FBS, PPBS, HbA1c, eAG, RBS",
    price: 499,
    scheduledDate: daysAgo(4),
    timeSlot: "07:00–07:30",
    address: "A-204, Lokhandwala Complex, Andheri West",
    city: "Mumbai",
    pincode: "400053",
    phlebotomistId: phlebotomists["Sunil Sharma"].id,
    phlebotomistName: "Sunil Sharma",
    phlebotomistPhone: phlebotomists["Sunil Sharma"].phone,
    status: "report_ready",
    sampleCollectedAt: daysAgo(4),
    reportReadyAt: daysAgo(2),
    reportJson: JSON.stringify(diabetesReport()),
    aiInterpretation: diabetesInterpretation(),
    paymentMode: "upi",
    paymentStatus: "paid",
  });

  // 4c. UPCOMING — Thyroid Profile, tomorrow, assigned to Anjali Verma
  await upsertBooking(db, user.id, {
    bookingRef: genBookingRef(2025, 10003),
    testPanelName: "Thyroid Profile",
    testPanelCode: "THYROID",
    testsIncluded: "TSH, Free T3, Free T4",
    price: 399,
    scheduledDate: daysAhead(1),
    timeSlot: "07:30–08:00",
    address: "A-204, Lokhandwala Complex, Andheri West",
    city: "Mumbai",
    pincode: "400053",
    phlebotomistId: phlebotomists["Anjali Verma"].id,
    phlebotomistName: "Anjali Verma",
    phlebotomistPhone: phlebotomists["Anjali Verma"].phone,
    status: "assigned",
    paymentMode: "upi",
    paymentStatus: "pending",
  });

  // 4d. CANCELLED — CBC, 32 days ago
  await upsertBooking(db, user.id, {
    bookingRef: genBookingRef(2025, 10004),
    testPanelName: "Complete Blood Count",
    testPanelCode: "CBC",
    testsIncluded: "Hemogram, RBC, WBC, Platelets",
    price: 199,
    scheduledDate: daysAgo(32),
    timeSlot: "08:00–08:30",
    address: "A-204, Lokhandwala Complex, Andheri West",
    city: "Mumbai",
    pincode: "400053",
    phlebotomistId: phlebotomists["Deepak Patil"].id,
    phlebotomistName: "Deepak Patil",
    phlebotomistPhone: phlebotomists["Deepak Patil"].phone,
    status: "cancelled",
    cancellationReason: "Patient rescheduled to Full Body Checkup",
    paymentMode: "upi",
    paymentStatus: "refunded",
  });

  // ---- 5. Seed Family Members (2 extras so family tab has content) ----
  console.log("\n→ Seeding Family Members…");
  await upsertFamilyMember(db, user.id, {
    fullName: "Lakshmi Nair",
    phone: "+919820099881",
    relation: "spouse",
    dob: "1992-08-10",
    gender: "female",
    bloodGroup: "B+",
  });
  await upsertFamilyMember(db, user.id, {
    fullName: "Aarav Nair",
    phone: "+919820099882",
    relation: "son",
    dob: "2018-11-22",
    gender: "male",
    bloodGroup: "O+",
  });

  // ---- Summary ----
  console.log("\n────────────────────────────────────────");
  console.log("✅ Portal seed complete");
  console.log("────────────────────────────────────────");
  console.log(`  PortalUser      : ${user.fullName} (${user.phone})`);
  console.log(`  Hospital link   : UHID ${user.hospitalPatientUhid ?? "—"}`);
  console.log(`  Phlebotomists   : 4 across Mumbai`);
  console.log(`  BloodBookings   : 4 (1 completed, 1 in-progress, 1 upcoming, 1 cancelled)`);
  console.log(`  Family members  : 2 (Lakshmi, Aarav)`);
  console.log(`  Demo OTP        : 1234 (any phone)`);
  console.log(`  Test panels     : ${TEST_PANELS.length}`);
  console.log("");
}

// ============================================================================
// UPSERT HELPERS
// ============================================================================
async function upsertBooking(
  db: PrismaClient,
  userId: string,
  data: {
    bookingRef: string;
    testPanelName: string;
    testPanelCode: string;
    testsIncluded: string;
    price: number;
    scheduledDate: Date;
    timeSlot: string;
    address: string;
    city: string;
    pincode: string;
    phlebotomistId?: string;
    phlebotomistName?: string;
    phlebotomistPhone?: string;
    status: string;
    sampleCollectedAt?: Date;
    reportReadyAt?: Date;
    reportJson?: string;
    aiInterpretation?: string;
    paymentMode?: string;
    paymentStatus?: string;
    cancellationReason?: string;
  }
) {
  const existing = await db.bloodBooking.findFirst({ where: { bookingRef: data.bookingRef } });
  if (existing) {
    await db.bloodBooking.update({ where: { id: existing.id }, data: { ...data, userId } });
    console.log(`  ↻ ${data.bookingRef} — ${data.testPanelName} [${data.status}]`);
  } else {
    await db.bloodBooking.create({ data: { ...data, userId } });
    console.log(`  + ${data.bookingRef} — ${data.testPanelName} [${data.status}]`);
  }
}

async function upsertFamilyMember(
  db: PrismaClient,
  headId: string,
  data: {
    fullName: string;
    phone: string;
    relation: string;
    dob: string;
    gender: string;
    bloodGroup: string;
  }
) {
  const { relation, ...rest } = data;
  const payload = { ...rest, relationToHead: relation, familyHeadId: headId, isOnboarded: true };
  const existing = await db.portalUser.findFirst({ where: { phone: data.phone } });
  if (existing) {
    await db.portalUser.update({ where: { id: existing.id }, data: payload });
    console.log(`  ↻ family member ${data.fullName} (${relation})`);
  } else {
    await db.portalUser.create({ data: payload });
    console.log(`  + family member ${data.fullName} (${relation})`);
  }
}

// Avoid unused import warning in lint
void randomUUID;
void pick;

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
