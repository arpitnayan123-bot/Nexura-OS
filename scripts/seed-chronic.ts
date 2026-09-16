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
  const branch = await db.pharmaBranch.findFirst();
  if (!branch) throw new Error("no branch");

  // Get products for chronic meds
  const products = await db.product.findMany();
  const findByName = (name: string) => products.find(p => p.name === name);
  const glycomet = findByName("Glycomet 500");
  const amlong = findByName("Amlong") || products.find(p => p.genericName?.includes("Amlodipine"));
  const ecosprin = findByName("Ecosprin 500") || products.find(p => p.name.includes("Ecosprin"));
  const shelcal = findByName("Shelcal 500");

  // Get walk-in customer and Care Clinic
  const customers = await db.customer.findMany();
  const chronicCustomer = customers.find(c => c.name === "Rahul Mehta") || customers.find(c => c.name !== "Walk-in");
  if (!chronicCustomer) throw new Error("no customer");

  const staff = await db.pharmaStaff.findFirst();
  const supplier = await db.supplier.findFirst();

  // Create chronic medicine sales for Rahul Mehta (diabetic + hypertensive)
  // Purchase history: Metformin monthly for 3 months, Amlodipine monthly
  const chronicMeds = [
    { product: glycomet, qty: 2 }, // Metformin 500mg BD × 15 days = 1 strip, 2 strips/month
    { product: amlong, qty: 3 }, // Amlodipine
    { product: ecosprin, qty: 1 }, // Aspirin
    { product: shelcal, qty: 1 }, // Calcium
  ].filter(m => m.product);

  for (let month = 0; month < 3; month++) {
    const date = new Date();
    date.setMonth(date.getMonth() - month);
    date.setDate(15);

    const count = await db.sale.count();
    const invoiceNo = `INV-CHRONIC-${count + 1}-${month}`;

    const items: any[] = [];
    /* integer-paise math (docs/ARCHITECTURE.md §5) — batch.mrp is paise */
    let subtotalPaise = 0, cgstTotalPaise = 0, sgstTotalPaise = 0;
    for (const med of chronicMeds) {
      const batch = await db.productBatch.findFirst({ where: { productId: med.product!.id, branchId: branch.id } });
      if (!batch) continue;
      const amtPaise = batch.mrp * med.qty;
      const cgstPaise = Math.round((amtPaise * 6) / 100);
      const sgstPaise = Math.round((amtPaise * 6) / 100);
      subtotalPaise += amtPaise;
      cgstTotalPaise += cgstPaise;
      sgstTotalPaise += sgstPaise;
      items.push({
        productId: med.product!.id,
        batchId: batch.id,
        qtyStrips: med.qty,
        qtyLoose: 0,
        mrpPerStrip: batch.mrp,
        cgstRate: 6,
        sgstRate: 6,
        lineTotal: amtPaise + cgstPaise + sgstPaise,
      });
    }

    if (items.length === 0) continue;

    await db.sale.create({
      data: {
        invoiceNo: `INV-CHRONIC-${month + 1}`,
        branchId: branch.id,
        staffId: staff?.id,
        customerId: chronicCustomer.id,
        subtotal: subtotalPaise,
        cgst: cgstTotalPaise,
        sgst: sgstTotalPaise,
        total: subtotalPaise + cgstTotalPaise + sgstTotalPaise,
        roundOff: 0,
        payMode: "upi",
        status: "billed",
        items: { create: items },
      },
    });
  }

  console.log(`✅ Seeded 3 months of chronic medicine purchases for ${chronicCustomer.name} (Diabetes + Hypertension)`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
