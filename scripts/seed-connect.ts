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
  // Wipe
  await db.connectQueue.deleteMany();
  await db.connectCall.deleteMany();
  await db.connectMessage.deleteMany();
  await db.connectConnection.deleteMany();

  const hospital = await db.hospital.findFirst();
  if (!hospital) { console.log("No hospital found"); return; }

  const doctors = await db.hospitalDoctor.findMany({ where: { hospitalId: hospital.id }, take: 4 });
  const patients = await db.hospitalPatient.findMany({ where: { hospitalId: hospital.id }, take: 6 });

  const kyhDoctors = [
    { id: "kyh-doctor-general-01", name: "Dr. Aanya Kapoor", specialty: "General Physician", phone: "+91 98300 10001" },
  ];

  let connCount = 0, msgCount = 0, callCount = 0, queueCount = 0;

  // Create connections
  for (let i = 0; i < Math.min(doctors.length, patients.length); i++) {
    const doc = doctors[i];
    const pat = patients[i];
    const conn = await db.connectConnection.create({
      data: {
        doctorId: doc.id, doctorName: doc.name, doctorSpecialty: doc.specialty,
        patientId: pat.id, patientName: pat.fullName, patientPhone: pat.phone,
        patientAge: pat.age, patientGender: pat.gender,
        source: "hospital", lastConsultDate: new Date(Date.now() - i * 86400000),
        whatsappSent: true, whatsappSentAt: new Date(),
      },
    });

    // Messages
    const msgs = [
      { fromRole: "patient", text: "Namaste doctor, I have been having fever for 2 days" },
      { fromRole: "doctor", text: "Hello! What is your temperature? Any other symptoms?" },
      { fromRole: "patient", text: "102°F, body ache and headache" },
      { fromRole: "doctor", text: "Take Paracetamol 650mg TID. Rest and drink fluids. If fever persists beyond 3 days, get CBC done." },
      { fromRole: "patient", text: "Thank you doctor 🙏" },
    ];
    for (const m of msgs) {
      await db.connectMessage.create({
        data: { connectionId: conn.id, fromRole: m.fromRole, fromName: m.fromRole === "doctor" ? doc.name : pat.fullName, text: m.text, read: m.fromRole === "doctor" },
      });
      msgCount++;
    }

    // Call
    if (i < 2) {
      await db.connectCall.create({
        data: { connectionId: conn.id, type: i === 0 ? "video" : "voice", status: "ended", initiatedBy: "patient", durationSec: 300 + i * 120, callSummary: "Consultation completed", startedAt: new Date(Date.now() - (i + 1) * 3600000), answeredAt: new Date(Date.now() - (i + 1) * 3600000 + 10000), endedAt: new Date(Date.now() - (i + 1) * 3600000 + 300000) },
      });
      callCount++;
    }

    // Queue
    if (i < 2) {
      await db.connectQueue.create({
        data: { connectionId: conn.id, requestedMode: i === 0 ? "chat" : "video", reason: "Follow-up question about medication", status: "waiting" },
      });
      queueCount++;
    }
    connCount++;
  }

  // KYH connection
  const kyhDoc = kyhDoctors[0];
  const kyhConn = await db.connectConnection.create({
    data: {
      doctorId: kyhDoc.id, doctorName: kyhDoc.name, doctorSpecialty: kyhDoc.specialty,
      patientId: "kyh-patient-session-demo", patientName: "KYH Patient", patientPhone: "+91 90000 00000",
      source: "know_your_health", lastConsultDate: new Date(),
      whatsappSent: true, whatsappSentAt: new Date(),
    },
  });
  await db.connectMessage.create({
    data: { connectionId: kyhConn.id, fromRole: "patient", text: "Hi, I used the symptom checker and was connected here" },
  });
  await db.connectMessage.create({
    data: { connectionId: kyhConn.id, fromRole: "doctor", fromName: kyhDoc.name, text: "Welcome! I've reviewed your symptoms. How can I help you today?" },
  });
  connCount++; msgCount += 2;

  console.log(`✅ Nexura Connect seed complete`);
  console.log(`   ${connCount} connections, ${msgCount} messages, ${callCount} calls, ${queueCount} queue entries`);
}

main().catch(console.error).finally(async () => { await db.$disconnect(); });
