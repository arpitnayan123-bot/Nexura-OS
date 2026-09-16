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

/* Seed pharmacy demo data — idempotent-ish (clears pharma* tables first). */
async function main() {
  await db.purchaseItem.deleteMany();
  await db.purchase.deleteMany();
  await db.saleItem.deleteMany();
  await db.sale.deleteMany();
  await db.productBatch.deleteMany();
  await db.product.deleteMany();
  await db.supplier.deleteMany();
  await db.customer.deleteMany();
  await db.pharmaStaff.deleteMany();
  await db.pharmaBranch.deleteMany();
  await db.pharmaCompany.deleteMany();

  const company = await db.pharmaCompany.create({
    data: {
      name: "Sunrise Pharma Co.",
      gstin: "27ABCDE1234F1Z5",
      email: "owner@sunrisepharma.in",
      phone: "+91 98200 11223",
      drugLicense: "20B/MH/0042/21",
    },
  });

  const branch = await db.pharmaBranch.create({
    data: {
      companyId: company.id,
      name: "Sunrise Pharmacy — Andheri",
      address: "Shop 4, Lokhandwala Complex, Andheri West",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400053",
      gstin: "27ABCDE1234F1Z5",
    },
  });

  await db.pharmaStaff.create({
    data: {
      companyId: company.id,
      branchId: branch.id,
      name: "Anita Desai",
      email: "anita@sunrisepharma.in",
      phone: "+91 98200 44556",
      role: "pharmacist",
      pinHash: "1111",
    },
  });

  await db.customer.createMany({
    data: [
      { name: "Walk-in", phone: null },
      { name: "Rahul Mehta", phone: "+91 98765 43210", gstin: null },
      { name: "Care Clinic", phone: "+91 22 2632 1100", gstin: "27AAACC1234D1Z9" },
    ],
  });

  await db.supplier.create({
    data: {
      name: "MediDistributors Pvt Ltd",
      phone: "+91 22 2500 7700",
      gstin: "27AAACM7890K1Z2",
      dlNumber: "20B/MH/0099/19",
      address: "Wholesale Market, Masjid Bunder, Mumbai",
    },
  });

  const products = [
    { name: "Crocin Advance 500mg", genericName: "Paracetamol", brand: "Crocin", category: "tablet", hsn: "30049099", schedule: "OTC", salts: "Paracetamol 500mg", packaging: "strip of 15", stripsPerBox: 10, tabletsPerStrip: 15, cgstRate: 6, sgstRate: 6, reorderLevel: 20 },
    { name: "Dolo 650", genericName: "Paracetamol", brand: "Dolo", category: "tablet", hsn: "30049099", schedule: "OTC", salts: "Paracetamol 650mg", packaging: "strip of 15", stripsPerBox: 10, tabletsPerStrip: 15, cgstRate: 6, sgstRate: 6, reorderLevel: 30 },
    { name: "Azithral 500", genericName: "Azithromycin", brand: "Azithral", category: "tablet", hsn: "30042099", schedule: "H", salts: "Azithromycin 500mg", packaging: "strip of 5", stripsPerBox: 10, tabletsPerStrip: 5, cgstRate: 6, sgstRate: 6, reorderLevel: 15 },
    { name: "Augmentin 625", genericName: "Amoxicillin + Clavulanic Acid", brand: "Augmentin", category: "tablet", hsn: "30042099", schedule: "H", salts: "Amoxicillin 500mg, Clavulanic Acid 125mg", packaging: "strip of 6", stripsPerBox: 10, tabletsPerStrip: 6, cgstRate: 6, sgstRate: 6, reorderLevel: 12 },
    { name: "Cetzine", genericName: "Cetirizine", brand: "Cetzine", category: "tablet", hsn: "30049099", schedule: "OTC", salts: "Cetirizine 10mg", packaging: "strip of 10", stripsPerBox: 10, tabletsPerStrip: 10, cgstRate: 6, sgstRate: 6, reorderLevel: 25 },
    { name: "Glycomet 500", genericName: "Metformin", brand: "Glycomet", category: "tablet", hsn: "30049099", schedule: "H1", salts: "Metformin 500mg", packaging: "strip of 20", stripsPerBox: 10, tabletsPerStrip: 20, cgstRate: 6, sgstRate: 6, reorderLevel: 18 },
    { name: "Shelcal 500", genericName: "Calcium + Vitamin D3", brand: "Shelcal", category: "tablet", hsn: "30049099", schedule: "OTC", salts: "Calcium Carbonate 1250mg, Vitamin D3 250IU", packaging: "strip of 15", stripsPerBox: 10, tabletsPerStrip: 15, cgstRate: 6, sgstRate: 6, reorderLevel: 20 },
    { name: "Benadryl Syrup", genericName: "Diphenhydramine + Ammonium Chloride", brand: "Benadryl", category: "syrup", hsn: "30049099", schedule: "OTC", salts: "Diphenhydramine 14mg, Ammonium Chloride 138mg / 5ml", packaging: "bottle 100ml", stripsPerBox: 1, tabletsPerStrip: 1, cgstRate: 6, sgstRate: 6, reorderLevel: 10 },
  ];

  const createdProducts = [];
  for (const p of products) {
    createdProducts.push(await db.product.create({ data: p }));
  }

  const now = new Date();
  const monthsFromNow = (m: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 7);
  };
  const monthsAgo = (m: number) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - m);
    return d.toISOString().slice(0, 7);
  };

  const batchDefs = [
    { suffix: "B2", expOff: 18, mfgOff: -6, stock: 40, mrpMul: 1 },
    { suffix: "C1", expOff: 3, mfgOff: -15, stock: 8, mrpMul: 1.02 },
  ];

  const mrpTable: Record<string, number> = {
    "Crocin Advance 500mg": 30, "Dolo 650": 35, "Azithral 500": 90,
    "Augmentin 625": 220, Cetzine: 18, "Glycomet 500": 28,
    "Shelcal 500": 125, "Benadryl Syrup": 110,
  };

  for (const prod of createdProducts) {
    for (const bd of batchDefs) {
      await db.productBatch.create({
        data: {
          productId: prod.id,
          branchId: branch.id,
          batchNo: `${prod.name.slice(0, 3).toUpperCase()}${bd.suffix}`,
          barcode: `890${Math.floor(1000000000 + Math.random() * 8999999999)}`,
          mfgDate: monthsAgo(bd.mfgOff),
          expDate: monthsFromNow(bd.expOff),
          mrp: Math.round((mrpTable[prod.name] ?? 50) * bd.mrpMul * 100), // paise
          purchaseRate: Math.round((mrpTable[prod.name] ?? 50) * 0.72 * 100), // paise
          stockStrips: bd.stock,
          stockLoose: 0,
        },
      });
    }
  }

  console.log("✅ Pharmacy seed complete");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
