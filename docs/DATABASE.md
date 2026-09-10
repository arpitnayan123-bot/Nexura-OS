# Database — Nexura Hospital OS

SQLite via Prisma (109 tables). Production path: change `datasource db` provider
to `postgresql` in `prisma/schema.prisma`, set `DATABASE_URL`, `bunx prisma migrate deploy`.

## Model groups

**Platform:** NxOrganization, NxDepartment, NxStaffUser, NxSessionRecord,
NxLoginAttempt, NxUserRoleAssignment, NxPermissionGrant, NxDelegation,
NxBreakGlassEvent, NxFeatureFlag, NxSystemStatus, NxUserPrefs, NxIdempotency

**Clinical:** HospitalPatient, HospitalAdmission, HospitalAppointment (+Waitlist,
+Event), HospitalVital, ClinicalNote + NxNoteVersion (immutable history),
NxConsent, HospitalOrder, LabResult (verification workflow), NxImagingReport,
HospitalPrescription, NxMedicationAdministration (MAR)

**Operations:** HospitalWard, HospitalBed (8-state lifecycle), NxTask (+Comment,
+View), NxIncident, NxMessage (+Read), NxChannel (+Member), NxAutomationRule,
NxWorkflowRun, NxEquipment, NxSupplyItem, NxStockTxn, NxVendor, NxPurchaseOrder,
NxCredential, NxShiftAssignment

**Financial:** HospitalBill, NxCharge, NxPayment (idempotent writes, refunds),
InsuranceClaim

**Platform services:** NxNotification, NxFileObject, NxAuditEvent (hash chain),
NxOrderEvent, NxIntegrationEvent, NxWebhookDelivery, NxAIInteraction

## Conventions

- Every hospital-scoped table carries `hospitalId` (+index) — tenant isolation.
- `createdAt/updatedAt` everywhere; actor attribution columns (`createdBy`,
  `actorName`, `receivedBy`, …) on state-changing tables.
- Soft-deletion only where meaningful (revoke/tombstone patterns like
  `revokedAt`, `archivedAt`, `withdrawnAt`); clinical/financial rows are never
  hard-deleted.
- JSON-in-string columns are documented on the field (SQLite has no JSON type).

## Migrations & seeds

```bash
bunx prisma db push        # dev: sync schema
bunx prisma migrate dev    # create versioned migration
bun run seed:demo          # scripts/seed-nx-v4.ts (idempotent)
```

## Retention & backup

Retention policy is configuration + process, not code: audit events are
append-only by design; chat channels carry `retentionDays` (enforce with a cron
job — documented in KNOWN_LIMITATIONS). Backup: `sqlite3 db/custom.db
".backup backup.db"` on a stopped server or Litestream in production; see
DEPLOYMENT.md.
