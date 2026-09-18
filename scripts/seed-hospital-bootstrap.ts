/* ============================================================
 * PIE bootstrap — restore the demo hospital + patient roster
 * (run: bun scripts/seed-hospital-bootstrap.ts)
 *
 * The sandbox DB was reset (volume restore); seed-pie.ts and
 * seed-nx.ts both expect an existing hospital with ≥5 patients.
 * This script recreates that baseline idempotently:
 *   • 1 hospital  — "Nexura Multispecialty Hospital, Bengaluru"
 *   • 12 patients — Indian demo roster with UHIDs, chronic flags
 * Safe to re-run: upserts by uhid, creates hospital only if none.
 * ============================================================ */
import { PrismaClient } from "@prisma/client";

/* Demo-seed guard: demo seeds write synthetic patients/staff with known
   passwords and demo API keys — they must never run against a production
   database by accident. Override requires an explicit, intentional flag. */
if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO_OVERRIDE !== "true") {
  console.error(
    "[seed] Refusing to seed demo data: NODE_ENV=production. If this is genuinely intentional, re-run with SEED_DEMO_OVERRIDE=true.",
  );
  process.exit(1);
}

const db = new PrismaClient();

const PATIENTS = [
  {
    uhid: "NX-DEMO-0001",
    fullName: "Suresh Kumar",
    age: 54,
    gender: "male",
    bloodGroup: "B+",
    chronicConditions: "Type-2 Diabetes; Hypertension",
    district: "Bengaluru Urban",
    state: "Karnataka",
  },
  {
    uhid: "NX-DEMO-0002",
    fullName: "Lakshmi Iyer",
    age: 47,
    gender: "female",
    bloodGroup: "O+",
    chronicConditions: "Hypothyroidism",
    district: "Bengaluru Urban",
    state: "Karnataka",
  },
  {
    uhid: "NX-DEMO-0003",
    fullName: "Rahul Sharma",
    age: 61,
    gender: "male",
    bloodGroup: "A+",
    chronicConditions: "Coronary artery disease",
    district: "Mumbai Suburban",
    state: "Maharashtra",
  },
  {
    uhid: "NX-DEMO-0004",
    fullName: "Priya Nair",
    age: 38,
    gender: "female",
    bloodGroup: "AB+",
    chronicConditions: "",
    district: "Ernakulam",
    state: "Kerala",
  },
  {
    uhid: "NX-DEMO-0005",
    fullName: "Arjun Patel",
    age: 66,
    gender: "male",
    bloodGroup: "B-",
    chronicConditions: "COPD; Hypertension",
    district: "Ahmedabad",
    state: "Gujarat",
  },
  {
    uhid: "NX-DEMO-0006",
    fullName: "Meena Reddy",
    age: 52,
    gender: "female",
    bloodGroup: "O-",
    chronicConditions: "Type-2 Diabetes",
    district: "Hyderabad",
    state: "Telangana",
  },
  {
    uhid: "NX-DEMO-0007",
    fullName: "Vikram Singh",
    age: 45,
    gender: "male",
    bloodGroup: "A-",
    chronicConditions: "",
    district: "Lucknow",
    state: "Uttar Pradesh",
  },
  {
    uhid: "NX-DEMO-0008",
    fullName: "Ananya Bose",
    age: 33,
    gender: "female",
    bloodGroup: "B+",
    chronicConditions: "",
    district: "Kolkata",
    state: "West Bengal",
  },
  {
    uhid: "NX-DEMO-0009",
    fullName: "Karthik Menon",
    age: 58,
    gender: "male",
    bloodGroup: "O+",
    chronicConditions: "Chronic kidney disease stage 2",
    district: "Chennai",
    state: "Tamil Nadu",
  },
  {
    uhid: "NX-DEMO-0010",
    fullName: "Divya Joshi",
    age: 41,
    gender: "female",
    bloodGroup: "A+",
    chronicConditions: "Asthma",
    district: "Pune",
    state: "Maharashtra",
  },
  {
    uhid: "NX-DEMO-0011",
    fullName: "Mohit Gupta",
    age: 70,
    gender: "male",
    bloodGroup: "AB-",
    chronicConditions: "Atrial fibrillation; Hypertension",
    district: "Jaipur",
    state: "Rajasthan",
  },
  {
    uhid: "NX-DEMO-0012",
    fullName: "Sanya Kapoor",
    age: 29,
    gender: "female",
    bloodGroup: "B+",
    chronicConditions: "",
    district: "New Delhi",
    state: "Delhi",
  },
];

async function main() {
  let hospital = await db.hospital.findFirst();
  if (!hospital) {
    hospital = await db.hospital.create({
      data: {
        name: "Nexura Multispecialty Hospital",
        state: "Karnataka",
        district: "Bengaluru Urban",
        address: "12 Wellness Avenue, Bengaluru 560001",
        contact: "+91 80 4000 1234",
        subscriptionTier: "premium",
        nabhAccredited: true,
      },
    });
    console.log("created hospital:", hospital.name);
  } else {
    console.log("hospital exists:", hospital.name);
  }

  for (const p of PATIENTS) {
    await db.hospitalPatient.upsert({
      where: { uhid: p.uhid },
      create: {
        hospitalId: hospital.id,
        ...p,
        primaryLanguage: "English",
        pmjayBeneficiary: false,
      },
      update: {
        hospitalId: hospital.id,
        fullName: p.fullName,
        age: p.age,
        chronicConditions: p.chronicConditions,
      },
    });
  }
  const count = await db.hospitalPatient.count({ where: { hospitalId: hospital.id } });
  console.log(`patients on roster: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
