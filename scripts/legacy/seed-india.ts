import { db } from "@/lib/db";

/* Demo-seed guard: demo seeds write synthetic patients/staff with known
   passwords and demo API keys — they must never run against a production
   database by accident. Override requires an explicit, intentional flag. */
if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO_OVERRIDE !== "true") {
  console.error(
    "[seed] Refusing to seed demo data: NODE_ENV=production. If this is genuinely intentional, re-run with SEED_DEMO_OVERRIDE=true."
  );
  process.exit(1);
}

async function main() {
  await db.h2QRVerification.deleteMany();
  await db.aBDMHealthRecord.deleteMany();
  await db.telemedicineConsult.deleteMany();

  const branch = await db.pharmaBranch.findFirst();
  if (branch) {
    const meds = await db.product.findMany({ take: 5 });
    const cats = ["vaccine", "antimicrobial", "anticancer", "ndps", "antimicrobial"];
    for (let i = 0; i < 5; i++) {
      await db.h2QRVerification.create({
        data: {
          branchId: branch.id,
          productId: meds[i]?.id,
          medicineName: meds[i]?.name || "Test Med",
          batchNo: `BATCH-${i}`,
          qrCode: `8901234567890/BATCH-${i}/2027-03/SERIAL-${1000+i}`,
          verified: i !== 4,
          category: cats[i],
        },
      });
    }
  }

  const hospital = await db.hospital.findFirst();
  if (hospital) {
    const patients = await db.patient.findMany({ take: 3 });
    for (let i = 0; i < 3; i++) {
      await db.aBDMHealthRecord.create({
        data: {
          patientId: patients[i].id,
          patientType: "hospital",
          abhaId: `91-1234-5678-${9012+i}`,
          recordType: ["prescription", "lab", "diagnosis"][i],
          recordData: JSON.stringify({ diagnosis: ["Hypertension", "Diabetes Type 2", "Coronary Artery Disease"][i], synced: true }),
          consentId: `consent-${i}`,
        },
      });
    }
  }

  const clinic = await db.clinic.findFirst();
  if (clinic) {
    for (let i = 0; i < 3; i++) {
      await db.telemedicineConsult.create({
        data: {
          clinicId: clinic.id,
          doctorName: ["Dr. Anita Rao", "Dr. Vikram Shah", "Dr. Meera Iyer"][i],
          doctorRegNo: ["MMC-44512", "MMC-44890", "MMC-45123"][i],
          consultMode: ["video", "audio", "video"][i],
          chiefComplaint: ["Fever and cold", "BP follow-up", "Skin rash"][i],
          diagnosis: ["Viral fever", "Hypertension controlled", "Contact dermatitis"][i],
          prescription: JSON.stringify([{ medicine: "Paracetamol 650mg", dosage: "1-0-1", duration: "5 days" }]),
          followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          patientConsent: true,
          status: i === 0 ? "completed" : "scheduled",
          endedAt: i === 0 ? new Date() : null,
        },
      });
    }
  }

  console.log("✅ India compliance seed complete — H2 QR verifications, ABDM records, telemedicine consults");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
