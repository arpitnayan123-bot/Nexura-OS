-- ============================================================
-- Migration: tourism_money_cents (tourism-money-1)
--
-- The tourism/global desk was the last money domain still on Float:
--   TourismProcedure.priceUSD        Float  -> priceUSDCents        Int
--   TourismInquiry.estimatedCostUSD  Float? -> estimatedCostUSDCents Int?
--   TourismInquiry.estimatedCostINR  Float? -> estimatedCostINRPaise Int?
--   TourismInquiry.totalBilledUSD    Float? -> totalBilledUSDCents   Int?
-- Conversion preserves every existing row: x100 rounded to the minor
-- unit (RENAME + ALTER USING — no data loss, unlike a diff DROP+ADD).
-- Exchange-rate columns/fields (usdInrRate) stay float: rates, not money.
-- Wire format (API responses) keeps major units via src/lib/money.ts.
-- ============================================================

ALTER TABLE "TourismProcedure" RENAME COLUMN "priceUSD" TO "priceUSDCents";
ALTER TABLE "TourismProcedure" ALTER COLUMN "priceUSDCents" TYPE INTEGER USING round("priceUSDCents"::numeric * 100)::int;

ALTER TABLE "TourismInquiry" RENAME COLUMN "estimatedCostUSD" TO "estimatedCostUSDCents";
ALTER TABLE "TourismInquiry" ALTER COLUMN "estimatedCostUSDCents" TYPE INTEGER USING round("estimatedCostUSDCents"::numeric * 100)::int;

ALTER TABLE "TourismInquiry" RENAME COLUMN "estimatedCostINR" TO "estimatedCostINRPaise";
ALTER TABLE "TourismInquiry" ALTER COLUMN "estimatedCostINRPaise" TYPE INTEGER USING round("estimatedCostINRPaise"::numeric * 100)::int;

ALTER TABLE "TourismInquiry" RENAME COLUMN "totalBilledUSD" TO "totalBilledUSDCents";
ALTER TABLE "TourismInquiry" ALTER COLUMN "totalBilledUSDCents" TYPE INTEGER USING round("totalBilledUSDCents"::numeric * 100)::int;
