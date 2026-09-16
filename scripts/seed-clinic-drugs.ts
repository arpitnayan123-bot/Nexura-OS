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
  await db.indianDrug.deleteMany();

  const drugs = [
    { b: "Crocin", s: "Paracetamol", st: "500mg", f: "tablet", sc: "OTC", c: "analgesic", co: "GSK" },
    { b: "Dolo", s: "Paracetamol", st: "650mg", f: "tablet", sc: "OTC", c: "analgesic", co: "Micro Labs" },
    { b: "Dolo", s: "Paracetamol", st: "500mg", f: "tablet", sc: "OTC", c: "analgesic", co: "Micro Labs" },
    { b: "Calpol", s: "Paracetamol", st: "500mg", f: "syrup", sc: "OTC", c: "analgesic", co: "GSK" },
    { b: "Brufen", s: "Ibuprofen", st: "400mg", f: "tablet", sc: "OTC", c: "nsaid", co: "Abbott" },
    { b: "Combiflam", s: "Ibuprofen + Paracetamol", st: "400/325mg", f: "tablet", sc: "OTC", c: "nsaid", co: "Sanofi" },
    { b: "Voveran", s: "Diclofenac", st: "50mg", f: "tablet", sc: "H", c: "nsaid", co: "Novartis" },
    { b: "Augmentin", s: "Amoxicillin + Clavulanic Acid", st: "625mg", f: "tablet", sc: "H", c: "antibiotic", co: "GSK" },
    { b: "Amoxil", s: "Amoxicillin", st: "500mg", f: "capsule", sc: "H", c: "antibiotic", co: "GSK" },
    { b: "Azithral", s: "Azithromycin", st: "500mg", f: "tablet", sc: "H", c: "antibiotic", co: "Alembic" },
    { b: "Azithral", s: "Azithromycin", st: "250mg", f: "tablet", sc: "H", c: "antibiotic", co: "Alembic" },
    { b: "Ciproflox", s: "Ciprofloxacin", st: "500mg", f: "tablet", sc: "H", c: "antibiotic", co: "Cipla" },
    { b: "Oflox", s: "Ofloxacin", st: "200mg", f: "tablet", sc: "H", c: "antibiotic", co: "Sun Pharma" },
    { b: "Roxithromycin", s: "Roxithromycin", st: "150mg", f: "tablet", sc: "H", c: "antibiotic", co: "Alembic" },
    { b: "Doxycycline", s: "Doxycycline", st: "100mg", f: "capsule", sc: "H", c: "antibiotic", co: "Cipla" },
    { b: "Metrogyl", s: "Metronidazole", st: "400mg", f: "tablet", sc: "H", c: "antibiotic", co: "USV" },
    { b: "Cetzine", s: "Cetirizine", st: "10mg", f: "tablet", sc: "OTC", c: "antihistamine", co: "Dr Reddy's" },
    { b: "Allegra", s: "Fexofenadine", st: "120mg", f: "tablet", sc: "H", c: "antihistamine", co: "Sanofi" },
    { b: "Avil", s: "Pheniramine", st: "25mg", f: "tablet", sc: "H", c: "antihistamine", co: "Sanofi" },
    { b: "Rantac", s: "Ranitidine", st: "150mg", f: "tablet", sc: "H1", c: "antacid", co: "Sun Pharma" },
    { b: "Pan", s: "Pantoprazole", st: "40mg", f: "tablet", sc: "H1", c: "antacid", co: "Alkem" },
    { b: "Omez", s: "Omeprazole", st: "20mg", f: "capsule", sc: "H1", c: "antacid", co: "Dr Reddy's" },
    { b: "Razo", s: "Rabeprazole", st: "20mg", f: "tablet", sc: "H1", c: "antacid", co: "Sun Pharma" },
    { b: "Mucaine", s: "Oxetacaine + Aluminium + Magnesium", st: "—", f: "syrup", sc: "OTC", c: "antacid", co: "Sun Pharma" },
    { b: "Digene", s: "Aluminium Hydroxide + Magnesium Hydroxide", st: "—", f: "syrup", sc: "OTC", c: "antacid", co: "Abbott" },
    { b: "Glycomet", s: "Metformin", st: "500mg", f: "tablet", sc: "H1", c: "antidiabetic", co: "USV" },
    { b: "Glycomet", s: "Metformin", st: "850mg", f: "tablet", sc: "H1", c: "antidiabetic", co: "USV" },
    { b: "Glimisave", s: "Glimepiride", st: "2mg", f: "tablet", sc: "H1", c: "antidiabetic", co: "Sun Pharma" },
    { b: "Galvus", s: "Vildagliptin", st: "50mg", f: "tablet", sc: "H", c: "antidiabetic", co: "Novartis" },
    { b: "Amaryl", s: "Glimepiride", st: "1mg", f: "tablet", sc: "H1", c: "antidiabetic", co: "Sanofi" },
    { b: " insulin", s: "Insulin", st: "—", f: "injection", sc: "H", c: "antidiabetic", co: "Lilly" },
    { b: "Telma", s: "Telmisartan", st: "40mg", f: "tablet", sc: "H1", c: "antihypertensive", co: "GSK" },
    { b: "Amlong", s: "Amlodipine", st: "5mg", f: "tablet", sc: "H1", c: "antihypertensive", co: "Micro Labs" },
    { b: "Cardace", s: "Ramipril", st: "2.5mg", f: "tablet", sc: "H1", c: "antihypertensive", co: "Sanofi" },
    { b: "Starpress", s: "Metoprolol", st: "25mg", f: "tablet", sc: "H1", c: "antihypertensive", co: "Abbott" },
    { b: "Aten", s: "Atenolol", st: "50mg", f: "tablet", sc: "H1", c: "antihypertensive", co: "Sun Pharma" },
    { b: "Lasix", s: "Furosemide", st: "40mg", f: "tablet", sc: "H1", c: "diuretic", co: "Sanofi" },
    { b: "Rosuvas", s: "Rosuvastatin", st: "10mg", f: "tablet", sc: "H1", c: "lipid-lowering", co: "Sun Pharma" },
    { b: "Atorva", s: "Atorvastatin", st: "10mg", f: "tablet", sc: "H1", c: "lipid-lowering", co: "Zydus" },
    { b: "Ecosprin", s: "Aspirin", st: "75mg", f: "tablet", sc: "H1", c: "antiplatelet", co: "USV" },
    { b: "Clopitab", s: "Clopidogrel", st: "75mg", f: "tablet", sc: "H1", c: "antiplatelet", co: "Sun Pharma" },
    { b: "Shelcal", s: "Calcium + Vitamin D3", st: "500mg", f: "tablet", sc: "OTC", c: "supplement", co: "Sun Pharma" },
    { b: "Becosules", s: "B-Complex", st: "—", f: "capsule", sc: "OTC", c: "supplement", co: "Pfizer" },
    { b: "Neurobion", s: "B12 + B1 + B6", st: "—", f: "tablet", sc: "OTC", c: "supplement", co: "Merck" },
    { b: "Cipcal", s: "Calcium + Vitamin D3", st: "500mg", f: "tablet", sc: "OTC", c: "supplement", co: "Cipla" },
    { b: "Benadryl", s: "Diphenhydramine + Ammonium Chloride", st: "—", f: "syrup", sc: "OTC", c: "cough", co: "J&J" },
    { b: "Ascoril", s: "Bromhexine + Guaifenesin + Terbutaline", st: "—", f: "syrup", sc: "H", c: "cough", co: "Sun Pharma" },
    { b: "Augmentin DDS", s: "Amoxicillin + Clavulanic Acid", st: "200mg", f: "syrup", sc: "H", c: "antibiotic", co: "GSK" },
    { b: "Zifi", s: "Cefixime", st: "200mg", f: "tablet", sc: "H", c: "antibiotic", co: "FDC" },
    { b: "Taxim", s: "Cefotaxime", st: "500mg", f: "injection", sc: "H", c: "antibiotic", co: "Alkem" },
    { b: "Monocef", s: "Ceftriaxone", st: "1g", f: "injection", sc: "H", c: "antibiotic", co: "Aristo" },
    { b: "Pudin Hara", s: "Mint Oil", st: "—", f: "capsule", sc: "OTC", c: "carminative", co: "Dabur" },
    { b: "Limcee", s: "Vitamin C", st: "500mg", f: "tablet", sc: "OTC", c: "supplement", co: "Abbott" },
    { b: "Zincovit", s: "Multivitamin + Zinc", st: "—", f: "tablet", sc: "OTC", c: "supplement", co: "Sun Pharma" },
  ];

  for (const d of drugs) {
    await db.indianDrug.create({ data: { brandName: d.b.trim(), saltName: d.s, strength: d.st, form: d.f, schedule: d.sc, category: d.c, company: d.co } });
  }

  // Set booking slug on existing clinic
  const clinic = await db.clinic.findFirst();
  if (clinic) {
    await db.clinic.update({ where: { id: clinic.id }, data: { bookingSlug: "rao-clinic" } });
  }

  console.log(`✅ Seeded ${drugs.length} Indian drugs + booking slug set`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
