import { db } from "@/lib/db";
import { calculateAge, calculateNEWS2, generateUhid } from "../../src/lib/hospital-context";

/* Nexura Hospital OS — comprehensive seed
   Creates realistic Indian hospital data across all 18 tables */

async function main() {
  console.log("🏥 Seeding Nexura Hospital OS...\n");

  // 1. Hospital
  const hospital = await db.hospital.create({
    data: {
      name: "Aarogya Multi-Specialty Hospital",
      nabhAccredited: true,
      gstin: "27ABCDE1234F1Z5",
      address: "Plot 14, MG Road, Bandra West",
      district: "Mumbai",
      state: "Maharashtra",
      pincode: "400050",
      contact: "+91 98200 12345",
      subscriptionTier: "premium",
    },
  });
  console.log(`✓ Hospital: ${hospital.name}`);

  // 2. Doctors (8)
  const doctors = await Promise.all([
    db.hospitalDoctor.create({ data: { hospitalId: hospital.id, name: "Dr. Rajesh Kumar Sharma", regNo: "MMC-12345", specialty: "General Physician", department: "General Medicine", consultationFee: 600, availableHours: '{"start":"09:00","end":"17:00"}', languagesSpoken: '["Hindi","English"]', photoUrl: null } }),
    db.hospitalDoctor.create({ data: { hospitalId: hospital.id, name: "Dr. Priya Nair", regNo: "MMC-23456", specialty: "Cardiologist", department: "Cardiology", consultationFee: 1200, availableHours: '{"start":"10:00","end":"18:00"}', languagesSpoken: '["Hindi","English","Malayalam"]' } }),
    db.hospitalDoctor.create({ data: { hospitalId: hospital.id, name: "Dr. Vikram Patel", regNo: "MMC-34567", specialty: "General Surgeon", department: "Surgery", consultationFee: 1500, availableHours: '{"start":"08:00","end":"16:00"}', languagesSpoken: '["Hindi","English","Gujarati"]' } }),
    db.hospitalDoctor.create({ data: { hospitalId: hospital.id, name: "Dr. Anjali Reddy", regNo: "MMC-45678", specialty: "Pediatrician", department: "Pediatrics", consultationFee: 700, availableHours: '{"start":"09:00","end":"17:00"}', languagesSpoken: '["Hindi","English","Telugu"]' } }),
    db.hospitalDoctor.create({ data: { hospitalId: hospital.id, name: "Dr. Suresh Iyer", regNo: "MMC-56789", specialty: "Orthopedic Surgeon", department: "Orthopedics", consultationFee: 1000, availableHours: '{"start":"10:00","end":"18:00"}', languagesSpoken: '["Hindi","English","Tamil"]' } }),
    db.hospitalDoctor.create({ data: { hospitalId: hospital.id, name: "Dr. Meera Joshi", regNo: "MMC-67890", specialty: "Gynecologist", department: "Gynecology", consultationFee: 800, availableHours: '{"start":"09:00","end":"17:00"}', languagesSpoken: '["Hindi","English","Marathi"]' } }),
    db.hospitalDoctor.create({ data: { hospitalId: hospital.id, name: "Dr. Arjun Singh", regNo: "MMC-78901", specialty: "Neurologist", department: "Neurology", consultationFee: 1500, availableHours: '{"start":"11:00","end":"19:00"}', languagesSpoken: '["Hindi","English","Punjabi"]' } }),
    db.hospitalDoctor.create({ data: { hospitalId: hospital.id, name: "Dr. Kavya Krishnan", regNo: "MMC-89012", specialty: "Anesthesiologist", department: "Anesthesia", consultationFee: 1000, availableHours: '{"start":"08:00","end":"20:00"}', languagesSpoken: '["Hindi","English","Kannada"]' } }),
  ]);
  console.log(`✓ Doctors: ${doctors.length}`);

  // 3. Staff (10)
  const staff = await Promise.all([
    db.hospitalStaff.create({ data: { hospitalId: hospital.id, name: "Nurse Lakshmi", role: "nurse", department: "ICU", shift: "morning", employeeId: "EMP-001", phone: "+91 98200 11111" } }),
    db.hospitalStaff.create({ data: { hospitalId: hospital.id, name: "Nurse Sunita", role: "nurse", department: "General", shift: "morning", employeeId: "EMP-002", phone: "+91 98200 22222" } }),
    db.hospitalStaff.create({ data: { hospitalId: hospital.id, name: "Nurse Fatima", role: "nurse", department: "Pediatric", shift: "evening", employeeId: "EMP-003", phone: "+91 98200 33333" } }),
    db.hospitalStaff.create({ data: { hospitalId: hospital.id, name: "Ramesh (Reception)", role: "receptionist", department: "Front Office", shift: "morning", employeeId: "EMP-004", phone: "+91 98200 44444" } }),
    db.hospitalStaff.create({ data: { hospitalId: hospital.id, name: "Tech Anil", role: "lab", department: "Laboratory", shift: "morning", employeeId: "EMP-005", phone: "+91 98200 55555" } }),
    db.hospitalStaff.create({ data: { hospitalId: hospital.id, name: "Pharmacist Deepak", role: "pharmacist", department: "Pharmacy", shift: "morning", employeeId: "EMP-006", phone: "+91 98200 66666" } }),
    db.hospitalStaff.create({ data: { hospitalId: hospital.id, name: "OT Tech Mohan", role: "ot_tech", department: "Operation Theatre", shift: "morning", employeeId: "EMP-007", phone: "+91 98200 77777" } }),
    db.hospitalStaff.create({ data: { hospitalId: hospital.id, name: "Nurse Geeta", role: "nurse", department: "ICU", shift: "night", employeeId: "EMP-008", phone: "+91 98200 88888" } }),
    db.hospitalStaff.create({ data: { hospitalId: hospital.id, name: "Admin Suresh", role: "admin", department: "Administration", shift: "morning", employeeId: "EMP-009", phone: "+91 98200 99999" } }),
    db.hospitalStaff.create({ data: { hospitalId: hospital.id, name: "Nurse Parvati", role: "nurse", department: "Maternity", shift: "evening", employeeId: "EMP-010", phone: "+91 98200 10101" } }),
  ]);
  console.log(`✓ Staff: ${staff.length}`);

  // 4. Wards (6)
  const wards = await Promise.all([
    db.hospitalWard.create({ data: { hospitalId: hospital.id, name: "General Ward A", wardType: "general", totalBeds: 12, floorNumber: 1 } }),
    db.hospitalWard.create({ data: { hospitalId: hospital.id, name: "ICU", wardType: "icu", totalBeds: 8, floorNumber: 2 } }),
    db.hospitalWard.create({ data: { hospitalId: hospital.id, name: "HDU", wardType: "hdu", totalBeds: 6, floorNumber: 2 } }),
    db.hospitalWard.create({ data: { hospitalId: hospital.id, name: "Pediatric Ward", wardType: "pediatric", totalBeds: 10, floorNumber: 3 } }),
    db.hospitalWard.create({ data: { hospitalId: hospital.id, name: "Maternity Ward", wardType: "maternity", totalBeds: 8, floorNumber: 3 } }),
    db.hospitalWard.create({ data: { hospitalId: hospital.id, name: "Cardiac Ward", wardType: "cardiac", totalBeds: 6, floorNumber: 4 } }),
  ]);
  console.log(`✓ Wards: ${wards.length}`);

  // 5. Beds (50 total across wards)
  const bedStatuses = ["available", "occupied", "available", "reserved", "cleaning"];
  const beds: any[] = [];
  for (const ward of wards) {
    for (let i = 1; i <= ward.totalBeds; i++) {
      const status = i <= Math.floor(ward.totalBeds * 0.65) ? "occupied" : bedStatuses[i % bedStatuses.length];
      beds.push({
        hospitalId: hospital.id,
        wardId: ward.id,
        bedNumber: `${ward.name.split(" ")[0].slice(0, 3).toUpperCase()}-${String(i).padStart(2, "0")}`,
        status,
        lastCleanedAt: status === "cleaning" ? new Date(Date.now() - 3600000) : new Date(Date.now() - 86400000),
      });
    }
  }
  await db.hospitalBed.createMany({ data: beds });
  console.log(`✓ Beds: ${beds.length}`);

  // 6. Patients (20)
  const patientData = [
    { name: "Suresh Nair", dob: "1990-05-15", gender: "male", bloodGroup: "B+", lang: "Hindi", phone: "+91 98201 10001", district: "Mumbai", insurance: "Star Health", policy: "SH-2024-001", pmjay: false },
    { name: "Lakshmi Iyer", dob: "1955-08-20", gender: "female", bloodGroup: "O+", lang: "Tamil", phone: "+91 98201 10002", district: "Mumbai", insurance: "Medi-Assist", policy: "MA-2024-002", pmjay: false, chronic: "Diabetes Type 2, Hypertension" },
    { name: "Ramesh Patel", dob: "1970-03-10", gender: "male", bloodGroup: "A+", lang: "Gujarati", phone: "+91 98201 10003", district: "Mumbai", insurance: "ICICI Lombard", policy: "IL-2024-003", pmjay: false, chronic: "CAD" },
    { name: "Priya Sharma", dob: "1995-11-25", gender: "female", bloodGroup: "AB+", lang: "Hindi", phone: "+91 98201 10004", district: "Pune", insurance: null, policy: null, pmjay: true },
    { name: "Aarav Kumar", dob: "2018-07-12", gender: "male", bloodGroup: "B+", lang: "Hindi", phone: "+91 98201 10005", district: "Mumbai", insurance: null, policy: null, pmjay: false },
    { name: "Sunita Devi", dob: "1962-01-30", gender: "female", bloodGroup: "O-", lang: "Hindi", phone: "+91 98201 10006", district: "Mumbai", insurance: "Star Health", policy: "SH-2024-006", pmjay: false, chronic: "Hypothyroidism" },
    { name: "Arjun Reddy", dob: "1988-09-18", gender: "male", bloodGroup: "A-", lang: "Telugu", phone: "+91 98201 10007", district: "Hyderabad", insurance: "Niva Bupa", policy: "NB-2024-007", pmjay: false },
    { name: "Meena Joshi", dob: "1975-04-22", gender: "female", bloodGroup: "B-", lang: "Marathi", phone: "+91 98201 10008", district: "Pune", insurance: "Bajaj Allianz", policy: "BA-2024-008", pmjay: false },
    { name: "Karthik S", dob: "1992-12-05", gender: "male", bloodGroup: "AB-", lang: "Kannada", phone: "+91 98201 10009", district: "Bengaluru", insurance: null, policy: null, pmjay: false },
    { name: "Fatima Begum", dob: "1980-06-15", gender: "female", bloodGroup: "O+", lang: "Hindi", phone: "+91 98201 10010", district: "Mumbai", insurance: "Medi-Assist", policy: "MA-2024-010", pmjay: false, chronic: "PCOS" },
    { name: "Vikram Singh", dob: "1968-02-28", gender: "male", bloodGroup: "B+", lang: "Punjabi", phone: "+91 98201 10011", district: "Delhi", insurance: "Heritage Health", policy: "HH-2024-011", pmjay: false, chronic: "COPD" },
    { name: "Anita Desai", dob: "1985-10-10", gender: "female", bloodGroup: "A+", lang: "Gujarati", phone: "+91 98201 10012", district: "Mumbai", insurance: "MD India", policy: "MD-2024-012", pmjay: false },
    { name: "Ganesh Rao", dob: "1958-07-07", gender: "male", bloodGroup: "O+", lang: "Kannada", phone: "+91 98201 10013", district: "Bengaluru", insurance: "United India Insurance", policy: "UI-2024-013", pmjay: false, chronic: "CKD Stage 3" },
    { name: "Pooja Gupta", dob: "1998-03-15", gender: "female", bloodGroup: "AB+", lang: "Hindi", phone: "+91 98201 10014", district: "Mumbai", insurance: null, policy: null, pmjay: false },
    { name: "Mohan Das", dob: "1972-11-20", gender: "male", bloodGroup: "B+", lang: "Odia", phone: "+91 98201 10015", district: "Bhubaneswar", insurance: "New India Assurance", policy: "NI-2024-015", pmjay: false, chronic: "Diabetes" },
    { name: "Kavya Nair", dob: "1990-08-25", gender: "female", bloodGroup: "A+", lang: "Malayalam", phone: "+91 98201 10016", district: "Kochi", insurance: "Oriental Insurance", policy: "OI-2024-016", pmjay: false },
    { name: "Raj Malhotra", dob: "1965-05-01", gender: "male", bloodGroup: "O+", lang: "Hindi", phone: "+91 98201 10017", district: "Delhi", insurance: "Star Health", policy: "SH-2024-017", pmjay: false, chronic: "Hypertension, Dyslipidemia" },
    { name: "Sita Ram", dob: "1983-09-09", gender: "male", bloodGroup: "B+", lang: "Hindi", phone: "+91 98201 10018", district: "Varanasi", insurance: null, policy: null, pmjay: true },
    { name: "Deepika K", dob: "1995-12-12", gender: "female", bloodGroup: "AB+", lang: "Tamil", phone: "+91 98201 10019", district: "Chennai", insurance: "ICICI Lombard", policy: "IL-2024-019", pmjay: false },
    { name: "Sanjay Verma", dob: "1978-04-04", gender: "male", bloodGroup: "A-", lang: "Hindi", phone: "+91 98201 10020", district: "Lucknow", insurance: "Niva Bupa", policy: "NB-2024-020", pmjay: false, chronic: "Asthma" },
  ];

  const patients = [];
  for (const p of patientData) {
    const uhid = generateUhid();
    const age = calculateAge(p.dob);
    const patient = await db.hospitalPatient.create({
      data: {
        hospitalId: hospital.id,
        uhid,
        fullName: p.name,
        dob: p.dob,
        age,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        address: `${p.district}, India`,
        district: p.district,
        state: "Maharashtra",
        emergencyContactName: `Family of ${p.name.split(" ")[0]}`,
        emergencyContactPhone: p.phone,
        primaryLanguage: p.lang,
        phone: p.phone,
        insuranceProvider: p.insurance,
        insurancePolicyNo: p.policy,
        pmjayBeneficiary: p.pmjay,
        chronicConditions: p.chronic || null,
        allergy: Math.random() > 0.8 ? "Penicillin" : null,
      },
    });
    patients.push(patient);
  }
  console.log(`✓ Patients: ${patients.length}`);

  // 7. Appointments (15 for today)
  const today = new Date();
  const apptTypes = ["opd", "followup", "teleconsult"];
  const complaints = ["Fever and body ache", "Chest pain", "Headache and dizziness", "Abdominal pain", "Diabetes follow-up", "Hypertension check", "Skin rash", "Joint pain", "Cough and cold", "Pregnancy check-up", "Eye irritation", "Back pain", "Child vaccination", "Breathlessness", "Wound dressing"];
  const apptStatuses = ["scheduled", "waiting", "in_consultation", "completed", "no_show"];
  const appts = [];
  for (let i = 0; i < 15; i++) {
    const patient = patients[i];
    const doctor = doctors[i % doctors.length];
    const time = `${9 + Math.floor(i / 2)}:${i % 2 === 0 ? "00" : "30"}`;
    const status = i < 4 ? "completed" : i < 7 ? "in_consultation" : i < 10 ? "waiting" : "scheduled";
    const appt = await db.hospitalAppointment.create({
      data: {
        hospitalId: hospital.id,
        patientUhid: patient.uhid,
        patientId: patient.id,
        doctorId: doctor.id,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9 + Math.floor(i / 2), i % 2 === 0 ? 0 : 30),
        timeSlot: time,
        tokenNumber: i + 1,
        appointmentType: apptTypes[i % 3],
        status,
        chiefComplaint: complaints[i],
      },
    });
    appts.push(appt);
  }
  console.log(`✓ Appointments: ${appts.length}`);

  // 8. Admissions (8 — occupy ICU/HDU/Cardiac beds)
  const admittedPatients = patients.slice(0, 8);
  const diagnoses = ["Acute MI", "Pneumonia", "Sepsis", "CVA", "DKA", "COPD Exacerbation", "Acute Pancreatitis", "CHF"];
  const occupiedBeds = await db.hospitalBed.findMany({ where: { status: "occupied" }, take: 8 });
  const admissions = [];
  for (let i = 0; i < 8; i++) {
    const patient = admittedPatients[i];
    const bed = occupiedBeds[i];
    if (!bed) continue;
    const admitDate = new Date(Date.now() - (i + 1) * 86400000);
    const adm = await db.hospitalAdmission.create({
      data: {
        hospitalId: hospital.id,
        patientUhid: patient.uhid,
        patientId: patient.id,
        admittingDoctorId: doctors[i % doctors.length].id,
        wardId: bed.wardId,
        bedId: bed.id,
        admissionDate: admitDate,
        admissionDiagnosis: diagnoses[i],
        admissionType: i < 4 ? "emergency" : "elective",
        expectedDischargeDate: new Date(Date.now() + 2 * 86400000),
        dischargeStatus: "active",
      },
    });
    // Update bed with patient UHID
    await db.hospitalBed.update({ where: { id: bed.id }, data: { currentPatientUhid: patient.uhid } });
    admissions.push(adm);
  }
  console.log(`✓ Admissions: ${admissions.length}`);

  // 9. Vitals (4 per admitted patient)
  let vitalsCount = 0;
  for (const adm of admissions) {
    for (let i = 0; i < 4; i++) {
      const v = {
        bpSystolic: 110 + Math.floor(Math.random() * 40),
        bpDiastolic: 70 + Math.floor(Math.random() * 20),
        pulseRate: 70 + Math.floor(Math.random() * 30),
        temperatureC: 36.5 + Math.random() * 2,
        respiratoryRate: 16 + Math.floor(Math.random() * 6),
        spo2: 94 + Math.floor(Math.random() * 6),
        bloodGlucose: 90 + Math.floor(Math.random() * 80),
        weightKg: 60 + Math.random() * 20,
      };
      const news2 = calculateNEWS2(v);
      await db.hospitalVital.create({
        data: {
          hospitalId: hospital.id,
          patientUhid: adm.patientUhid,
          patientId: adm.patientId,
          admissionId: adm.id,
          recordedByStaffId: staff[0].id,
          recordedAt: new Date(Date.now() - i * 3600000),
          ...v,
          news2Score: news2,
        },
      });
      vitalsCount++;
    }
  }
  console.log(`✓ Vitals: ${vitalsCount}`);

  // 10. Clinical Notes (SOAP for each appointment)
  let notesCount = 0;
  for (const appt of appts.slice(0, 5)) {
    await db.clinicalNote.create({
      data: {
        hospitalId: hospital.id,
        patientUhid: appt.patientUhid,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        appointmentId: appt.id,
        noteType: "soap",
        subjective: `Patient presents with ${appt.chiefComplaint}. Duration: 3 days. Associated symptoms: mild fever, fatigue.`,
        objective: `BP 130/85, Pulse 88, Temp 99.2°F, SpO2 98%. General condition fair.`,
        assessment: `Likely viral fever. Differential: influenza, dengue.`,
        plan: `Paracetamol 650mg TID x 5 days. Rest and hydration. CBC, Dengue NS1 if fever persists.`,
        fullText: "SOAP note auto-structured by Nexa AI",
        aiStructured: true,
      },
    });
    notesCount++;
  }
  console.log(`✓ Clinical Notes: ${notesCount}`);

  // 11. Orders (lab)
  const labTests = ["CBC", "LFT", "KFT", "Blood Glucose Fasting", "Lipid Profile", "HbA1c", "TSH", "Urine Routine", "Dengue NS1", "Widal"];
  let ordersCount = 0;
  for (let i = 0; i < 10; i++) {
    const appt = appts[i];
    const order = await db.hospitalOrder.create({
      data: {
        hospitalId: hospital.id,
        patientUhid: appt.patientUhid,
        patientId: appt.patientId,
        orderingDoctorId: appt.doctorId,
        appointmentId: appt.id,
        orderType: "lab",
        orderDetails: JSON.stringify({ testName: labTests[i], urgency: "routine" }),
        priority: i < 2 ? "stat" : "routine",
        status: i < 4 ? "completed" : i < 7 ? "in_progress" : "ordered",
      },
    });
    // Add lab result for completed orders
    if (i < 4) {
      const refMin = Math.random() > 0.5 ? 4 : 70;
      const refMax = refMin === 4 ? 11 : refMin === 70 ? 110 : 200;
      const resultVal = refMin + Math.random() * (refMax - refMin) * 1.3;
      await db.labResult.create({
        data: {
          orderId: order.id,
          testName: labTests[i],
          resultValue: resultVal.toFixed(1),
          unit: "mg/dL",
          refRangeMin: refMin,
          refRangeMax: refMax,
          abnormalFlag: resultVal > refMax ? "high" : resultVal < refMin ? "low" : "normal",
          reportedByStaffId: staff[4].id,
          reportedAt: new Date(),
        },
      });
    }
    ordersCount++;
  }
  console.log(`✓ Orders: ${ordersCount}`);

  // 12. Medicines (20)
  const meds = [
    { name: "Crocin 650", generic: "Paracetamol", salt: "Paracetamol 650mg", company: "GSK", schedule: "otc", nppa: true, ceiling: 2.5, stock: 500 },
    { name: "Dolo 650", generic: "Paracetamol", salt: "Paracetamol 650mg", company: "Micro Labs", schedule: "otc", nppa: true, ceiling: 2.5, stock: 800 },
    { name: "Glycomet 500", generic: "Metformin", salt: "Metformin 500mg", company: "USV", schedule: "schedule_h", nppa: true, ceiling: 3.5, stock: 300 },
    { name: "Amlong 5", generic: "Amlodipine", salt: "Amlodipine 5mg", company: "Micro Labs", schedule: "schedule_h", nppa: true, ceiling: 3.0, stock: 250 },
    { name: "Telma 40", generic: "Telmisartan", salt: "Telmisartan 40mg", company: "Glenmark", schedule: "schedule_h", nppa: false, stock: 180 },
    { name: "Ecosprin 75", generic: "Aspirin", salt: "Aspirin 75mg", company: "USV", schedule: "schedule_h", nppa: true, ceiling: 0.8, stock: 400 },
    { name: "Atorva 10", generic: "Atorvastatin", salt: "Atorvastatin 10mg", company: "Zydus", schedule: "schedule_h", nppa: false, stock: 5 },
    { name: "Azithral 500", generic: "Azithromycin", salt: "Azithromycin 500mg", company: "Alembic", schedule: "schedule_h", nppa: false, stock: 120 },
    { name: "Augmentin 625", generic: "Amoxicillin+Clavulanate", salt: "Amoxicillin 500mg + Clavulanic Acid 125mg", company: "GSK", schedule: "schedule_h", nppa: false, stock: 90 },
    { name: "Pan 40", generic: "Pantoprazole", salt: "Pantoprazole 40mg", company: "Alkem", schedule: "schedule_h", nppa: true, ceiling: 2.8, stock: 350 },
    { name: "Cetzine 10", generic: "Cetirizine", salt: "Cetirizine 10mg", company: "Dr. Reddy's", schedule: "schedule_h", nppa: true, ceiling: 1.5, stock: 200 },
    { name: "Brufen 400", generic: "Ibuprofen", salt: "Ibuprofen 400mg", company: "Abbott", schedule: "schedule_h", nppa: false, stock: 0 },
    { name: "Shelcal 500", generic: "Calcium+Vitamin D3", salt: "Calcium Carbonate 1250mg + Vitamin D3 250IU", company: "Torque", schedule: "otc", nppa: false, stock: 150 },
    { name: "Becosules", generic: "B-Complex", salt: "Vitamin B Complex", company: "Pfizer", schedule: "otc", nppa: false, stock: 220 },
    { name: "Rosuvas 10", generic: "Rosuvastatin", salt: "Rosuvastatin 10mg", company: "Sun Pharma", schedule: "schedule_h", nppa: false, stock: 75 },
    { name: "Glimisave 1", generic: "Glimepiride", salt: "Glimepiride 1mg", company: "Sun Pharma", schedule: "schedule_h", nppa: false, stock: 110 },
    { name: "Neurobion Forte", generic: "Mecobalamin+Vitamins", salt: "Mecobalamin 1500mcg + B1+B6+B12", company: "Merck", schedule: "otc", nppa: false, stock: 60 },
    { name: "Rantac 150", generic: "Ranitidine", salt: "Ranitidine 150mg", company: "JBCPL", schedule: "schedule_h", nppa: false, stock: 0, banned: true },
    { name: "Deriphylline", generic: "Etofylline+Theophylline", salt: "Etofylline 77mg + Theophylline 23mg", company: "Zydus", schedule: "schedule_h", nppa: false, stock: 40 },
    { name: "Ondem 4", generic: "Ondansetron", salt: "Ondansetron 4mg", company: "Alkem", schedule: "schedule_h", nppa: false, stock: 95 },
  ];
  for (const m of meds) {
    await db.hospitalMedicine.create({
      data: {
        medicineName: m.name,
        genericName: m.generic,
        saltComposition: m.salt,
        company: m.company,
        schedule: m.schedule,
        nppaControlled: m.nppa,
        nppaCeilingPrice: m.ceiling || null,
        cdscoBanned: m.banned || false,
        stockQuantity: m.stock,
        gstRate: 12,
        packType: "Strip of 10",
      },
    });
  }
  console.log(`✓ Medicines: ${meds.length}`);

  // 13. Blood Bank (32 entries — 4 components × 8 groups)
  const components = ["whole_blood", "packed_rbc", "platelets", "ffp"];
  let bloodCount = 0;
  for (const group of ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]) {
    for (const comp of components) {
      await db.bloodBankUnit.create({
        data: {
          hospitalId: hospital.id,
          bloodGroup: group,
          component: comp,
          unitsAvailable: Math.floor(Math.random() * 10),
          expiryDate: new Date(Date.now() + Math.random() * 30 * 86400000),
        },
      });
      bloodCount++;
    }
  }
  console.log(`✓ Blood Bank: ${bloodCount}`);

  // 14. OT Surgeries (3)
  const otSurgeries = [
    { room: "OT-1", procedure: "Laparoscopic Appendectomy", surgeon: 2, patient: 2, status: "completed", start: new Date(Date.now() - 4 * 3600000), end: new Date(Date.now() - 3 * 3600000) },
    { room: "OT-2", procedure: "CABG", surgeon: 1, patient: 6, status: "in_progress", start: new Date(Date.now() - 3600000) },
    { room: "OT-1", procedure: "Total Knee Replacement", surgeon: 4, patient: 10, status: "planned", start: new Date(Date.now() + 2 * 3600000) },
  ];
  for (const s of otSurgeries) {
    await db.oTSurgery.create({
      data: {
        hospitalId: hospital.id,
        otRoomNumber: s.room,
        patientUhid: patients[s.patient].uhid,
        patientId: patients[s.patient].id,
        procedureName: s.procedure,
        surgeonId: doctors[s.surgeon].id,
        anesthetistId: doctors[7].id,
        scrubNurseId: staff[0].id,
        plannedStartTime: s.start,
        estimatedDurationMin: 120,
        actualStartTime: s.status !== "planned" ? s.start : null,
        actualEndTime: s.status === "completed" ? s.end : null,
        status: s.status,
        preOpChecklist: JSON.stringify({ consent: true, fasted: true, site_marked: true, allergies_verified: true, blood_arranged: true, equipment_checked: true }),
      },
    });
  }
  console.log(`✓ OT Surgeries: 3`);

  // 15. Insurance Claims (for insured admitted patients)
  let claimsCount = 0;
  for (const adm of admissions.slice(0, 5)) {
    const patient = patients.find((p) => p.id === adm.patientId);
    if (!patient?.insuranceProvider) continue;
    await db.insuranceClaim.create({
      data: {
        hospitalId: hospital.id,
        patientUhid: patient.uhid,
        patientId: patient.id,
        admissionId: adm.id,
        tpaCompany: patient.insuranceProvider,
        policyNumber: patient.insurancePolicyNo,
        icd10Primary: "I21.9",
        estimatedCost: 50000 + Math.random() * 100000,
        preAuthStatus: claimsCount < 2 ? "approved" : claimsCount < 3 ? "submitted" : "draft",
        approvedAmount: claimsCount < 2 ? 40000 + Math.random() * 50000 : 0,
        patientCopay: 5000,
        cashless: true,
        submittedAt: claimsCount < 3 ? new Date(Date.now() - 86400000) : null,
        approvedAt: claimsCount < 2 ? new Date() : null,
      },
    });
    claimsCount++;
  }
  console.log(`✓ Insurance Claims: ${claimsCount}`);

  // 16. Bills (10)
  let billsCount = 0;
  for (const appt of appts.slice(0, 6)) {
    const items = [
      { service: "Consultation", category: "OPD", quantity: 1, rate: 600, amount: 600 },
      { service: "Registration", category: "Admin", quantity: 1, rate: 50, amount: 50 },
    ];
    const subtotal = 650;
    const cgst = subtotal * 0.09;
    const sgst = subtotal * 0.09;
    await db.hospitalBill.create({
      data: {
        hospitalId: hospital.id,
        patientUhid: appt.patientUhid,
        patientId: appt.patientId,
        appointmentId: appt.id,
        itemizedCharges: JSON.stringify(items),
        subtotal,
        cgst,
        sgst,
        totalPayable: subtotal + cgst + sgst,
        paymentMode: ["cash", "upi", "card"][billsCount % 3],
        paymentStatus: billsCount < 4 ? "paid" : "unpaid",
      },
    });
    billsCount++;
  }
  for (const adm of admissions.slice(0, 4)) {
    const items = [
      { service: "Bed Charge (ICU)", category: "IPD", quantity: 2, rate: 3000, amount: 6000 },
      { service: "Nursing Charges", category: "IPD", quantity: 2, rate: 1500, amount: 3000 },
      { service: "Medicines", category: "Pharmacy", quantity: 1, rate: 2500, amount: 2500 },
    ];
    const subtotal = 11500;
    const cgst = subtotal * 0.09;
    const sgst = subtotal * 0.09;
    await db.hospitalBill.create({
      data: {
        hospitalId: hospital.id,
        patientUhid: adm.patientUhid,
        patientId: adm.patientId,
        admissionId: adm.id,
        itemizedCharges: JSON.stringify(items),
        subtotal,
        cgst,
        sgst,
        totalPayable: subtotal + cgst + sgst,
        paymentMode: "insurance",
        paymentStatus: billsCount % 2 === 0 ? "partial" : "unpaid",
      },
    });
    billsCount++;
  }
  console.log(`✓ Bills: ${billsCount}`);

  console.log(`\n✅ Nexura Hospital OS seed complete!`);
  console.log(`   Hospital: ${hospital.name}`);
  console.log(`   ${doctors.length} doctors, ${staff.length} staff, ${patients.length} patients`);
  console.log(`   ${wards.length} wards, ${beds.length} beds, ${admissions.length} admissions`);
  console.log(`   ${appts.length} appointments, ${vitalsCount} vitals, ${notesCount} clinical notes`);
  console.log(`   ${ordersCount} orders, ${meds.length} medicines, ${bloodCount} blood units`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
