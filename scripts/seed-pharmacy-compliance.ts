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
  // wipe compliance tables
  await db.customerPayment.deleteMany();
  await db.customerAccount.deleteMany();
  await db.supplierPayment.deleteMany();
  await db.scheduleHEntry.deleteMany();
  await db.nearExpiryReturnItem.deleteMany();
  await db.nearExpiryReturn.deleteMany();
  await db.dayClosing.deleteMany();

  const branch = await db.pharmaBranch.findFirst({ orderBy: { createdAt: "asc" } });
  if (!branch) throw new Error("no branch — run seed-pharmacy first");

  const suppliers = await db.supplier.findMany();
  const purchases = await db.purchase.findMany();
  const customers = await db.customer.findMany();
  const products = await db.product.findMany({ include: { batches: { where: { branchId: branch.id } } } });

  // ---- Supplier payments (partial dues) ----
  // mark some purchases as partially paid
  for (let i = 0; i < purchases.length; i++) {
    const p = purchases[i];
    const total = p.total || 10000;
    const paid = i % 2 === 0 ? total : Math.round(total * 0.5); // half paid for odd
    await db.purchase.update({ where: { id: p.id }, data: { paidAmount: paid, status: "received" } });
    if (paid > 0) {
      await db.supplierPayment.create({
        data: { supplierId: p.supplierId, purchaseId: p.id, amount: paid, payMode: i % 2 === 0 ? "bank" : "upi", refNo: `UTR${100000 + i}`, notes: "Advance payment" },
      });
    }
  }

  // ---- Customer accounts (credit) ----
  // give the non-walk-in customers a credit account
  for (const c of customers.filter((x) => x.name !== "Walk-in")) {
    await db.customerAccount.create({ data: { customerId: c.id, creditLimit: 5_000_000 } }); // ₹50,000 in paise
  }

  // mark some sales as credit (to create outstanding balances)
  const sales = await db.sale.findMany({ take: 4 });
  for (let i = 0; i < sales.length; i++) {
    const s = sales[i];
    const cust = customers.find((c) => c.name !== "Walk-in") || customers[0];
    if (!cust) continue;
    await db.sale.update({ where: { id: s.id }, data: { payMode: "credit", customerId: cust.id, status: "billed" } });
  }

  // a couple of customer payments (partial)
  const accCustomers = customers.filter((c) => c.name !== "Walk-in");
  if (accCustomers[0]) {
    await db.customerPayment.create({ data: { customerId: accCustomers[0].id, amount: 50_000, payMode: "upi", refNo: "PAY-001", notes: "Partial payment" } }); // ₹500 in paise
  }

  // ---- Schedule H register entries (audit format) ----
  const scheduleHProducts = products.filter((p) => p.schedule === "H" || p.schedule === "H1");
  let serial = 1;
  for (let i = 0; i < 5; i++) {
    const p = scheduleHProducts[i % scheduleHProducts.length];
    if (!p) continue;
    const batch = p.batches[0];
    if (!batch) continue;
    await db.scheduleHEntry.create({
      data: {
        branchId: branch.id,
        serialNo: serial++,
        saleDate: new Date(Date.now() - i * 86400000),
        patientName: ["Ramesh Patel", "Lakshmi Iyer", "Mohammed Khan", "Suresh Nair", "Geeta Pillai"][i],
        patientAddress: ["Bandra, Mumbai", "Andheri West, Mumbai", "Juhu, Mumbai", "Dadar, Mumbai", "Worli, Mumbai"][i],
        patientPhone: "+91 98200 " + String(10000 + i),
        doctorName: ["Dr. Anita Rao", "Dr. Vikram Shah", "Dr. Sanjay Gupta", "Dr. Meera Iyer", "Dr. Rohan Mehta"][i],
        doctorRegNo: ["MMC-44512", "MMC-44890", "MMC-45200", "MMC-44887", "MMC-44950"][i],
        prescriptionDate: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
        medicineName: p.name,
        batchNo: batch.batchNo,
        qtyStrips: 1 + (i % 3),
        qtyLoose: 0,
        schedule: p.schedule || "H",
      },
    });
  }

  console.log(`✅ Compliance seed complete — supplier payments, customer accounts, ${serial - 1} schedule H entries`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await db.$disconnect(); });
