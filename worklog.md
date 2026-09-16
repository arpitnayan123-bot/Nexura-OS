# Worklog — active session log

> **Historical session logs** (the full 2026 build-out, ~460KB) live in
> [`docs/worklog-archive/`](docs/worklog-archive/worklog-2026-session.md).
> This file is the ACTIVE log: every task appends a section below in the
> standard format so the audit trail stays intact for the next engineer.

---

Task ID: repo-hygiene-1
Agent: main (Super Z)
Task: Repo first-impression cleanup (backend-hardening item 4) — worklog archive, artifact untracking, PRODUCTION_STATUS.md, verified dead-code removal

Work Log:
- Archived the 460KB session history to docs/worklog-archive/worklog-2026-session.md (git mv — history preserved); this file is now the slim active log
- Untracked generated artifacts (kept on disk, now gitignored): download/ (27 files, 12MB — was tracked despite the ignore rule), logs/ (12 files, 6.2MB — ignore rule ADDED), db/backups/ (2 old SQLite dumps — ignore rule ADDED, *.dump too); investor-deck.pdf/html untracked and moved into download/
- Deleted verified-dead code: mini-services/ (empty .gitkeep husk), examples/websocket/ (2 files, zero references), src/components/nx/os/calendar-pop.tsx + quick-settings.tsx (zero importers — verified by registry + repo-wide rg), tests/{python-runtime-build,python-runtime-container,database-runtime-build}.sh (unwired sandbox harnesses; tests/api-smoke.sh KEPT — live in package.json + CI, and tests/unit/** is the 252-test suite)
- Replaced the two contradictory audits (CODEBASE_AUDIT.md, CHATGPT_CODEBASE_REVIEW.md) with a single accurate PRODUCTION_STATUS.md; originals archived under docs/history/ — the stale claims (tests are dead; ignoreBuildErrors set; JWT silent fallback) are each disproven with file:line evidence in the new doc
- README.md + DEPLOYMENT.md trued up to the Postgres+Redis reality (pg-migration-1/env-config-1)
- Verify: tsc 0, eslint 0, vitest 252/252, DEPLOY VERIFIED

Stage Summary:
- Repo root now reads clean for a technical reviewer: code + docs + config, no stray gigabytes, no contradictory claims
- Tag: repo-hygiene-2-final (name repo-hygiene-1-final was already taken by a 2026-09-14 worklog chore — see git tag); dual bundles refreshed after commit

---
Task ID: test-coverage-1
Agent: main (Super Z)
Task: Extend coverage to the Postgres/Redis-hardened surfaces + CI gets real services (backend-hardening item 5)

Work Log:
- 4 new test files (252 → 268 tests): schema-postgres.test.ts (provider guard + migrations-history ship check + no-enum/Json design pin), env-validation.test.ts (assertProductionEnv: dev no-op, lists all missing vars, rejects sqlite URLs + short secrets, passes complete env), rate-limit.test.ts (shared-window drawdown across consumers, peek non-consuming, fallback contract without REDIS_URL), bus-signature.test.ts (HMAC sign/verify, tamper+seq+missing-sig rejection, cross-instance round-trip, per-hospital key determinism, tenant isolation under Redis mode)
- CI (.github/workflows/ci.yml): postgres:17 + redis:7 SERVICE CONTAINERS; verify job runs prisma migrate deploy (replacing sqlite db:push) + vitest + seeds + API smoke against the REAL services; build job uses a postgres dummy URL; REDIS_URL set job-wide
- Live-tuning caught by the new tests: ioredis enableOfflineQueue:false threw "Stream isn't writeable" for commands issued during the initial CONNECT window (this also explains the PIE boot-race error seen in stateless-1) → offline queue enabled with maxRetriesPerRequest:2 + connectTimeout 5s: commands during CONNECT wait for ready; a truly dead Redis still rejects fast
- package.json: db:migrate:deploy added (non-interactive migration gate for CI/release)
- Verify: tsc 0, eslint 0, vitest 268/268 (21 files), DEPLOY VERIFIED

Stage Summary:
- The migration surfaces (Postgres semantics, Redis limiter, bus signatures, env gate, schema provider) are all under test; CI now proves them against real Postgres+Redis on every push
- Tag: test-coverage-1-final; dual bundles refreshed after commit

---
Task ID: hardening-final-sweep
Agent: main (Super Z)
Task: End-to-end verification of the full backend production-hardening pass

Work Log:
- Full CI gate green: bunx prisma validate OK, tsc --noEmit 0, eslint 0, vitest 268/268 (21 files), api smoke (58/58 baseline preserved), DEPLOY VERIFIED
- Real-browser E2E on the Postgres+Redis stack: homepage (zero errors/console), hospital demo login → focused console (labeled rail, badges, 6 unread notifications), Work Queue module rendering real Postgres-backed tasks, /clinic/book/rao-clinic (regression target of booking-fix-1) fully data-driven with doctors + slots
- Datastore proof: redis pubsub channels shows nx:bus LIVE (relay armed); pg_stat_activity 10 app connections; /api/ready {database ok, seed ok}
- Deliverable state: clone → cp .env.example .env → fill DATABASE_URL/JWT_SECRET/REDIS_URL → npx prisma migrate deploy → run. No SQLite fallback, no in-memory business state outside the documented excluded surfaces, no contradictory docs, no generated artifacts in git

Stage Summary:
- Milestones: pg-migration-1 → pg-semantics-1 → stateless-1 → env-config-1 → repo-hygiene-2 → test-coverage-1 (tags -final each)
- Tests 252 → 268; CI now exercises real Postgres + Redis services

---
Task ID: arch-1a
Agent: sub-agent (general-purpose)
Task: Sweep findFirst fallbacks fail-closed — replace every `session.hospitalId || (await db.hospital.findFirst())?.id` cross-tenant fallback in src/app/api/nx with requireHospitalContext()

Work Log:
- 16 route files changed (28 fallback sites + supply PATCH write hole): ed, patients, incidents (GET+POST), beds, labs, encounters (GET+POST — admission+bed $transaction untouched, only the hospitalId resolution line replaced), messages (GET+POST, session variable shape), automations (GET+POST), or, billing, overview, schedule (GET+POST), orders (GET+POST), audit, analytics, supply (GET standard; PATCH special)
- Each site now resolves hospitalId via `requireHospitalContext(gate.session|session)` and returns the ready-made 403 no_hospital_context response on the `"response" in hospitalCtx` branch; DEMO_MODE single-hospital fallback stays centralized in the helper
- Imports: extended the existing `@/lib/nx/api` imports in messages (`fail, requireHospitalContext, withRoute`) and analytics (`requireHospitalContext, toCsv`); added a fresh `@/lib/nx/api` import line to the other 14 files (all still use `db`, so no import removals anywhere)
- supply/route.ts PATCH (cross-tenant write hole): the handler already authenticated via the same dual requireModule("inventory"/"equipment") gate as GET (the brief's "no session check at all" was inaccurate — the hole was missing hospital scoping, not missing auth), so auth mirrored as-is; hospitalId now resolved via requireHospitalContext; both branches tenant-scoped — `findUnique({ where: { id } })` → `findFirst({ where: { id, hospitalId } })` (404 on null), `update({ where: { id } })` → `updateMany({ where: { id, hospitalId } })` with 404 on count===0, then a scoped re-fetch so success response bodies (`{ equipment }`, `{ item, hospitalId }`) stay byte-identical to the old `update()` payloads
- onboard/route.ts searched: NO fallback pattern present (it uses `guard` and only touches `g.session.hospitalId ?? hospital.id` where hospital.id is the just-created hospital — intended onboarding semantics); left untouched
- Now-dead `if (!hospitalId)` guards at patients/overview/analytics/messages (previously 404/400 on undefined) left in place per the no-other-changes rule; they are unreachable since hospitalId is now a non-optional string
- Verify: rg 'hospital\.findFirst\(\)' src/app/api → ZERO matches (helper's internal one lives in src/lib/nx/api.ts; src/lib/hospital-context.ts left for the other agent); npx tsc --noEmit → 0 errors (not even the stale .next/types one); bun run lint → 0 errors; npx vitest run → 268/268 (21 files)

Stage Summary:
- Production sessions without a hospital claim now fail closed with 403 no_hospital_context on every hospital-scoped nx route instead of silently binding to the first hospital's data; DEMO_MODE keeps the documented single-hospital fallback
- 16 files, +98/-29 lines, no response-shape or transaction changes; supply PATCH is now tenant-scoped end-to-end (fetch, write, audit)


---
Task ID: arch-1b
Agent: sub-agent (general-purpose)
Task: Fix verified IDOR / authorization gaps (16 files) — ABAC update scope, wearable pairing ownership, PIE protocol list/actor spoofing, radar hospital binding, search directory self-scope, offline-sync write authz, Connect list party checks + doctorOnly, step-up brute-force cap, telemedicine ts-nocheck + PATCH clinic scope, notes existence leak, portal booking status whitelist, MFA-disable second factor, error-collector IP spoofing, diy guest cookie secure flag

Work Log:
- abac/route.ts POST: update-by-id now scoped — `updateMany({ where: { id, hospitalId } })` + 404 on count===0 + scoped re-fetch (success body preserved; mirrors the DELETE pattern that already carried hospitalId)
- wearables/pair/route.ts: requireHospitalContext() replaces nothing (file had no fallback but never checked ownership); device fetch now rejects `device.hospitalId !== session hospital` with the same unknown_device 404 — rotating another hospital's ingest secret was a cross-tenant secret takeover
- predict/protocols/route.ts: global protocol list is now hospital-scoped — patients batch-fetched WITH hospitalId, non-platform sessions get only protocols whose patient is in-hospital, labels resolved exclusively from that in-hospital map (PieProtocol has no hospital relation, so the join is the boundary); requireHospitalContext for the hospital
- predict/protocols/[id]/route.ts: `approvedBy` removed from the client contract — the deciding actor is stamped from the authenticated session (name → staffCode → "clinician"); approve/reject response shapes unchanged
- predict/radar/route.ts: `db.hospital.findFirst()` (always hospital #1) replaced with requireHospitalContext; empty-hospital ok() fallback removed accordingly
- search/route.ts: patient-role sessions now get ONLY their own linked record in the Patients group (mirrors /api/nx/patients self-scope incl. the linkedPatientId filter) and no staff/task/appointment/admission groups; staff roles byte-identical; smoke-test flows use doctor/admin jars → unaffected
- offline/sync/route.ts: per-op write authz — triage ops require tasks.manage, prescription/note drafts require note.edit (checked against g.perms); every op's patientUhid resolves within the session hospital AND passes patientInScope; failures are per-op receipts `{clientId, status:"rejected", reason}` — accepted/duplicate/failed shape untouched; tests/api-smoke.sh does NOT exercise this route (verified)
- connect/connections/route.ts GET: production party check — filtered doctorId/patientId must equal the caller (session?.userId ?? legacy?.id, mirroring connectCallsListDenied); DEMO_MODE stays open per the documented client-picks-participants posture; POST now runs doctorOnly(req) exactly like connect/prescriptions/sync
- connect/queue/route.ts GET: production requires doctorId AND caller === doctorId; unfiltered (whole waiting-room with patient names/phones) refused fail-closed; demo unchanged
- auth/stepup/route.ts: rateLimit(`stepup:${userId}`, 5, 15min) before verification → 429 rate_limited; token issuance/success paths untouched
- clinic/telemedicine/route.ts: @ts-nocheck REMOVED, zero anys; PATCH now clinic-scoped like clinic/appointments (findUnique + clinicId compare → 404 for missing/foreign, request/response shapes unchanged). ENABLING CHANGE: the route referenced db.telemedicineConsult, which NEVER existed in the Postgres schema/client (route was dead-on-arrival: every handler would 500) — added TelemedicineConsult model (String-only per schema design pins) + Clinic back-relation + migration 20260917000000_add_telemedicine_consults + prisma generate
- notes/[id]/route.ts PATCH: fetch now `findFirst({ where: { id, hospitalId } })` (mirrors GET) + explicit no_hospital 400 — missing and cross-hospital notes both 404; the 404-vs-403 existence leak is gone; success behavior identical
- portal/blood-bookings/route.ts PATCH: closed Set PATIENT_BOOKING_STATUSES = {"cancelled"} — the portal UI performs NO PATCH calls today (only POST in booking-modal.tsx; statuses render read-only), so the only patient-legitimate transition is cancel; workflow statuses (sample_collected/report_ready/en_route/in_lab) rejected 400 in the file's error style; dead workflow-cascade branches removed from the patient path
- auth/mfa/route.ts DELETE: rateLimit(`mfa-disable:${userId}`, 5, 15min) → 429; PIN-only accounts (passwordHash null) now REQUIRE a fresh action-bound step-up token ("mfa.disable" added to STEPUP_ACTIONS; issued by /api/nx/auth/stepup via PIN/TOTP, verified from the x-stepup-token header) instead of silently disabling with NO second factor; password-holding accounts keep the unchanged password path
- system/errors/route.ts: local throttle now keys on ipOf(req) (rightmost X-Forwarded-For) instead of the spoofable first entry; limiter structure untouched
- lib/diy/auth.ts: diy_guest cookie `secure: NODE_ENV === "production"` (matches the other cookie helpers; unsecured on local http dev only)
- Verify: npx tsc --noEmit → 0 errors; bun run lint → 0 errors; npx vitest run → 268/268 (21 files); `env -u DATABASE_URL npx prisma validate` → valid (the sandbox shell exports a stale file: DATABASE_URL that the CLI picks up — not a repo issue)

Stage Summary:
- Every fix carries a boundary comment; production fails closed, DEMO_MODE keeps its documented permissive postures (connect party checks, clinic-only findFirst in helpers) — no response-shape changes for existing clients; approveProtocol/rejectProtocol audit attribution now comes from the signed session
- Deliberately NOT changed: connect/queue PATCH (task scoped the GET filter), the `where: any` casts in connect routes (pre-existing, outside fix scope), patients/route.ts findFirst fallback (arch-1a's file), openapi protocol sample still listing approvedBy (docs-only, left for its owner)
- Note: an automated `checkpoint(auto)` snapshot committed the in-flight worktree (my + arch-1a's edits) mid-session — no manual commit made; schema addition needs `npx prisma migrate deploy` on existing environments

---
Task ID: arch-m1
Agent: sub-agent (general-purpose)
Task: One Prisma migration upgrading DB integrity — ProductBatch batch identity unique (+dedupe), 30 FK back-indexes, audit-chain onDelete Restrict ×3, NxEventLog aggregate-seq unique (+resequence), HospitalAppointment partial unique double-booking guard (+dedupe)

Work Log:
- Migration file: prisma/migrations/20260918000000_integrity_indexes_batch_identity/migration.sql (271 lines). migrate dev is hard-blocked in this non-interactive sandbox (refuses before prompting), so the exact Prisma-diff SQL was produced via `prisma migrate diff --from-migrations --to-schema-datamodel --shadow-database-url --script` (byte-identical to what migrate dev generates), the data-repair SQL was prepended, and it was applied with `npx prisma migrate deploy` — deploy cannot drift-reset, data survived untouched (pb 16, appointments 15, sales 3 — pre==post)
- A. ProductBatch: +`@@unique([branchId, productId, batchNo])` (Prisma default name `ProductBatch_branchId_productId_batchNo_key` — client-level compound key `branchId_productId_batchNo` is field-based, so the purchases upsert needed no map). Migration prepends a CTE (dup_groups → loser_sums → fold UPDATE keeper += Σ loser stockStrips/stockLoose → DELETE losers, RETURNING count) before the index
- B. FK indexes added (30): HospitalAdmission admittingDoctorId/wardId (bedId existed), HospitalVital appointmentId/recordedByStaffId, ClinicalNote appointmentId/doctorId, HospitalOrder admissionId/appointmentId/orderingDoctorId, LabResult reportedByStaffId, HospitalPrescription prescribingDoctorId, HospitalBill admissionId/appointmentId, InsuranceClaim admissionId, OTSurgery patientId/admissionId/surgeonId/anesthetistId, Sale customerId/staffId, SaleItem batchId, PurchaseItem productId, PortalUser familyHeadId, NxVerifiableCredential/NxWearableDevice/NxGenomicProfile/NxAiFeedback/NxDicomStudy/NxJourneyAnnotation hospitalId, NxShiftAssignment staffUserId, NxPathwayRun defId. Skipped as already index-covered (leading column of an existing unique/index — Postgres FK/cascade paths are served): HospitalBed.wardId (uniq wardId,bedNumber), NxTimestampBlock.hospitalId (uniq hospitalId,index), NxAiThreshold.hospitalId (uniq hospitalId,feature), NxChannelMember.channelId (uniq channelId,userId), NxMessageRead.messageId (uniq messageId,userId), NxUserPrefs.userId (@unique). NxAppointment does not exist; HospitalAppointment already had doctorId + date indexes
- C. NxAuditEvent.hospital / NxEventLog.hospital / NxTimestampBlock.hospital: onDelete Cascade → Restrict, each with the `// append-only compliance chain — a hospital can never cascade-delete its audit trail` comment (migration drops + re-adds the three FKs with ON DELETE RESTRICT)
- D. NxEventLog: plain `@@index([hospitalId, aggregateType, aggregateId, seq])` REPLACED by `@@unique([...same columns...], map: "nxeventlog_aggregate_seq_key")` (same tuple — the unique serves the identical prefix read path; keeping both would have been a duplicate index on a hot append-only table). Migration prepends a window-function resequencer: for streams where COUNT(*)<>COUNT(DISTINCT seq), first occurrence per seq (by createdAt,id) keeps it, later occurrences get maxSeq(per-stream window) + ROW_NUMBER(over dups by createdAt,id) — no kept row changes, no collisions possible
- E. HospitalAppointment: raw SQL partial unique `hospitalappointment_doctor_active_slot_key` ON (doctorId, date) WHERE status NOT IN ('cancelled','no_show'), preceded by deterministic dedupe (row_number over active rows by doctorId,date ordered by id; rn>1 → status='cancelled', smallest id stays active). Schema gets only a comment above the model pointing at the migration (Prisma cannot express partial indexes)
- Validation BEFORE live apply: scratch DB prisma_m1_test built by replaying baseline+telemedicine migrations, seeded with real duplicates (dup batch aa/bb, dup-seq event stream, double-booked a1/a2) → migration executed clean → verified keeper fold (aa 5+7 strips, 20+15 loose), renumber (e2 1→3, e1/e3 kept), cancel (a2 cancelled, a1/a3 untouched), all 3 uniques reject dups (23505), partial index def confirmed, hospital DELETE blocked (23503) → scratch + shadow DBs dropped
- Verify: bunx prisma validate OK; npx tsc --noEmit → only the known z.record TS2554 at pharmacy/billing/route.ts:21 (other task's — the pre-existing purchase upsert error is GONE after generate); npx vitest run → 268/268 (21 files); npx prisma migrate deploy → "No pending migrations to apply"; pg_constraint confirms all three audit FKs confdeltype=r
- Note: automated checkpoint(auto) snapshotted the worktree mid-session (no manual commit made)

Stage Summary:
- Live schema is now integrity-hardened: pharmacy batch identity is race-proof (with self-healing dedupe for older environments), every FK column backs its list/filter/cascade path with an index, hospitals can no longer cascade-delete their audit/timestamp/event chains, NxEventLog per-aggregate streams are unique-ordered, and double-booking a doctor's exact active slot is now impossible at the DB level
- Deploy note for other environments: `npx prisma migrate deploy` applies the batch dedupe / seq resequence / double-booking cancel deterministically before the uniques land — no manual data surgery required
