-- Money columns: Float rupees -> Int paise (matches the Nx layer convention).
-- Conversion: rupees * 100, rounded to the nearest paise, as INTEGER.
-- Max representable value 2147483647 paise = ₹2,14,74,836.47 per column value.
-- Rates (cgstRate/sgstRate/gstRate/discountPct) deliberately remain Float —
-- India has 0.25% GST slabs; they are percentages, not money.

ALTER TABLE "ProductBatch"      ALTER COLUMN "mrp"          TYPE INTEGER USING round("mrp"::numeric * 100)::int;
ALTER TABLE "ProductBatch"      ALTER COLUMN "purchaseRate" TYPE INTEGER USING round("purchaseRate"::numeric * 100)::int;

ALTER TABLE "Sale"              ALTER COLUMN "subtotal"     TYPE INTEGER USING round("subtotal"::numeric * 100)::int;
ALTER TABLE "Sale"              ALTER COLUMN "discount"     TYPE INTEGER USING round("discount"::numeric * 100)::int;
ALTER TABLE "Sale"              ALTER COLUMN "cgst"         TYPE INTEGER USING round("cgst"::numeric * 100)::int;
ALTER TABLE "Sale"              ALTER COLUMN "sgst"         TYPE INTEGER USING round("sgst"::numeric * 100)::int;
ALTER TABLE "Sale"              ALTER COLUMN "roundOff"     TYPE INTEGER USING round("roundOff"::numeric * 100)::int;
ALTER TABLE "Sale"              ALTER COLUMN "total"        TYPE INTEGER USING round("total"::numeric * 100)::int;

ALTER TABLE "SaleItem"          ALTER COLUMN "mrpPerStrip"  TYPE INTEGER USING round("mrpPerStrip"::numeric * 100)::int;
ALTER TABLE "SaleItem"          ALTER COLUMN "discount"     TYPE INTEGER USING round("discount"::numeric * 100)::int;
ALTER TABLE "SaleItem"          ALTER COLUMN "lineTotal"    TYPE INTEGER USING round("lineTotal"::numeric * 100)::int;

ALTER TABLE "Purchase"          ALTER COLUMN "total"        TYPE INTEGER USING round("total"::numeric * 100)::int;
ALTER TABLE "Purchase"          ALTER COLUMN "paidAmount"   TYPE INTEGER USING round("paidAmount"::numeric * 100)::int;

ALTER TABLE "PurchaseItem"      ALTER COLUMN "mrp"          TYPE INTEGER USING round("mrp"::numeric * 100)::int;
ALTER TABLE "PurchaseItem"      ALTER COLUMN "purchaseRate" TYPE INTEGER USING round("purchaseRate"::numeric * 100)::int;
ALTER TABLE "PurchaseItem"      ALTER COLUMN "lineTotal"    TYPE INTEGER USING round("lineTotal"::numeric * 100)::int;

ALTER TABLE "NearExpiryReturn"     ALTER COLUMN "cgst"  TYPE INTEGER USING round("cgst"::numeric * 100)::int;
ALTER TABLE "NearExpiryReturn"     ALTER COLUMN "sgst"  TYPE INTEGER USING round("sgst"::numeric * 100)::int;
ALTER TABLE "NearExpiryReturn"     ALTER COLUMN "total" TYPE INTEGER USING round("total"::numeric * 100)::int;

ALTER TABLE "NearExpiryReturnItem" ALTER COLUMN "mrp"       TYPE INTEGER USING round("mrp"::numeric * 100)::int;
ALTER TABLE "NearExpiryReturnItem" ALTER COLUMN "lineTotal" TYPE INTEGER USING round("lineTotal"::numeric * 100)::int;

ALTER TABLE "DayClosing"        ALTER COLUMN "cashSales"      TYPE INTEGER USING round("cashSales"::numeric * 100)::int;
ALTER TABLE "DayClosing"        ALTER COLUMN "upiSales"       TYPE INTEGER USING round("upiSales"::numeric * 100)::int;
ALTER TABLE "DayClosing"        ALTER COLUMN "cardSales"      TYPE INTEGER USING round("cardSales"::numeric * 100)::int;
ALTER TABLE "DayClosing"        ALTER COLUMN "creditSales"    TYPE INTEGER USING round("creditSales"::numeric * 100)::int;
ALTER TABLE "DayClosing"        ALTER COLUMN "totalSales"     TYPE INTEGER USING round("totalSales"::numeric * 100)::int;
ALTER TABLE "DayClosing"        ALTER COLUMN "cgstCollected"  TYPE INTEGER USING round("cgstCollected"::numeric * 100)::int;
ALTER TABLE "DayClosing"        ALTER COLUMN "sgstCollected"  TYPE INTEGER USING round("sgstCollected"::numeric * 100)::int;
ALTER TABLE "DayClosing"        ALTER COLUMN "totalGst"       TYPE INTEGER USING round("totalGst"::numeric * 100)::int;
ALTER TABLE "DayClosing"        ALTER COLUMN "totalPurchases" TYPE INTEGER USING round("totalPurchases"::numeric * 100)::int;
ALTER TABLE "DayClosing"        ALTER COLUMN "totalDiscount"  TYPE INTEGER USING round("totalDiscount"::numeric * 100)::int;
ALTER TABLE "DayClosing"        ALTER COLUMN "netProfit"      TYPE INTEGER USING round("netProfit"::numeric * 100)::int;

ALTER TABLE "SupplierPayment"   ALTER COLUMN "amount"       TYPE INTEGER USING round("amount"::numeric * 100)::int;
ALTER TABLE "CustomerAccount"   ALTER COLUMN "creditLimit"  TYPE INTEGER USING round("creditLimit"::numeric * 100)::int;
ALTER TABLE "CustomerPayment"   ALTER COLUMN "amount"       TYPE INTEGER USING round("amount"::numeric * 100)::int;

ALTER TABLE "HospitalDoctor"    ALTER COLUMN "consultationFee"     TYPE INTEGER USING round("consultationFee"::numeric * 100)::int;
ALTER TABLE "HospitalMedicine"  ALTER COLUMN "nppaCeilingPrice"    TYPE INTEGER USING round("nppaCeilingPrice"::numeric * 100)::int;

ALTER TABLE "HospitalBill"      ALTER COLUMN "subtotal"     TYPE INTEGER USING round("subtotal"::numeric * 100)::int;
ALTER TABLE "HospitalBill"      ALTER COLUMN "discount"     TYPE INTEGER USING round("discount"::numeric * 100)::int;
ALTER TABLE "HospitalBill"      ALTER COLUMN "cgst"         TYPE INTEGER USING round("cgst"::numeric * 100)::int;
ALTER TABLE "HospitalBill"      ALTER COLUMN "sgst"         TYPE INTEGER USING round("sgst"::numeric * 100)::int;
ALTER TABLE "HospitalBill"      ALTER COLUMN "totalPayable" TYPE INTEGER USING round("totalPayable"::numeric * 100)::int;

ALTER TABLE "InsuranceClaim"    ALTER COLUMN "estimatedCost"  TYPE INTEGER USING round("estimatedCost"::numeric * 100)::int;
ALTER TABLE "InsuranceClaim"    ALTER COLUMN "approvedAmount" TYPE INTEGER USING round("approvedAmount"::numeric * 100)::int;
ALTER TABLE "InsuranceClaim"    ALTER COLUMN "patientCopay"   TYPE INTEGER USING round("patientCopay"::numeric * 100)::int;

ALTER TABLE "ClinicDoctor"      ALTER COLUMN "feeConsult"   TYPE INTEGER USING round("feeConsult"::numeric * 100)::int;

ALTER TABLE "ClinicInvoice"     ALTER COLUMN "amount"   TYPE INTEGER USING round("amount"::numeric * 100)::int;
ALTER TABLE "ClinicInvoice"     ALTER COLUMN "discount" TYPE INTEGER USING round("discount"::numeric * 100)::int;
ALTER TABLE "ClinicInvoice"     ALTER COLUMN "total"    TYPE INTEGER USING round("total"::numeric * 100)::int;

ALTER TABLE "NxInsuranceContract" ALTER COLUMN "payoutTotal"   TYPE INTEGER USING round("payoutTotal"::numeric * 100)::int;
ALTER TABLE "NxInsuranceContract" ALTER COLUMN "settledAmount" TYPE INTEGER USING round("settledAmount"::numeric * 100)::int;
