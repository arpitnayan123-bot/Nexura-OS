-- TelemedicineConsult — clinic teleconsults (NMC Telemedicine Guidelines 2020).
-- Enables /api/clinic/telemedicine, which referenced this model before it
-- existed in the Postgres schema (route was dead-on-arrival at runtime).

-- CreateTable
CREATE TABLE "TelemedicineConsult" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT,
    "patientType" TEXT NOT NULL DEFAULT 'clinic',
    "doctorName" TEXT NOT NULL,
    "doctorRegNo" TEXT NOT NULL,
    "consultMode" TEXT NOT NULL DEFAULT 'video',
    "chiefComplaint" TEXT,
    "diagnosis" TEXT,
    "prescription" TEXT,
    "followUpDate" TIMESTAMP(3),
    "patientConsent" BOOLEAN NOT NULL DEFAULT true,
    "consentText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelemedicineConsult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelemedicineConsult_clinicId_status_idx" ON "TelemedicineConsult"("clinicId", "status");

-- CreateIndex
CREATE INDEX "TelemedicineConsult_clinicId_startedAt_idx" ON "TelemedicineConsult"("clinicId", "startedAt");

-- AddForeignKey
ALTER TABLE "TelemedicineConsult" ADD CONSTRAINT "TelemedicineConsult_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
