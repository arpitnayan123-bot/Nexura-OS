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

---
Task ID: arch-api-1a
Agent: sub-agent (general-purpose)
Task: Sanitize err.message leaks in API routes — every catch that returned `detail: <raw err.message>` in clinic/pharmacy/connect/portal (except portal/auth)/know-your-health/assistant/global/appointments now logs server-side and returns an operation-specific user-safe sentence; console.* in those route files converted to the structured logger; silent swallowing catches given log visibility

Work Log:
- 59 route files changed across the 8 assigned modules; 67 client-facing `detail: message` leak sites fixed (clinic 18, pharmacy 20, connect 12, know-your-health 16, assistant 1) — each now: `log.error("<subsystem>", "<event>_failed", { err: err instanceof Error ? err.message : String(err) })` + SAME error code + SAME HTTP status + short user-safe detail (e.g. "The consultation could not be updated. Please retry."), no Prisma/connection/table words
- Already-correct sites left byte-identical: clinic/booking (2), pharmacy/purchases POST + returns POST + billing sale (log.error + safe detail already), appointments POST (log.error + server_error), portal/auth (DO-NOT-TOUCH, untouched)
- console.* conversion (item 2): 7 sites in portal — family POST, family/invite/accept POST, ai-interpret outer + LLM-fallback (→ log.warn, degrades to rule-based), dashboard GET, blood-bookings POST+PATCH; no other console.* existed in the scoped routes (verified by rg)
- Silent-catch visibility (item 3, response shapes untouched): appointments GET zeroed-counts swallow → log.error("api", "appointments.stats_failed"); bare GET catches in pharmacy purchases/returns/billing → catch (err) + log.error with their existing safe details; global GET/POST bare catches → log.error ("global_get_failed"/"inquiry_failed", codes unchanged); global usdInrRate fallback → log.warn("global", "fx_rate_fallback") (constant fallback kept); pharmacy voice-bill LLM-parse fallback → log.warn (graceful control flow kept)
- `import { log } from "@/lib/logger"` added once per changed file (reused where already present); subsystems: "clinic" | "pharmacy" | "connect" | "portal" | "kyh" | "global" | "assistant" (appointments keeps its existing "api" style); no new any, no success-shape changes, nx/** and tests/** untouched
- Verify: npx tsc --noEmit → 0 errors; bun run lint → 0 errors; npx vitest run → 268/268 (21 files); rg audit: `detail: message`/`detail: e.message` → ZERO matches in the 8 modules; console.(log|error|warn|info) → ZERO matches in the 8 modules; every remaining `instanceof Error` hit (63 lines incl. portal/auth) is inside a log.* meta object — zero client-facing detail usages

Stage Summary:
- Client error bodies in the product-facing API surface no longer carry internal error strings (Prisma/SDK messages with connection or schema detail can't leak); the real cause goes to the PHI-redacting structured logger, frontends keep matching on the unchanged error codes/statuses
- 59 files, +151/-105 lines (shared worktree with the concurrent nx/** agent); no manual git commit made

---
Task ID: arch-api-1b
Agent: sub-agent (general-purpose)
Task: Wrap every legacy bare nx/diy/misc route handler in the canonical `withRoute` wrapper (src/lib/nx/api.ts) so unexpected throws become safe JSON 500 `fail("internal")` instead of Next's HTML 500 — without changing any response body, status, or guard logic

Work Log:
- 39 route files wrapped (64 exported handlers; 5 carry the dynamic generic, e.g. `withRoute<{ id: string }>`): every `export async function VERB(...)` became `export const VERB = withRoute("name", async (...) => { ...body byte-identical... })`; module-scoped lowercase dot names unique per method (full list below)
- nx modules (16 files): encounters (nx.encounters.list/create/transition), ed (nx.ed.board/triage), overview (nx.overview.command-center), patients (nx.patients.list), patients/[id] (withRoute<{id:string}> nx.patients.detail), schedule (nx.schedule.list/book/transition), beds (nx.beds.board/lifecycle/reserve), labs (nx.labs.queue/result), orders (nx.orders.list/create/transition), billing (nx.billing.revenue), analytics (nx.analytics.metrics), incidents (nx.incidents.list/report/transition), supply (nx.supply.inventory/adjust), pharmacy (nx.pharmacy.queue/dispense), or (nx.or.schedule/update), automations (nx.automations.list/toggle/testfire)
- nx misc (8 files): ai (nx.ai.run — its inner try/catch safe-500 kept, withRoute wraps it), audit (nx.audit.trail), foresight/data (nx.foresight.data.wipe), foresight/history (nx.foresight.history), foresight/run (nx.foresight.run), foresight/run/[id] (withRoute<{id:string}> nx.foresight.run.detail), openapi (nx.openapi), workspace (nx.workspace.role)
- diy (12 files, own _lib guard kept untouched — withRoute sits outside it): checkin (diy.checkin.post), consent (diy.consent.list/grant/withdraw), dashboard (diy.dashboard.get), generate (diy.generate.post), goals (diy.goals.list/batch), goals/[id] (withRoute<{id:string}> diy.goal.action), me (diy.me.export/wipe), parse (diy.parse.post), progress (diy.progress.upsert/list), session (diy.session.mode/guest), skincare (diy.skincare.routine/event), tasks/[id] (withRoute<{id:string}> diy.task.complete/undo)
- outside nx: health (health.liveness), api root (root.hello), health-stats (health-stats.metrics — the brief's "health-stats/route.ts" exists only at src/app/api/health-stats/, not under nx/)
- imports: extended existing `@/lib/nx/api` imports where present (encounters, ed, overview, patients, analytics, supply, or, automations, audit, session-diy, patients/[id] via new line); fresh single-import lines elsewhere; `runtime`/`dynamic`/`maxDuration` export lines untouched and outside the wrappers; requireHospitalContext/requireModule/guard bodies untouched (their NextResponse errors flow through withRoute unchanged); handler names verified globally unique (rg count=1 each)
- Skips (3, with reasons): nx/stream/route.ts — SSE long-lived stream must not sit in the request-scoped wrapper (rate-limit/log/500 conversion would corrupt the stream contract); nx/system/errors/route.ts — already has its own withOk wrapper style per brief; nx/bio/[deviceId]/route.ts — pure `export { POST, GET } from "../../predict/bio/[deviceId]/route"` re-export of an ALREADY-wrapped handler (wrapping a re-export would double-wrap)
- Note: automated checkpoint(auto) committed the in-flight worktree (my 16 module-route edits + the parallel agent's clinic/connect/pharmacy edits) at 16:34 — no manual commit made
- Verify: npx tsc --noEmit → 0 errors; bun run lint → 0 errors; npx vitest run → 268/268 (21 files); residue check `rg -l withRoute` complement over src/app/api/nx → only the 3 documented skips remain

Stage Summary:
- Every remaining legacy nx/diy/misc handler now sits behind the canonical wrapper: correlation ID reuse, default 300/min/IP rate limit, one structured latency+status log line, x-request-id response header, and uncaught exceptions return JSON `fail("internal", 500)` — successful and guarded-error responses are byte-identical to before
- 39 files, +169/-105 lines; no response-shape, status, or guard changes; next agent should re-verify with a fresh `npx vitest run` after the concurrent tests/ edits land


---
Task ID: arch-ai-1
Agent: sub-agent (general-purpose)
Task: Rewire the six routes that bypassed the canonical AI client (src/lib/openrouter.ts) by importing z-ai-web-dev-sdk directly — all text/vision LLM calls now flow through the canonical client; contracts, auth (aiGate/withProductAuth), validation, rate limiting, and fallback behaviors untouched

Work Log:
- openrouter.ts: two new exports alongside runText/runVision, both reusing the private callOR helper (same provider order, one-shot z-ai fallback, 45s timeout): runChatText(messages: {role: "user"|"assistant"|"system"; content: string}[]) → raw string, multi-turn passthrough (callZAI's system→assistant mapping applies on the SDK path, so the SDK sees the exact same roles the routes used to send); runTextRaw(prompt, systemInstruction?) → raw string with no parseJson, for prose/markdown outputs. Header comment now documents the ASR capability gap
- assistant: multi-turn conversation preserved via runChatText([{role:"system",content:SYSTEM_PROMPT}, ...conversation]) — the SDK convention of sending the system prompt as role "assistant" becomes a proper "system" (mapped back to "assistant" by callZAI, identical SDK behavior); route keeps its own .trim() + empty-check 502
- pharmacy/ai-query: DEVIATION from the brief (runText → runTextRaw), reasoned: the route returns free-text prose (2-3 sentences; client reports.tsx renders d.text as a string), so runText's parseJson would throw on every successful answer and 500 the route; runTextRaw keeps { text, query } byte-identical incl. the "No data found" fallback. System string hoisted to a module-level SYSTEM_PROMPT verbatim
- pharmacy/prescription-ocr: runVision(raw, mimeType, SYSTEM_PROMPT) replaces the typed createVision call; magic-byte sniffing kept EXACTLY (iVBOR→image/png, /9j/→image/jpeg, else 415 unsupported_mime) — only the dataUrl string building moved inside runVision. The client's parseJson replaces the route's brace-slicing: SyntaxError (unparseable model output) → graceful empty extraction with log.warn (same 200 {items:[],notes:"",raw} shape as the old /* keep empty */ path), provider/timeout/empty failures rethrow → 500 ocr_failed exactly like before; response `raw` now JSON.stringify(extracted) (field kept — neither frontend consumer reads it: prescription-modal.tsx + billing.tsx use items/notes only)
- pharmacy/voice-bill: zai.audio.asr STAYS on the SDK with the exact one-line comment (// ASR: only the z-ai SDK provides speech-to-text today (documented capability gap)) at the call site; chat completion → runText<{items; raw?}>(transcript, SYSTEM_PROMPT) — its robust parse replaces the old indexOf("{")/lastIndexOf("}") slicing and any failure lands in the SAME catch (log.warn voice_bill_parse_fallback + graceful empty-cart control flow); parsed.raw || transcript response unchanged
- portal/ai-interpret: runTextRaw(userPrompt, SYSTEM_PROMPT) inside the existing try/catch — markdown prose must not be JSON-parsed; log.warn ai_interpret_llm_fallback → source "rule-based" and the <20-chars rule-based fallback untouched; SYSTEM_PROMPT persona line untouched; stale doc-comment reference to glm-4-plus/z-ai updated
- clinic/voice-soap: output IS strict JSON → runText<Record<string,unknown>>(transcript, SYSTEM_PROMPT) per the brief's decision rule; the now-redundant brace-slicing and its 200 parse_failed/json_parse_failed branches removed — unparseable replies now reach the existing 500 voice_soap_failed (route has ZERO client callers — verified by repo-wide grep + archive audit; success body {ok, soap, processingTime, engine} unchanged). NOTE: the `engine: "z-ai-web-dev-sdk LLM"` literal was kept byte-identical per the no-response-body-change rule (it is the only remaining "z-ai-web-dev-sdk" string match in src/app/api that is not an import) — flag for the parent to decide whether it may become activeModelId()
- Verify: rg -n "z-ai-web-dev-sdk" src/app/api → 2 matches: voice-bill:44 (ASR import, intentionally kept) + voice-soap:70 (response string literal, kept per no-body-change rule); npx tsc --noEmit → 0 errors; bun run lint → 0 errors; npx vitest run → 268/268 (21 files)

Stage Summary:
- Every text/vision LLM call in the product API now goes through the canonical client (OpenRouter when keyed, z-ai SDK otherwise, one-shot fallback, 45s bound); the sole remaining direct-SDK call is voice-bill's ASR, a documented capability gap
- Two new client exports: runChatText (multi-turn raw) + runTextRaw (single-prompt raw); no response-shape changes for any client; one reasoned deviation (ai-query uses runTextRaw instead of runText — prose route, JSON parse would break it)
- 6 routes + openrouter.ts touched; no manual git commit made

---
Task ID: arch-demo-1
Agent: sub-agent (general-purpose)
Task: Production guard on every demo seed script + symptom-triage honesty label + DEMO_CREDENTIALS.md reset-claim truthing

Work Log:
- Seed guard (job 1): inserted the verbatim SEED_DEMO_OVERRIDE guard (comment + NODE_ENV=production check + console.error + process.exit(1)) immediately after the last import of every demo seed script — 16 files total: the 11 that literally match `scripts/seed-*.ts` (seed-nx, seed-nx-v4, seed-nx-v5, seed-chronic, seed-clinic-drugs, seed-pie, seed-hospital-bootstrap, seed-tourism, seed-pharmacy-compliance, seed-portal, seed-connect) PLUS the 5 legacy seeds under scripts/legacy/ (seed-clinic, seed-hms, seed-hospital, seed-pharmacy, seed-india) — legacy included deliberately: they are still live members of the demo seeding chain (seed-nx.ts/seed-nx-v4.ts tell the operator to run scripts/seed-hospital.ts, which only exists in legacy/), and scripts/legacy/ is excluded from tsc so only runtime verification covers them. All 16 headers confirm demo/synthetic data (demo passwords, NX-DEMO-* uhids, synthetic catalog) — no reference/essential-data seed exists, so no special-comment variant was needed. Placement: after imports, before `const db = new PrismaClient()` / first code, so a refusal exits before any DB use (files importing `{ db } from "@/lib/db"` still exit before any query — PrismaClient is lazy)
- Verified: `rg -c "SEED_DEMO_OVERRIDE" scripts/` → 16 files × 2 matches (condition + message); runtime smoke `NODE_ENV=production SEED_DEMO_OVERRIDE= bun <seed>` → exit 1 + refusal stderr for ALL 16 (also proves legacy files still parse); dev proof: `. ./.env && NODE_ENV=development bun scripts/seed-nx-v4.ts` → guard silent, idempotent re-run completed exit 0 ("seed v4 complete: staff 21, departments 8, …" into the local demo DB)
- symptom-triage (job 2): source string is now `demo-keyword-triage (not a clinical triage engine — 5-keyword demo table)` and the demo-heuristic comment sits directly above the hardcoded TRIAGE table (route file keeps its single-line style otherwise untouched; response shape identical). Frontend caller check: the ONLY caller is SymptomTriageModule in src/components/clinic/clinic-modules-extra.tsx (fetch at :24) — it renders `Source: {result.source || "Infermedica-inspired, adapted for India"}` as plain text (:120) with NO parsing of the string, so the longer label renders safely; note its hardcoded fallback text still shows the old wording when source is absent (harmless — route always sends source; left untouched as frontend was read-only for this job). Other `result.source` reads in that file (:231, :497) belong to similar-patients/lab-interpretation components, not this endpoint
- DEMO_CREDENTIALS.md (job 3): replaced the false reset instruction ("or as Super Admin via the demo reset permission (`demo.reset`)" + `bun run seed:demo`) with the truthful statement — "Demo data resets by re-running the seed scripts (bun scripts/seed-*.ts) in a non-production environment; there is no runtime reset endpoint." Confirmed the audit fact first: `demo.reset` exists only in src/lib/nx/session.ts (permission list :73 + org_admin exclusion :117), zero implementing routes repo-wide. Nothing else in the doc changed (docs/DEMO_CREDENTIALS.md only — the assigned file; abha route + global-dashboard + all other docs/ untouched per the no-touch list)
- Verify: npx tsc --noEmit → 0 errors; bun run lint → 0 errors; npx vitest run → 268/268 (21 files); no manual git commit

Stage Summary:
- Demo seed scripts can no longer touch a production database by accident: all 16 seeds refuse with exit 1 under NODE_ENV=production unless SEED_DEMO_OVERRIDE=true is passed explicitly, and dev/demo workflows are unchanged (guard silent, idempotent seeds still run clean)
- The symptom-triage endpoint now honestly labels itself as a 5-keyword demo table (frontend renders it verbatim as text — no parsing), and DEMO_CREDENTIALS.md no longer advertises a nonexistent demo.reset endpoint
- 18 files changed: 16 seed scripts (+11 lines each), src/app/api/clinic/symptom-triage/route.ts (comment + source string), docs/DEMO_CREDENTIALS.md (reset claim only)

---
Task ID: architecture-hardening-final
Agent: main (Super Z)
Task: 20-phase Principal Architect audit → refactor program (P0→P10): full-repo audit, security fixes, transaction/concurrency safety, API standardization, AI honesty, demo boundaries, docs

Work Log:
- Phase 1-3: four parallel deep audits (auth/security, API consistency, data/transactions, AI/demo/tests/docs) with file:line evidence; findings synthesized into the execution plan
- arch-security-1: requireHospitalContext fail-closed (23 cross-tenant findFirst fallbacks eliminated; DEMO_MODE fallback documented); withRoute limiter keyed on ipOf (rightmost XFF — spoofable first-entry key fixed); guard() ctx enforcement real (patientInScope + patient self-scope + department match); legacy /api/auth route + dead auth/middleware.ts deleted (unmanaged unrevocable-token login path, zero frontend callers verified); verifyToken rejects refresh/service token families; 16 IDOR fixes incl. supply PATCH, abac update, wearable pairing, predict protocols/radar, search self-scope, offline-sync write perms, connect party checks, stepup attempt cap, telemedicine clinic scope (+ discovered/added missing TelemedicineConsult model + migration — route would have 500'd on every call), notes 404-oracle, blood-booking status allowlist, MFA-disable second factor, diy guest cookie NODE_ENV-secure
- arch-transactions-1: pharmacy billing = single $transaction with conditional stock decrements + InsufficientStockError → 422 + invoiceNo P2002 retry (3 attempts) + zod bounds (unbounded discountPct/garbage quantities closed); purchases transactional (batch-identity upsert) + zod; returns transactional with sufficiency guard; MAR compare-and-set (no double-administration of controlled doses); supply procurement CAS in tx (lost updates closed, 409 stock_conflict); billing/v2 payment + bill-status recompute atomic + callerId-scoped idempotency; offline/sync keys caller-scoped; schedule booking P2002 → 409 (backed by partial unique index); clinic booking accept claim-flip with rollback; beds lifecycle/reserve CAS; discharge admission+bed-release atomic; NxJob stale-claim reaper (10 min, no attempt penalty)
- migration 20260918000000_integrity_indexes_batch_identity: ProductBatch @@unique (data deduped with stock fold), 30 FK indexes, NxEventLog (hospital,aggregate,seq) unique (resequenced), NxAuditEvent/NxEventLog/NxTimestampBlock hospital onDelete Restrict (audit chains can never cascade-delete), HospitalAppointment partial unique (doctorId,date) WHERE active — all data-repair SQL rehearsed on a scratch DB before live apply, data byte-identical
- arch-api-consistency-1: 67 err.message leaks → safe sentences + log.error (59 files, codes/statuses preserved); 64 handlers / 39 files wrapped in withRoute (request IDs, latency logs, safe JSON 500s, default rate limit repo-wide); console.* → structured logger; SSE stream + withOk collector + re-export route deliberately skipped
- arch-ai-1: dead src/lib/ai/gateway.ts deleted (494-line zero-caller scaffold with misleading "must use this gateway" header); all LLM routes flow through src/lib/openrouter.ts (new runChatText + runTextRaw exports); voice-bill ASR stays on SDK with documented capability-gap note; MODEL_VERSION → activeModelId() (real provider path); AI consent ENFORCED (403 ai_consent_required in production for patient_summary + discharge_draft); Math.random() confidence badge → deterministic match score; hardcoded "35-year-old Indian male" persona removed
- arch-demo-1: clinic/abha synthetic ABDM lookup → 501 outside DEMO_MODE; 16 seed scripts production-guarded (SEED_DEMO_OVERRIDE, tested both ways); DEPLOYMENT.md Step 6 → DO-NOT-SEED; DEMO_CREDENTIALS.md reset claim trued; symptom-triage labeled demo-keyword-triage; global desk error no longer advertises credentials
- arch-tests-1: tests/unit/hardening.test.ts (+12): ipOf rightmost keying, model honesty, requireHospitalContext, withIdempotency (replay/409/concurrent single-execution/cross-caller isolation), seed guard — 268 → 280 tests
- arch-docs-1: docs/ARCHITECTURE.md (canonical architecture map) + PRODUCTION_STATUS.md hardening section + count corrections
- EXCLUDED SURFACES UNTOUCHED: src/app/api/portal/auth/route.ts (OTP), payment-gateway integrations (none exist in repo; NxPayment ledger logic is internal, not a gateway)

Stage Summary:
- Full CI gate green: prisma validate OK, tsc 0, eslint 0, vitest 280/280 (22 files), api smoke 46/46 (full script check count, 0 fail), DEPLOY VERIFIED build UHlnKJToEmYAAtQYBP-z6
- Real-browser E2E: homepage / hospital demo-doctor console (Command Center + Work Queue live) / pharmacy billing + inventory / clinic booking (doctors + slots) — zero page errors, product behavior preserved
- Remaining known gaps (honest): legacy pharmacy/clinic money columns still Float rupees (Nx layer is integer-paise) — documented migration path in ARCHITECTURE.md §5; withRoute default limiter is per-instance in front of the Redis limiter; cost/token accounting does not exist in AI telemetry (stated honestly); consent has no self-service granting UI yet (operational step)
- Tag: architecture-hardening-1-final; dual bundles refreshed after commit
