import { db } from "@/lib/db";

/* Demo-seed guard: demo seeds write synthetic patients/staff with known
   passwords and demo API keys — they must never run against a production
   database by accident. Override requires an explicit, intentional flag. */
if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO_OVERRIDE !== "true") {
  console.error(
    "[seed] Refusing to seed demo data: NODE_ENV=production. If this is genuinely intentional, re-run with SEED_DEMO_OVERRIDE=true.",
  );
  process.exit(1);
}

/* Seed OT rooms, surgeries, TPA claims, nurse roster, discharge summaries */
async function main() {
  // wipe
  await db.dischargeSummary.deleteMany();
  await db.nurseRoster.deleteMany();
  await db.tPAClaim.deleteMany();
  await db.oTSurgery.deleteMany();
  await db.oTRoom.deleteMany();

  const hospital = await db.hospital.findFirst({ orderBy: { createdAt: "asc" } });
  if (!hospital) throw new Error("no hospital — run seed-hospital first");
  const hId = hospital.id;

  const patients = await db.patient.findMany({ where: { hospitalId: hId }, take: 12 });
  const doctors = await db.hStaff.findMany({ where: { hospitalId: hId, role: "doctor" } });
  const nurses = await db.hStaff.findMany({ where: { hospitalId: hId, role: "nurse" } });
  const wards = await db.ward.findMany({ where: { hospitalId: hId } });

  // ---- OT Rooms ----
  const otRooms = [];
  for (const [name, type] of [
    ["OT-1", "general"],
    ["OT-2", "general"],
    ["Cardiac OT", "cardiac"],
    ["Ortho OT", "ortho"],
  ] as const) {
    otRooms.push(await db.oTRoom.create({ data: { hospitalId: hId, name, type, floor: "3" } }));
  }

  // ---- OT Surgeries (today's schedule) ----
  const today = new Date();
  today.setHours(8, 0, 0, 0);
  const surgeries = [
    {
      room: 0,
      patient: 0,
      surgeon: 0,
      procedure: "Laparoscopic Cholecystectomy",
      dx: "Gallstones",
      startH: 1,
      dur: 90,
      status: "completed",
    },
    {
      room: 0,
      patient: 3,
      surgeon: 1,
      procedure: "Appendectomy",
      dx: "Acute Appendicitis",
      startH: 3,
      dur: 60,
      status: "in_progress",
    },
    {
      room: 0,
      patient: 6,
      surgeon: 0,
      procedure: "Hernia Repair",
      dx: "Inguinal Hernia",
      startH: 5,
      dur: 75,
      status: "scheduled",
    },
    {
      room: 1,
      patient: 1,
      surgeon: 2,
      procedure: "Cataract Surgery",
      dx: "Mature Cataract",
      startH: 0.5,
      dur: 30,
      status: "completed",
    },
    {
      room: 1,
      patient: 8,
      surgeon: 2,
      procedure: "Tonsillectomy",
      dx: "Chronic Tonsillitis",
      startH: 2,
      dur: 45,
      status: "scheduled",
    },
    {
      room: 2,
      patient: 0,
      surgeon: 0,
      procedure: "CABG",
      dx: "Triple Vessel Disease",
      startH: 2,
      dur: 240,
      status: "in_progress",
    },
    {
      room: 3,
      patient: 4,
      surgeon: 2,
      procedure: "TKR",
      dx: "Osteoarthritis Knee",
      startH: 1,
      dur: 120,
      status: "scheduled",
    },
  ];
  for (const s of surgeries) {
    const pat = patients[s.patient];
    const surg = doctors[s.surgeon];
    if (!pat || !surg) continue;
    await db.oTSurgery.create({
      data: {
        otRoomId: otRooms[s.room].id,
        patientId: pat.id,
        surgeonId: surg.id,
        anesthetistId: doctors[(s.surgeon + 1) % doctors.length]?.id || null,
        scrubNurseId: nurses[0]?.id || null,
        procedureName: s.procedure,
        diagnosis: s.dx,
        scheduledStart: new Date(today.getTime() + s.startH * 3600000),
        durationMins: s.dur,
        status: s.status,
      },
    });
  }

  // ---- TPA Claims ----
  const tpaCompanies = ["Star Health", "Medi-Assist", "Vidal Health", "MD India", "Heritage"];
  const icdCodes: Record<string, string> = {
    "Acute MI": "I21.0",
    "Atrial Fibrillation": "I48",
    "Community-acquired Pneumonia": "J18.9",
    Gallstones: "K80.2",
    "Diabetes Type 2": "E11.9",
  };
  const insPatients = patients.filter((p) => p.insuranceProvider);
  for (let i = 0; i < 5; i++) {
    const p = insPatients[i % insPatients.length] || patients[i];
    if (!p) continue;
    const dx = Object.keys(icdCodes)[i % 5];
    const est = [150000, 85000, 45000, 220000, 60000][i % 5];
    const status = ["submitted", "approved", "query_raised", "partially_approved", "rejected"][
      i % 5
    ];
    const approvedAmt =
      status === "approved" ? est : status === "partially_approved" ? Math.round(est * 0.7) : 0;
    const coPay =
      status === "approved" || status === "partially_approved" ? est - approvedAmt : est;
    await db.tPAClaim.create({
      data: {
        hospitalId: hId,
        patientId: p.id,
        tpaCompany: p.insuranceProvider || tpaCompanies[i % tpaCompanies.length],
        tpaId: p.insuranceId || `TPA-${10000 + i}`,
        policyNo: `POL-${20000 + i}`,
        diagnosis: dx,
        icd10Code: icdCodes[dx],
        plannedProcedure: [
          "Angioplasty",
          "Gallbladder Surgery",
          "Medical Management",
          "Knee Replacement",
          "Appendectomy",
        ][i % 5],
        estimatedCost: est,
        approvedAmount: approvedAmt,
        patientCoPay: coPay,
        tpaPayable: approvedAmt,
        status,
        queryNotes:
          status === "query_raised"
            ? "Please provide past medical history and latest lab reports"
            : null,
        approvalDate: status === "approved" || status === "partially_approved" ? new Date() : null,
      },
    });
  }

  // ---- Nurse Duty Roster (today) ----
  const shifts = ["morning", "evening", "night"];
  const todayStr = new Date().toISOString().slice(0, 10);
  for (const nurse of nurses.length ? nurses : [{ id: "n1" } as any]) {
    for (let w = 0; w < Math.min(wards.length, 4); w++) {
      const shift = shifts[(w + nurses.indexOf(nurse)) % 3];
      await db.nurseRoster.create({
        data: {
          hospitalId: hId,
          nurseId: nurse.id,
          shift,
          wardId: wards[w]?.id || null,
          date: todayStr,
          onDuty: shift === "morning",
          checkInTime: shift === "morning" ? new Date(today.getTime() + 8 * 3600000) : null,
        },
      });
    }
  }

  // ---- Discharge Summary (sample) ----
  const admissions = await db.admission.findMany({ where: { status: "admitted" }, take: 3 });
  for (let i = 0; i < Math.min(admissions.length, 2); i++) {
    const adm = admissions[i];
    const pat = patients.find((p) => p.id === adm.patientId);
    const doc = doctors[0];
    if (!pat || !doc) continue;
    await db.dischargeSummary.create({
      data: {
        hospitalId: hId,
        patientId: pat.id,
        admissionId: adm.id,
        uhid: pat.mrn,
        admissionDate: adm.admittedAt,
        dischargeDate: new Date(),
        admissionDx: adm.reason,
        finalDx: adm.reason,
        icd10Code: "I21.0",
        proceduresDone: "PCI via radial approach",
        conditionAtDischarge: "improved",
        dischargeMeds: JSON.stringify([
          { medicine: "Aspirin 75mg", dosage: "1-0-1", duration: "30 days" },
          { medicine: "Atorvastatin 10mg", dosage: "0-0-1", duration: "30 days" },
          { medicine: "Metoprolol 25mg", dosage: "1-0-1", duration: "15 days" },
        ]),
        followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        dietRestrictions: "Low salt, low fat diet. Avoid strenuous activity for 2 weeks.",
        activityAdvice: "Walk 30 min daily. No heavy lifting for 4 weeks.",
        doctorName: doc.name,
        doctorRegNo: doc.regNo,
      },
    });
  }

  console.log(
    `✅ HMS seed complete — ${otRooms.length} OT rooms, ${surgeries.length} surgeries, 5 TPA claims, nurse roster, discharge summaries`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
