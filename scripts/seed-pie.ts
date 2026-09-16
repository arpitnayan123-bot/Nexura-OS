/* ============================================================
 * PIE — Demo data seeder (run: bun scripts/seed-pie.ts)
 * Generates 30-day trajectories so the Crisis Radar and Forecast
 * are alive immediately:
 *   • 1 patient deteriorating into sepsis red zone
 *   • 1 post-discharge readmission-risk (yellow)
 *   • 1 chronic T2DM+HTN worsening (yellow/red)
 *   • 2 stable patients (green)
 * Also seeds wearable devices, adherence, SDoH and the graph.
 * Idempotent: clears Pie* rows for the demo hospital first.
 * ============================================================ */
import { PrismaClient } from "@prisma/client";

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
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const daysAgo = (d: number, hourJitter = true) => new Date(Date.now() - d * 86_400_000 - (hourJitter ? rand(0, 20 * 3_600_000) : 0));

async function main() {
  const hospital = await db.hospital.findFirst();
  if (!hospital) throw new Error("no hospital — run the main seed first");

  const patients = await db.hospitalPatient.findMany({
    where: { hospitalId: hospital.id },
    take: 12,
    orderBy: { createdAt: "asc" },
  });
  if (patients.length < 5) throw new Error(`need ≥5 patients, found ${patients.length}`);

  // wipe old PIE demo data (including prior trajectories' vitals)
  const demoPatientIds = patients.map((p) => p.id);
  await db.hospitalVital.deleteMany({ where: { patientId: { in: demoPatientIds } } });
  await Promise.all([
    db.pieBioSignal.deleteMany({}),
    db.pieLifeStreamEvent.deleteMany({}),
    db.pieTwinState.deleteMany({}),
    db.pieRiskAssessment.deleteMany({}),
    db.pieProtocol.deleteMany({}),
    db.pieGraphNode.deleteMany({}),
    db.pieGraphEdge.deleteMany({}),
    db.pieAdherenceEvent.deleteMany({}),
    db.pieFederatedUpdate.deleteMany({}),
  ]);

  // pick distinct personas
  const septic = patients[0];
  const readmit = patients[1];
  const chronic = patients[2];
  const stable1 = patients[3];
  const stable2 = patients[4 % patients.length];

  interface Traj {
    p: typeof patients[number];
    hr: (d: number) => number;
    temp: (d: number) => number;
    sbp: (d: number) => number;
    dbp: (d: number) => number;
    spo2: (d: number) => number;
    rr: (d: number) => number;
    wbcSlope: number;
    conditions: string[];
    adherence: number[]; // per-day score source events
  }

  const trajs: Traj[] = [
    { // SEPSIS — deteriorating over the LAST 4 days (d counts days ago)
      p: septic,
      hr: (d) => (d < 4 ? 84 + (4 - d) * 5.2 + rand(-3, 3) : rand(72, 84)),
      temp: (d) => (d < 4 ? 36.8 + (4 - d) * 0.35 + rand(-0.15, 0.15) : rand(36.4, 36.9)),
      sbp: (d) => (d < 4 ? 124 - (4 - d) * 3.4 + rand(-3, 3) : rand(118, 128)),
      dbp: (d) => (d < 4 ? 78 - (4 - d) * 2.1 + rand(-2, 2) : rand(72, 80)),
      spo2: (d) => (d < 4 ? 97 - (4 - d) * 0.75 + rand(-0.5, 0.5) : rand(96, 98)),
      rr: (d) => (d < 4 ? 15 + (4 - d) * 0.9 + rand(-1, 1) : rand(13, 16)),
      wbcSlope: 1.3,
      conditions: ["E11", "I10"],
      adherence: [1, 1, 0.8, 0.6, 0.4, 0.3],
    },
    { // READMISSION — discharged 3 days ago, degrading
      p: readmit,
      hr: (d) => 78 + Math.max(0, 3 - d) * 3.5 + rand(-3, 3),
      temp: () => rand(36.3, 37.0),
      sbp: (d) => 132 - Math.max(0, 3 - d) * 2 + rand(-4, 4),
      dbp: () => rand(78, 86),
      spo2: (d) => 97 - Math.max(0, 3 - d) * 0.6 + rand(-0.4, 0.4),
      rr: () => rand(14, 18),
      wbcSlope: 0.25,
      conditions: ["I50", "N18", "E11"],
      adherence: [0.9, 0.5, 0.35, 0.3, 0.25, 0.3],
    },
    { // CHRONIC — T2DM + HTN slow worsening
      p: chronic,
      hr: () => rand(74, 84),
      temp: () => rand(36.4, 36.8),
      sbp: (d) => 148 + (30 - d) * 0.12 + rand(-4, 4),
      dbp: () => rand(84, 92),
      spo2: () => rand(95, 98),
      rr: () => rand(13, 17),
      wbcSlope: 0.02,
      conditions: ["E11", "I10", "N18"],
      adherence: [0.7, 0.75, 0.6, 0.65, 0.55, 0.6],
    },
    { // STABLE
      p: stable1,
      hr: () => rand(66, 76),
      temp: () => rand(36.4, 36.8),
      sbp: () => rand(116, 126),
      dbp: () => rand(70, 78),
      spo2: () => rand(97, 99),
      rr: () => rand(12, 16),
      wbcSlope: 0.0,
      conditions: ["E11"],
      adherence: [1, 0.9, 1, 1, 0.9, 1],
    },
    { // STABLE
      p: stable2,
      hr: () => rand(64, 74),
      temp: () => rand(36.3, 36.7),
      sbp: () => rand(112, 122),
      dbp: () => rand(68, 76),
      spo2: () => rand(97, 99),
      rr: () => rand(12, 15),
      wbcSlope: 0.0,
      conditions: [],
      adherence: [1, 1, 1, 0.9, 1, 1],
    },
  ];

  for (const t of trajs) {
    // 30 days of vitals 2×/day
    for (let d = 30; d >= 0; d--) {
      for (const half of [0, 1]) {
        await db.hospitalVital.create({
          data: {
            hospitalId: hospital.id,
            patientUhid: t.p.uhid,
            patientId: t.p.id,
            recordedAt: new Date(daysAgo(d).getTime() + half * 12 * 3_600_000),
            pulseRate: Math.round(t.hr(d)),
            bpSystolic: Math.round(t.sbp(d)),
            bpDiastolic: Math.round(t.dbp(d)),
            temperatureC: Number(t.temp(d).toFixed(1)),
            respiratoryRate: Math.round(t.rr(d)),
            spo2: Math.round(t.spo2(d)),
            bloodGlucose: Math.round(rand(90, 180)),
          },
        });
      }
    }
    // wearable bio-signals: HRV + sleep stages (last 14 nights)
    const device = await db.nxWearableDevice.create({
      data: { hospitalId: hospital.id, patientId: t.p.id, source: "fitbit", model: "Charge 6 (demo)" },
    });
    const bio: { deviceId: string; patientId: string; metric: string; value: number; unit: string; capturedAt: Date }[] = [];
    for (let d = 14; d >= 0; d--) {
      bio.push({ deviceId: device.id, patientId: t.p.id, metric: "hrv", value: t.p.id === septic.id && d < 3 ? rand(12, 22) : rand(28, 65), unit: "ms", capturedAt: daysAgo(d) });
      for (let e = 0; e < 84; e++) {
        const stage = e < 20 ? 1 : e < 62 ? 2 : e < 76 ? 3 : 0;
        bio.push({ deviceId: device.id, patientId: t.p.id, metric: "sleep_stage", value: stage, unit: "stage", capturedAt: new Date(daysAgo(d).getTime() + e * 5 * 60_000) });
      }
    }
    await db.pieBioSignal.createMany({ data: bio });

    // adherence events
    const adher: { patientId: string; kind: string; ts: Date }[] = [];
    t.adherence.forEach((score, i) => {
      const n = 6;
      for (let k = 0; k < n; k++) {
        adher.push({ patientId: t.p.id, kind: k / n < score ? (k % 2 ? "med_logged" : "app_login") : "med_missed", ts: daysAgo(i * 2 + 1) });
      }
    });
    await db.pieAdherenceEvent.createMany({ data: adher });

    // chronic conditions onto the patient record (for the twin)
    if (t.conditions.length) {
      await db.hospitalPatient.update({ where: { id: t.p.id }, data: { chronicConditions: JSON.stringify(t.conditions) } });
    }

    // labs — raise twin data completeness (confidence gate needs labs)
    const labSets: Record<string, Array<{ testName: string; resultValue: string; unit: string; flag?: string }>> = {
      septic: [
        { testName: "Total Leucocyte Count (WBC)", resultValue: "14.2", unit: "×10⁹/L", flag: "high" },
        { testName: "Serum Creatinine", resultValue: "1.35", unit: "mg/dL", flag: "high" },
        { testName: "Blood Glucose Fasting", resultValue: "168", unit: "mg/dL", flag: "high" },
        { testName: "Serum Potassium", resultValue: "4.4", unit: "mEq/L" },
      ],
      readmit: [
        { testName: "Serum Creatinine", resultValue: "1.62", unit: "mg/dL", flag: "high" },
        { testName: "NT-proBNP", resultValue: "540", unit: "pg/mL", flag: "high" },
        { testName: "HbA1c", resultValue: "7.6", unit: "%" },
      ],
      chronic: [
        { testName: "HbA1c", resultValue: "8.9", unit: "%", flag: "high" },
        { testName: "Serum Creatinine", resultValue: "1.44", unit: "mg/dL", flag: "high" },
        { testName: "Serum Potassium", resultValue: "4.8", unit: "mEq/L" },
      ],
      stable1: [
        { testName: "HbA1c", resultValue: "6.4", unit: "%" },
        { testName: "Serum Creatinine", resultValue: "0.95", unit: "mg/dL" },
      ],
      stable2: [
        { testName: "HbA1c", resultValue: "5.6", unit: "%" },
        { testName: "Serum Creatinine", resultValue: "0.88", unit: "mg/dL" },
      ],
    };
    const keyFor = (p: typeof septic) => (p.id === septic.id ? "septic" : p.id === readmit.id ? "readmit" : p.id === chronic.id ? "chronic" : p.id === stable1.id ? "stable1" : "stable2");
    const labList = labSets[keyFor(t.p)];
    if (labList) {
      const order = await db.hospitalOrder.create({
        data: {
          hospitalId: hospital.id,
          patientUhid: t.p.uhid,
          patientId: t.p.id,
          orderType: "lab",
          orderDetails: JSON.stringify({ panel: "PIE metabolic panel (demo)" }),
          status: "completed",
        },
      });
      await db.labResult.createMany({
        data: labList.map((l) => ({
          orderId: order.id,
          testName: l.testName,
          resultValue: l.resultValue,
          unit: l.unit,
          abnormalFlag: l.flag ?? "normal",
          reportedAt: daysAgo(1),
          collectedAt: daysAgo(1),
          verificationStatus: "verified",
        })),
      });
    }

    // clinical notes — feed the NLP extraction + infection context
    if (t.p.id === septic.id) {
      await db.clinicalNote.create({
        data: {
          hospitalId: hospital.id,
          patientUhid: t.p.uhid,
          patientId: t.p.id,
          noteType: "progress",
          status: "signed",
          signedAt: daysAgo(1),
          signedByName: "Dr. Rajesh Sharma",
          signedByRole: "doctor",
          subjective: "Reports worsening fever and shortness of breath since yesterday. Reduced urine output noted.",
          assessment: "Suspected urinary tract infection, concern for emerging sepsis. Confusion episodes reported by family.",
          plan: "Start empiricals, blood cultures, close monitoring.",
          fullText: "Worsening fever, dyspnea, oliguria. Suspected sepsis from UTI. Confusion noted.",
        },
      });
    }
    if (t.p.id === readmit.id) {
      await db.clinicalNote.create({
        data: {
          hospitalId: hospital.id,
          patientUhid: t.p.uhid,
          patientId: t.p.id,
          noteType: "discharge",
          status: "signed",
          signedAt: daysAgo(3),
          signedByName: "Dr. Meera Joshi",
          signedByRole: "doctor",
          subjective: "Patient discharged after heart failure stabilization. Counselled on daily weights and salt restriction.",
          assessment: "Stable CHF (I50) with CKD stage 3 (N18) and T2DM (E11).",
          plan: "Follow-up in 7 days. Patient has been non-adherent with medications previously; family to support.",
          fullText: "CHF discharge. Non-adherent risk factors discussed.",
        },
      });
    }
    console.log(`seeded trajectory for ${t.p.fullName} (${t.p.uhid})`);
  }

  console.log("PIE demo seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
