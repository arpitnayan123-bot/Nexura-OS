-- AlterTable
ALTER TABLE "ClinicDoctor" ALTER COLUMN "feeConsult" SET DEFAULT 50000;

-- AlterTable
ALTER TABLE "HospitalDoctor" ALTER COLUMN "consultationFee" SET DEFAULT 50000;

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokensPrompt" INTEGER,
    "tokensCompletion" INTEGER,
    "tokensTotal" INTEGER,
    "costMicroUsd" INTEGER,
    "tokenSource" TEXT NOT NULL,
    "costSource" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "fallbackUsed" BOOLEAN NOT NULL,
    "errorCode" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsageLog_capability_createdAt_idx" ON "AiUsageLog"("capability", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_provider_createdAt_idx" ON "AiUsageLog"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");
