-- ============================================================
-- Migration: integrity_indexes_batch_identity (arch-m1)
--
-- Schema hardening in one pass:
--   A. ProductBatch batch identity  @@unique(branchId, productId, batchNo)
--   B. FK back-indexes for every list/filter/cascade path (Postgres does
--      not auto-index FK columns)
--   C. NxAuditEvent / NxEventLog / NxTimestampBlock hospital FKs flipped
--      Cascade -> Restrict (append-only compliance chains)
--   D. NxEventLog per-aggregate sequence integrity @@unique(hospitalId,
--      aggregateType, aggregateId, seq)
--   E. HospitalAppointment partial unique index (doctorId, date) WHERE
--      status NOT IN ('cancelled','no_show') — double-booking guard
--      (partial indexes cannot be expressed in the Prisma schema)
--
-- Sections "DATA REPAIR" below run BEFORE the unique indexes they unblock.
-- They are deterministic and idempotent: duplicate groups that don't exist
-- simply match zero rows.
-- ============================================================

-- ------------------------------------------------------------
-- DATA REPAIR (A): ProductBatch — historical race could insert
-- duplicate (branchId, productId, batchNo) rows. For each dup
-- group keep the smallest id, fold the losers' stock into it,
-- then delete the losers — otherwise the unique index below
-- would fail.
-- ------------------------------------------------------------
WITH dup_groups AS (
  SELECT "branchId", "productId", "batchNo", MIN("id") AS "keeperId"
  FROM "ProductBatch"
  GROUP BY "branchId", "productId", "batchNo"
  HAVING COUNT(*) > 1
),
loser_sums AS (
  SELECT d."keeperId",
         SUM(pb."stockStrips") AS "stockStrips",
         SUM(pb."stockLoose")  AS "stockLoose"
  FROM "ProductBatch" pb
  JOIN dup_groups d
    ON pb."branchId" = d."branchId"
   AND pb."productId" = d."productId"
   AND pb."batchNo"   = d."batchNo"
   AND pb."id" <> d."keeperId"
  GROUP BY d."keeperId"
),
fold AS (
  UPDATE "ProductBatch" k
  SET "stockStrips" = k."stockStrips" + s."stockStrips",
      "stockLoose"  = k."stockLoose"  + s."stockLoose"
  FROM loser_sums s
  WHERE k."id" = s."keeperId"
),
del AS (
  DELETE FROM "ProductBatch" pb
  USING dup_groups d
  WHERE pb."branchId"  = d."branchId"
    AND pb."productId" = d."productId"
    AND pb."batchNo"   = d."batchNo"
    AND pb."id" <> d."keeperId"
  RETURNING pb."id"
)
SELECT COUNT(*) AS deduped_product_batches FROM del;

-- ------------------------------------------------------------
-- DATA REPAIR (D): NxEventLog — resequence duplicate seq values
-- within one (hospitalId, aggregateType, aggregateId) stream.
-- The FIRST occurrence of each duplicated seq (by createdAt, id)
-- keeps it; every later occurrence is renumbered to follow the
-- stream's max(seq) + 1, +2, ... in (createdAt, id) order, so the
-- unique index below cannot fail and no kept row changes.
-- ------------------------------------------------------------
WITH dup_streams AS (
  SELECT "hospitalId", "aggregateType", "aggregateId"
  FROM "NxEventLog"
  GROUP BY "hospitalId", "aggregateType", "aggregateId"
  HAVING COUNT(*) <> COUNT(DISTINCT "seq")
),
scoped AS (
  SELECT e."id", e."seq", e."createdAt",
         e."hospitalId", e."aggregateType", e."aggregateId",
         MAX(e."seq") OVER (
           PARTITION BY e."hospitalId", e."aggregateType", e."aggregateId"
         ) AS "maxSeq"
  FROM "NxEventLog" e
  JOIN dup_streams s
    ON e."hospitalId"    = s."hospitalId"
   AND e."aggregateType" = s."aggregateType"
   AND e."aggregateId"   = s."aggregateId"
),
duplicate_occurrences AS (
  SELECT s."id", s."hospitalId", s."aggregateType", s."aggregateId",
         s."createdAt", s."maxSeq",
         ROW_NUMBER() OVER (
           PARTITION BY s."hospitalId", s."aggregateType", s."aggregateId", s."seq"
           ORDER BY s."createdAt" ASC, s."id" ASC
         ) AS occ
  FROM scoped s
),
plan AS (
  SELECT d."id",
         d."maxSeq" + ROW_NUMBER() OVER (
           PARTITION BY d."hospitalId", d."aggregateType", d."aggregateId"
           ORDER BY d."createdAt" ASC, d."id" ASC
         ) AS "newSeq"
  FROM duplicate_occurrences d
  WHERE d."occ" > 1
),
resequenced AS (
  UPDATE "NxEventLog" e
  SET "seq" = p."newSeq"
  FROM plan p
  WHERE e."id" = p."id"
  RETURNING e."id"
)
SELECT COUNT(*) AS resequenced_event_logs FROM resequenced;

-- ------------------------------------------------------------
-- DATA REPAIR + GUARD (E): HospitalAppointment double-booking.
-- If two ACTIVE appointments (status NOT IN cancelled/no_show)
-- share the same doctorId + exact date timestamp, cancel all but
-- the smallest id, then create the partial unique index that the
-- Prisma schema cannot express.
-- ------------------------------------------------------------
WITH active_dupes AS (
  SELECT "id"
  FROM (
    SELECT ha."id",
           ROW_NUMBER() OVER (
             PARTITION BY ha."doctorId", ha."date"
             ORDER BY ha."id" ASC
           ) AS rn
    FROM "HospitalAppointment" ha
    WHERE ha."status" NOT IN ('cancelled', 'no_show')
  ) ranked
  WHERE rn > 1
),
cancelled AS (
  UPDATE "HospitalAppointment" ha
  SET "status" = 'cancelled'
  FROM active_dupes d
  WHERE ha."id" = d."id"
  RETURNING ha."id"
)
SELECT COUNT(*) AS cancelled_double_bookings FROM cancelled;

-- Double-booking guard: one ACTIVE appointment per doctor + exact
-- date timestamp (Prisma cannot express partial indexes).
CREATE UNIQUE INDEX "hospitalappointment_doctor_active_slot_key"
  ON "HospitalAppointment"("doctorId", "date")
  WHERE status NOT IN ('cancelled', 'no_show');

-- DropForeignKey
ALTER TABLE "NxAuditEvent" DROP CONSTRAINT "NxAuditEvent_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "NxEventLog" DROP CONSTRAINT "NxEventLog_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "NxTimestampBlock" DROP CONSTRAINT "NxTimestampBlock_hospitalId_fkey";

-- DropIndex
DROP INDEX "NxEventLog_hospitalId_aggregateType_aggregateId_seq_idx";

-- CreateIndex
CREATE INDEX "ClinicalNote_appointmentId_idx" ON "ClinicalNote"("appointmentId");

-- CreateIndex
CREATE INDEX "ClinicalNote_doctorId_idx" ON "ClinicalNote"("doctorId");

-- CreateIndex
CREATE INDEX "HospitalAdmission_admittingDoctorId_idx" ON "HospitalAdmission"("admittingDoctorId");

-- CreateIndex
CREATE INDEX "HospitalAdmission_wardId_idx" ON "HospitalAdmission"("wardId");

-- CreateIndex
CREATE INDEX "HospitalBill_admissionId_idx" ON "HospitalBill"("admissionId");

-- CreateIndex
CREATE INDEX "HospitalBill_appointmentId_idx" ON "HospitalBill"("appointmentId");

-- CreateIndex
CREATE INDEX "HospitalOrder_admissionId_idx" ON "HospitalOrder"("admissionId");

-- CreateIndex
CREATE INDEX "HospitalOrder_appointmentId_idx" ON "HospitalOrder"("appointmentId");

-- CreateIndex
CREATE INDEX "HospitalOrder_orderingDoctorId_idx" ON "HospitalOrder"("orderingDoctorId");

-- CreateIndex
CREATE INDEX "HospitalPrescription_prescribingDoctorId_idx" ON "HospitalPrescription"("prescribingDoctorId");

-- CreateIndex
CREATE INDEX "HospitalVital_appointmentId_idx" ON "HospitalVital"("appointmentId");

-- CreateIndex
CREATE INDEX "HospitalVital_recordedByStaffId_idx" ON "HospitalVital"("recordedByStaffId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_admissionId_idx" ON "InsuranceClaim"("admissionId");

-- CreateIndex
CREATE INDEX "LabResult_reportedByStaffId_idx" ON "LabResult"("reportedByStaffId");

-- CreateIndex
CREATE INDEX "NxAiFeedback_hospitalId_idx" ON "NxAiFeedback"("hospitalId");

-- CreateIndex
CREATE INDEX "NxDicomStudy_hospitalId_idx" ON "NxDicomStudy"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "nxeventlog_aggregate_seq_key" ON "NxEventLog"("hospitalId", "aggregateType", "aggregateId", "seq");

-- CreateIndex
CREATE INDEX "NxGenomicProfile_hospitalId_idx" ON "NxGenomicProfile"("hospitalId");

-- CreateIndex
CREATE INDEX "NxJourneyAnnotation_hospitalId_idx" ON "NxJourneyAnnotation"("hospitalId");

-- CreateIndex
CREATE INDEX "NxPathwayRun_defId_idx" ON "NxPathwayRun"("defId");

-- CreateIndex
CREATE INDEX "NxShiftAssignment_staffUserId_idx" ON "NxShiftAssignment"("staffUserId");

-- CreateIndex
CREATE INDEX "NxVerifiableCredential_hospitalId_idx" ON "NxVerifiableCredential"("hospitalId");

-- CreateIndex
CREATE INDEX "NxWearableDevice_hospitalId_idx" ON "NxWearableDevice"("hospitalId");

-- CreateIndex
CREATE INDEX "OTSurgery_patientId_idx" ON "OTSurgery"("patientId");

-- CreateIndex
CREATE INDEX "OTSurgery_admissionId_idx" ON "OTSurgery"("admissionId");

-- CreateIndex
CREATE INDEX "OTSurgery_surgeonId_idx" ON "OTSurgery"("surgeonId");

-- CreateIndex
CREATE INDEX "OTSurgery_anesthetistId_idx" ON "OTSurgery"("anesthetistId");

-- CreateIndex
CREATE INDEX "PortalUser_familyHeadId_idx" ON "PortalUser"("familyHeadId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBatch_branchId_productId_batchNo_key" ON "ProductBatch"("branchId", "productId", "batchNo");

-- CreateIndex
CREATE INDEX "PurchaseItem_productId_idx" ON "PurchaseItem"("productId");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- CreateIndex
CREATE INDEX "Sale_staffId_idx" ON "Sale"("staffId");

-- CreateIndex
CREATE INDEX "SaleItem_batchId_idx" ON "SaleItem"("batchId");

-- AddForeignKey
ALTER TABLE "NxAuditEvent" ADD CONSTRAINT "NxAuditEvent_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxTimestampBlock" ADD CONSTRAINT "NxTimestampBlock_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NxEventLog" ADD CONSTRAINT "NxEventLog_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

