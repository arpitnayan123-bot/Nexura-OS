-- CreateTable
CREATE TABLE "PharmaOnlineOrder" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT,
    "patientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "deliveryAddress" TEXT,
    "prescriptionImage" TEXT,
    "ocrItemsJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "note" TEXT,
    "estimatedTotal" INTEGER NOT NULL DEFAULT 0,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmaOnlineOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmaOnlineOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "qtyStrips" INTEGER NOT NULL DEFAULT 1,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "unitMrp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PharmaOnlineOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmaOnlineOrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "actor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmaOnlineOrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PharmaOnlineOrder_orderNo_key" ON "PharmaOnlineOrder"("orderNo");

-- CreateIndex
CREATE INDEX "PharmaOnlineOrder_branchId_idx" ON "PharmaOnlineOrder"("branchId");

-- CreateIndex
CREATE INDEX "PharmaOnlineOrder_status_idx" ON "PharmaOnlineOrder"("status");

-- CreateIndex
CREATE INDEX "PharmaOnlineOrder_phone_idx" ON "PharmaOnlineOrder"("phone");

-- CreateIndex
CREATE INDEX "PharmaOnlineOrder_placedAt_idx" ON "PharmaOnlineOrder"("placedAt");

-- CreateIndex
CREATE INDEX "PharmaOnlineOrderItem_orderId_idx" ON "PharmaOnlineOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "PharmaOnlineOrderItem_productId_idx" ON "PharmaOnlineOrderItem"("productId");

-- CreateIndex
CREATE INDEX "PharmaOnlineOrderEvent_orderId_idx" ON "PharmaOnlineOrderEvent"("orderId");

-- CreateIndex
CREATE INDEX "PharmaOnlineOrderEvent_createdAt_idx" ON "PharmaOnlineOrderEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "PharmaOnlineOrder" ADD CONSTRAINT "PharmaOnlineOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "PharmaBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmaOnlineOrder" ADD CONSTRAINT "PharmaOnlineOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmaOnlineOrderItem" ADD CONSTRAINT "PharmaOnlineOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PharmaOnlineOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmaOnlineOrderItem" ADD CONSTRAINT "PharmaOnlineOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmaOnlineOrderEvent" ADD CONSTRAINT "PharmaOnlineOrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PharmaOnlineOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

