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
  const hospital = await db.hospital.findFirst();
  if (!hospital) { console.log("No hospital found"); return; }

  // Tourism Settings
  await db.tourismSetting.upsert({
    where: { hospitalId: hospital.id },
    create: {
      hospitalId: hospital.id,
      tourismReady: true,
      internationalPhone: "+91 98200 12345",
      internationalEmail: "international@aarogyahospital.in",
      languages: '["English","Hindi","Arabic","Russian"]',
      rating: 4.7,
    },
    update: {},
  });
  console.log("✓ Tourism settings");

  // Featured Procedures
  const procedures = [
    { name: "Coronary Artery Bypass Graft (CABG)", category: "cardiac", priceUSD: 4500, avgStayDays: 10 },
    { name: "Heart Valve Replacement", category: "cardiac", priceUSD: 5500, avgStayDays: 12 },
    { name: "Total Hip Replacement", category: "ortho", priceUSD: 5800, avgStayDays: 8 },
    { name: "Total Knee Replacement", category: "ortho", priceUSD: 5200, avgStayDays: 7 },
    { name: "IVF Treatment (1 cycle)", category: "fertility", priceUSD: 2200, avgStayDays: 3 },
    { name: "Dental Implants (per tooth)", category: "dental", priceUSD: 800, avgStayDays: 2 },
    { name: "Liposuction", category: "cosmetic", priceUSD: 2500, avgStayDays: 3 },
    { name: "Brain Tumor Surgery", category: "neuro", priceUSD: 7500, avgStayDays: 14 },
    { name: "Kidney Transplant", category: "transplant", priceUSD: 14000, avgStayDays: 21 },
    { name: "Liver Transplant", category: "transplant", priceUSD: 35000, avgStayDays: 28 },
    { name: "Gastric Bypass Surgery", category: "bariatric", priceUSD: 4500, avgStayDays: 7 },
    { name: "Breast Cancer Surgery", category: "oncology", priceUSD: 3800, avgStayDays: 8 },
  ];
  for (const p of procedures) {
    await db.tourismProcedure.create({ data: { hospitalId: hospital.id, ...p, active: true } });
  }
  console.log(`✓ ${procedures.length} procedures`);

  // Coordinators
  const staff = await db.hospitalStaff.findMany({ where: { hospitalId: hospital.id }, take: 3 });
  for (let i = 0; i < Math.min(2, staff.length); i++) {
    await db.tourismCoordinator.create({
      data: { hospitalId: hospital.id, staffId: staff[i].id, name: staff[i].name, phone: staff[i].phone, email: `${staff[i].name.split(" ")[0].toLowerCase()}@aarogyahospital.in`, languages: '["English","Hindi"]', active: true },
    });
  }
  console.log("✓ Coordinators");

  // Sample Inquiries
  const inquiries = [
    { name: "Ahmed Al-Rashid", email: "ahmed@email.com", phone: "+971-50-1234567", country: "United Arab Emirates", code: "AE", procedure: "Coronary Artery Bypass Graft (CABG)", condition: "Chest pain for 3 months, angiography shows triple vessel disease. Ejection fraction 45%.", status: "estimate_sent", costUSD: 4500 },
    { name: "Sarah Mitchell", email: "sarah@email.com", phone: "+44-7700-900123", country: "United Kingdom", code: "GB", procedure: "Total Hip Replacement", condition: "Severe osteoarthritis of right hip, difficulty walking. BMI 28.", status: "appointment_booked", costUSD: 5800, apptDate: new Date(Date.now() + 7 * 86400000) },
    { name: "Ibrahim Hassan", email: "ibrahim@email.com", phone: "+966-50-123456", country: "Saudi Arabia", code: "SA", procedure: "IVF Treatment (1 cycle)", condition: "Married 5 years, secondary infertility. Wife age 32. Previous 2 failed cycles.", status: "visa_processing", costUSD: 2200 },
    { name: "Fatima Bint Ali", email: "fatima@email.com", phone: "+974-5555-1234", country: "Qatar", code: "QA", procedure: "Total Knee Replacement", condition: "Bilateral knee osteoarthritis, left worse. Difficulty climbing stairs.", status: "arrived", costUSD: 5200, arrivalDate: new Date() },
    { name: "John Mwangi", email: "john@email.com", phone: "+254-712-345678", country: "Kenya", code: "KE", procedure: "Brain Tumor Surgery", condition: "Left frontal lobe meningioma, 3cm. Headaches and seizures.", status: "treatment_ongoing", costUSD: 7500, arrivalDate: new Date(Date.now() - 5 * 86400000) },
    { name: "Maria Santos", email: "maria@email.com", phone: "+55-11-987654321", country: "Brazil", code: "BR", procedure: "Gastric Bypass Surgery", condition: "BMI 42, type 2 diabetes, hypertension. Failed conservative management.", status: "new" },
    { name: "Mohammed Yusuf", email: "mohammed@email.com", phone: "+880-1711-234567", country: "Bangladesh", code: "BD", procedure: "Kidney Transplant", condition: "End stage renal disease, on dialysis for 2 years. Donor: brother.", status: "new" },
    { name: "Aisha Abdullah", email: "aisha@email.com", phone: "+968-9123-4567", country: "Oman", code: "OM", procedure: "IVF Treatment (1 cycle)", condition: "PCOS, married 3 years, primary infertility.", status: "discharged", costUSD: 2200, arrivalDate: new Date(Date.now() - 30 * 86400000), dischargeDate: new Date(Date.now() - 25 * 86400000), outcome: "successful", totalBilled: 2450 },
  ];
  for (const inq of inquiries) {
    await db.tourismInquiry.create({
      data: {
        hospitalId: hospital.id,
        patientName: inq.name,
        patientEmail: inq.email,
        patientPhone: inq.phone,
        patientCountry: inq.country,
        countryCode: inq.code,
        procedureInterest: inq.procedure,
        conditionDesc: inq.condition,
        status: inq.status,
        estimatedCostUSD: inq.costUSD || null,
        estimatedCostINR: inq.costUSD ? Math.round(inq.costUSD * 83) : null,
        appointmentDate: inq.apptDate || null,
        arrivalDate: inq.arrivalDate || null,
        dischargeDate: inq.dischargeDate || null,
        outcome: inq.outcome || null,
        totalBilledUSD: inq.totalBilled || null,
        assignedCoordinatorId: null,
        coordinatorName: "Reception Staff",
        messages: JSON.stringify([{ from: "patient", text: `I am interested in ${inq.procedure}. ${inq.condition}`, timestamp: new Date().toISOString() }]),
      },
    });
  }
  console.log(`✓ ${inquiries.length} inquiries`);

  // Testimonials
  const testimonials = [
    { name: "Ahmed Al-Rashid", country: "UAE", procedure: "Cardiac Bypass Surgery", rating: 5, text: "The entire journey from inquiry to discharge was seamless. The cost estimate was transparent and the surgery was successful. Dr. Rajesh and his team saved my life.", date: "Jun 2026", verified: true },
    { name: "Sarah Mitchell", country: "UK", procedure: "Hip Replacement", rating: 5, text: "I saved 70% compared to UK private hospitals and got better care. The international desk arranged everything — visa, airport pickup, translator, accommodation.", date: "May 2026", verified: true },
    { name: "Fatima Bint Ali", country: "Qatar", procedure: "Knee Replacement", rating: 4, text: "Excellent medical care. Arabic-speaking coordinator made me feel comfortable. The follow-up via video consultation after I returned home was very helpful.", date: "Apr 2026", verified: true },
    { name: "John Mwangi", country: "Kenya", procedure: "Brain Tumor Surgery", rating: 5, text: "I was told the surgery wasn't possible in my country. Aarogya Hospital gave me a second chance at life. Forever grateful.", date: "Mar 2026", verified: true },
  ];
  for (const t of testimonials) {
    await db.tourismTestimonial.create({
      data: { hospitalId: hospital.id, patientName: t.name, patientCountry: t.country, procedure: t.procedure, rating: t.rating, testimonial: t.text, treatmentDate: t.date, verified: t.verified },
    });
  }
  console.log(`✓ ${testimonials.length} testimonials`);

  // Currency Rate
  await db.currencyRate.create({
    data: {
      base: "INR",
      rates: JSON.stringify({ USD: 0.0120, GBP: 0.0095, AED: 0.0441, BDT: 1.43, OMR: 0.0046, EUR: 0.011 }),
    },
  });
  console.log("✓ Currency rates");

  console.log("\n✅ Medical Tourism seed complete!");
}

main().catch(console.error).finally(async () => { await db.$disconnect(); });
