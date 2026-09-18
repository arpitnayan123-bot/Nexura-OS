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

async function main() {
  await db.clinicRx.deleteMany();
  await db.clinicInvoice.deleteMany();
  await db.clinicVisit.deleteMany();
  await db.clinicAppointment.deleteMany();
  await db.clinicPatient.deleteMany();
  await db.clinicDoctor.deleteMany();
  await db.clinic.deleteMany();

  const clinic = await db.clinic.create({
    data: {
      name: "Dr. Rao Family Clinic",
      ownerName: "Dr. Anita Rao",
      phone: "+91 98200 77881",
      email: "care@raoclinic.in",
      address: "Shop 12, Sai Plaza, Bandra West",
      city: "Mumbai",
      regNo: "MMC-44512",
      bookingSlug: "rao-clinic",
    },
  });

  const doctors = [
    {
      name: "Dr. Anita Rao",
      spec: "General Physician",
      qual: "MD Medicine",
      fee: 500,
      shift: ["09:00", "13:00"],
    },
    {
      name: "Dr. Vikram Shah",
      spec: "Cardiologist",
      qual: "MD, DM Cardiology",
      fee: 800,
      shift: ["16:00", "20:00"],
    },
    {
      name: "Dr. Meera Iyer",
      spec: "Pediatrician",
      qual: "MD Peds",
      fee: 600,
      shift: ["10:00", "14:00"],
    },
  ];
  const docList = [];
  for (const d of doctors) {
    docList.push(
      await db.clinicDoctor.create({
        data: {
          clinicId: clinic.id,
          name: d.name,
          specialization: d.spec,
          qualification: d.qual,
          feeConsult: d.fee * 100,
          shiftStart: d.shift[0],
          shiftEnd: d.shift[1],
          phone: "+91 98" + Math.floor(10000000 + Math.random() * 89999999),
        }, // feeConsult in paise
      }),
    );
  }

  const pSeed = [
    {
      name: "Sunita Sharma",
      g: "female",
      age: 52,
      blood: "O+",
      phone: "+91 98200 22110",
      chronic: "Hypothyroidism",
    },
    {
      name: "Rahul Verma",
      g: "male",
      age: 38,
      blood: "A+",
      phone: "+91 98200 33220",
      chronic: null,
    },
    {
      name: "Lakshmi Iyer",
      g: "female",
      age: 71,
      blood: "AB+",
      phone: "+91 98200 44330",
      chronic: "Hypertension",
      allergy: "Sulfa",
    },
    {
      name: "Arjun Kumar",
      g: "male",
      age: 28,
      blood: "B+",
      phone: "+91 98200 55440",
      chronic: null,
    },
    {
      name: "Priya Nair",
      g: "female",
      age: 34,
      blood: "O-",
      phone: "+91 98200 66550",
      chronic: null,
    },
    {
      name: "Karthik Rao",
      g: "male",
      age: 45,
      blood: "A+",
      phone: "+91 98200 77660",
      chronic: "Diabetes Type 2",
    },
    {
      name: "Geeta Pillai",
      g: "female",
      age: 60,
      blood: "B+",
      phone: "+91 98200 88770",
      chronic: "Osteoarthritis",
    },
    {
      name: "Suresh Nair",
      g: "male",
      age: 33,
      blood: "AB-",
      phone: "+91 98200 99880",
      chronic: null,
    },
  ];
  const patients = [];
  for (let i = 0; i < pSeed.length; i++) {
    const p = pSeed[i];
    patients.push(
      await db.clinicPatient.create({
        data: {
          clinicId: clinic.id,
          mrn: `CLN-${String(2001 + i)}`,
          name: p.name,
          gender: p.g,
          age: p.age,
          bloodGroup: p.blood,
          phone: p.phone,
          chronicDx: p.chronic,
          allergy: p.allergy || null,
        },
      }),
    );
  }

  // Today's appointments (tokens) — deterministic + collision-free.
  // A patient never books the same doctor twice within 2 hours, and never
  // holds two slots within 45 minutes, so the queue reads like a real day.
  const today = new Date();
  today.setHours(9, 0, 0, 0);
  const reasons = [
    "Fever & body ache",
    "BP review",
    "Routine checkup",
    "Skin rash",
    "Diabetes follow-up",
    "Cold & cough",
    "Back pain",
    "Antenatal",
  ];
  let token = 1;
  let pick = 3; // deterministic PRNG state (xorshift-ish)
  const nextPick = (n: number) => {
    pick = (pick * 1103515245 + 12345) % 2147483648;
    return pick % n;
  };
  const lastForPatient = new Map<string, number>();
  const lastPatientForDoctor = new Map<string, number>();
  const MIN = 60000;
  for (let h = 0; h < 12; h++) {
    if (nextPick(10) >= 4) {
      // ~60% of slots used
      const doc = docList[nextPick(docList.length)];
      // prefer a patient who isn't already booked with this doctor today
      let pat = patients[nextPick(patients.length)];
      for (let tries = 0; tries < patients.length; tries++) {
        const lastDocPatient = lastPatientForDoctor.get(`${doc.id}:${pat.id}`);
        const lastAny = lastForPatient.get(pat.id);
        const slotMs = today.getTime() + h * 30 * MIN;
        const okDocGap = lastDocPatient === undefined || slotMs - lastDocPatient >= 120 * MIN;
        const okAnyGap = lastAny === undefined || slotMs - lastAny >= 45 * MIN;
        if (okDocGap && okAnyGap) break;
        pat = patients[(patients.indexOf(pat) + 1) % patients.length];
      }
      const patIdx = patients.indexOf(pat);
      const slotMs = today.getTime() + (h * 30 + nextPick(25)) * MIN;
      const slot = new Date(slotMs);
      const status =
        slot < new Date()
          ? nextPick(10) >= 4
            ? "done"
            : "no_show"
          : nextPick(10) >= 5
            ? "arrived"
            : "booked";
      await db.clinicAppointment.create({
        data: {
          clinicId: clinic.id,
          patientId: pat.id,
          doctorId: doc.id,
          slot,
          tokenNo: token++,
          reason: reasons[(h + patIdx) % reasons.length],
          status,
        },
      });
      lastForPatient.set(pat.id, slotMs);
      lastPatientForDoctor.set(`${doc.id}:${pat.id}`, slotMs);
    }
  }

  // A few visits with Rx + invoices
  for (let i = 0; i < 3; i++) {
    const pat = patients[i];
    const doc = docList[0];
    const appt = await db.clinicAppointment.findFirst({
      where: { patientId: pat.id },
      orderBy: { slot: "desc" },
    });
    const visit = await db.clinicVisit.create({
      data: {
        clinicId: clinic.id,
        patientId: pat.id,
        doctorId: doc.id,
        appointmentId: appt?.id || null,
        chiefComplaint: reasons[i],
        vitalsBP: ["130/80", "140/90", "120/76"][i],
        vitalsPulse: [78, 88, 70][i],
        vitalsTemp: [36.8, 37.4, 36.6][i],
        vitalsSpo2: [98, 96, 99][i],
        diagnosis: ["Viral fever", "Hypertension — controlled", "Routine"][i],
        advice: "Rest, hydrate. Review in 3 days.",
        followUp: "After 3 days",
        status: "closed",
        createdAt: new Date(Date.now() - i * 3600000),
      },
    });
    const meds = [
      ["Paracetamol 650mg", "1-0-1", "5 days"],
      ["Amlodipine 5mg", "1-0-0", "30 days"],
      ["Multivitamin", "1-0-0", "15 days"][0]
        ? ["Multivitamin", "1-0-0", "15 days"]
        : ["Paracetamol 650mg", "1-0-1", "5 days"],
    ];
    for (const m of meds.slice(0, 2)) {
      await db.clinicRx.create({
        data: { visitId: visit.id, medicine: m[0], dosage: m[1], duration: m[2] },
      });
    }
    await db.clinicInvoice.create({
      data: {
        clinicId: clinic.id,
        patientId: pat.id,
        visitId: visit.id,
        invoiceNo: `CLN-INV-${3001 + i}`,
        description: "Consultation + Rx",
        amount: doc.feeConsult,
        total: doc.feeConsult,
        status: "paid",
        payMode: "upi",
      },
    });
  }

  console.log(`✅ Clinic seed complete — ${patients.length} patients, ${docList.length} doctors`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
