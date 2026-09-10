import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* OpenAPI 3.1 description of the Hospital OS API surface (docs-first summary of implemented routes). */

const errResp = (desc: string) => ({
  description: desc,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});
const okResp = (desc: string) => ({ description: desc, content: { "application/json": { schema: { type: "object" } } } });
const jsonBody = () => ({ required: true, content: { "application/json": { schema: { type: "object" } } } });

function op(summary: string, tag: string, opts?: { params?: string[]; body?: boolean; errors?: number[] }) {
  const o: Record<string, unknown> = {
    summary,
    tags: [tag],
    security: [{ sessionCookie: [] }],
    responses: Object.assign(
      { 200: okResp("Success"), 401: errResp("Unauthenticated") },
      ...((opts?.errors ?? []).map((c) => ({ [c]: errResp("Client error") })))
    ) as Record<number, unknown>,
  };
  if (opts?.params?.length) {
    o.parameters = opts.params.map((p) => ({ name: p, in: "query", schema: { type: "string" } }));
  }
  if (opts?.body) o.requestBody = jsonBody();
  return o;
}

export function GET() {
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Nexura Hospital OS API",
      version: "4.0.0",
      description:
        "Hospital operating ecosystem API. Session-cookie auth (nx_access, HttpOnly). Consistent envelopes: {data, meta} on success, {error, detail?, meta} on failure. Every protected operation enforces RBAC-as-data + tenant (hospital) isolation + audit logging.",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        sessionCookie: { type: "apiKey", in: "cookie", name: "nx_access" },
      },
      schemas: {
        Error: {
          type: "object",
          properties: { error: { type: "string" }, detail: { type: "string" }, meta: { type: "object" } },
          required: ["error"],
        },
      },
    },
    paths: {
      "/api/health": { get: { summary: "Liveness probe", tags: ["observability"], responses: { 200: okResp("Process up") } } },
      "/api/ready": { get: { summary: "Readiness probe (DB, seed, env)", tags: ["observability"], responses: { 200: okResp("Ready"), 503: errResp("Degraded") } } },
      "/api/nx/auth": {
        post: op("Sign in (email+password or staffCode+PIN; MFA step-up; progressive lockout)", "auth", { body: true, errors: [401, 423, 429] }),
        get: op("Current session snapshot (profile, roles, modules, demo flag)", "auth"),
        delete: op("Sign out (revoke current session)", "auth"),
      },
      "/api/nx/auth/logout": { post: op("Sign out current device", "auth") },
      "/api/nx/auth/sessions": {
        get: op("List my active sessions/devices", "auth"),
        delete: op("Revoke one session or all others", "auth", { body: true }),
      },
      "/api/nx/auth/password": {
        put: op("Change my password", "auth", { body: true, errors: [401] }),
        post: op("Request password reset (console email transport in demo)", "auth", { body: true }),
        patch: op("Confirm password reset (revokes all sessions)", "auth", { body: true }),
      },
      "/api/nx/auth/verify-email": {
        post: op("Request email verification", "auth", { body: true }),
        patch: op("Confirm email verification", "auth", { body: true }),
      },
      "/api/nx/auth/mfa": {
        post: op("Begin TOTP enrollment (returns otpauth URL)", "auth"),
        put: op("Activate MFA with first code", "auth", { body: true }),
        delete: op("Disable MFA (password required)", "auth", { body: true }),
      },
      "/api/nx/auth/break-glass": {
        post: op("Invoke emergency access (mandatory reason + TTL, audited)", "auth", { body: true, errors: [403] }),
        get: op("List active break-glass events (audit.view)", "auth"),
        delete: op("Revoke break-glass early", "auth", { body: true }),
      },
      "/api/nx/notifications": {
        get: op("Inbox (targeted + role broadcasts) with unread count", "notifications", { params: ["page", "perPage"] }),
        post: op("Create notification (targeted/role/broadcast)", "notifications", { body: true }),
        patch: op("Mark read / read-all", "notifications", { body: true }),
      },
      "/api/nx/stream": { get: { summary: "Real-time SSE stream (auth at subscribe, heartbeat, seq dedupe)", tags: ["realtime"], security: [{ sessionCookie: [] }], responses: { 200: { description: "text/event-stream" }, 401: errResp("Unauthenticated") } } },
      "/api/nx/search": { get: op("Global cross-entity search (hospital-scoped)", "search", { params: ["q"] }) },
      "/api/nx/prefs": {
        get: op("My dashboard widget preferences", "preferences"),
        put: op("Save dashboard widget preferences", "preferences", { body: true }),
      },
      "/api/nx/tasks": {
        get: op("Work queue (filters: status/priority/mine/type/view/page; legacy counts included)", "tasks", { params: ["status", "priority", "mine", "type", "view", "page", "perPage", "q"] }),
        post: op("Create task (validated, audited, live event)", "tasks", { body: true, errors: [400] }),
        patch: op("Transition task / comment / checklist / handoff (illegal transitions → 422)", "tasks", { body: true, errors: [404, 422] }),
        put: op("Bulk operations (status/priority/assign/delete)", "tasks", { body: true }),
      },
      "/api/nx/tasks/views": {
        get: op("List saved task views", "tasks"),
        post: op("Save a task view", "tasks", { body: true }),
        delete: op("Delete a saved view", "tasks", { params: ["id"] }),
      },
      "/api/nx/notes/{id}": {
        get: op("Note with version history (restricted notes gated)", "clinical-notes"),
        post: op("Create draft note", "clinical-notes", { body: true }),
        patch: op("save | sign | addendum (signed notes immutable → 423)", "clinical-notes", { body: true, errors: [403, 409, 423] }),
      },
      "/api/nx/patients": { get: op("Patient directory (hospital-scoped)", "patients", { params: ["page", "perPage", "q"] }) },
      "/api/nx/patients/{id}": { get: op("Patient record v2: permission-aware profile, timeline, consents, MAR, access history (view-audited)", "patients", { errors: [403, 404] }) },
      "/api/nx/schedule": {
        get: op("Day board (appointments + doctors + stats)", "scheduling", { params: ["day"] }),
        post: op("Book appointment (conflict-checked, automation-fired)", "scheduling", { body: true, errors: [409] }),
        patch: op("Status transition / check-in / reschedule / no-show→waitlist", "scheduling", { body: true, errors: [409] }),
      },
      "/api/nx/schedule/waitlist": {
        get: op("Waitlist", "scheduling"),
        post: op("Add to waitlist", "scheduling", { body: true }),
        patch: op("Promote waitlist entry to a slot (conflict-checked)", "scheduling", { body: true, errors: [409] }),
      },
      "/api/nx/beds": {
        get: op("Bed board by ward with lifecycle states", "beds"),
        post: op("Bed lifecycle transitions (cleaning/isolation/maintenance flows)", "beds", { body: true, errors: [422] }),
      },
      "/api/nx/labs/verify": {
        get: op("Result audit history", "labs", { params: ["resultId"] }),
        patch: op("verify | reject | notify_critical (critical → clinician + command notified, task created)", "labs", { body: true, errors: [422] }),
      },
      "/api/nx/pharmacy/mar": {
        get: op("MAR entries (pending/all by patient)", "medications", { params: ["patientId", "status"] }),
        post: op("Schedule administration (allergy cross-check: clear/warn/block)", "medications", { body: true }),
        patch: op("Given / held / refused / missed (controlled substances need witness)", "medications", { body: true, errors: [409, 422] }),
      },
      "/api/nx/billing/v2": {
        get: op("Summary | charges | payments | CSV export (reports.export)", "billing", { params: ["kind", "patientId"] }),
        post: op("Create charge", "billing", { body: true }),
        put: op("Record payment/refund (idempotent via x-idempotency-key; receipt returned)", "billing", { body: true }),
      },
      "/api/nx/supply/procurement": {
        get: op("Vendors, POs, stock txns, low-stock/expiry alerts", "inventory", { params: ["kind"] }),
        post: op("Create vendor", "inventory", { body: true }),
        put: op("Create purchase order", "inventory", { body: true }),
        patch: op("Stock transaction (transactional onHand; alerts on low stock)", "inventory", { body: true, errors: [422] }),
      },
      "/api/nx/staff/ops": {
        get: op("Directory, departments, credential alerts, shifts, workload", "staff"),
        post: op("Add credential", "staff", { body: true }),
        put: op("Assign shift/on-call", "staff", { body: true }),
        patch: op("Suspend/reactivate account (revokes sessions)", "staff", { body: true }),
      },
      "/api/nx/permissions": {
        get: op("Permission matrix + grants + delegations (roles.manage)", "rbac"),
        post: op("Assign/revoke role (audited)", "rbac", { body: true }),
        patch: op("Explicit allow/deny permission grant with optional TTL", "rbac", { body: true }),
        delete: op("Revoke delegation", "rbac", { params: ["id"] }),
      },
      "/api/nx/messages": {
        get: op("Channel directory + messages (patient channels privacy-gated)", "communication", { params: ["channel", "q"] }),
        post: op("Post message (mentions → notifications; urgent severity; live event)", "communication", { body: true }),
        patch: op("Mark channel read / pin message", "communication", { body: true }),
      },
      "/api/nx/analytics": { get: op("Role-aware analytics with ?days window; ?format=csv export (reports.export)", "analytics", { params: ["days", "format"] }) },
      "/api/nx/audit": { get: op("Tamper-evident audit chain (audit.view)", "audit", { params: ["page", "perPage", "q"] }) },
      "/api/nx/system-status": {
        get: op("Maintenance/incident banner state", "system"),
        put: op("Set banner state (settings.manage)", "system", { body: true }),
      },
      /* ---------- v5 Chief Future Architect layer ---------- */
      "/api/nx/tenants": {
        get: op("List tenants with hospitals + active key counts (tenants.manage)", "tenancy"),
        post: op("Create/update tenant: branding, modules, domains, hospital binding", "tenancy", { body: true, errors: [403, 409] }),
      },
      "/api/nx/gateway/keys": {
        get: op("List partner API keys (hashed)", "gateway"),
        post: op("Issue scoped API key (plaintext returned once)", "gateway", { body: true }),
        delete: op("Revoke key", "gateway", { body: true }),
      },
      "/api/nx/gateway/v1/patients": { get: op("Partner sandbox read: patients (scope patients.read)", "gateway", { params: ["page", "perPage", "q"] }) },
      "/api/nx/gateway/v1/observations": { get: op("Partner sandbox read: lab observations (scope observations.read)", "gateway", { params: ["patientId"] }) },
      "/api/nx/fhir/metadata": { get: op("FHIR R4 CapabilityStatement", "fhir") },
      "/api/nx/fhir/{resource}": { get: op("FHIR R4 search/read: Patient | Encounter | Observation | MedicationRequest", "fhir", { params: ["_id", "identifier", "name", "patient", "status"] }) },
      "/api/nx/hl7": {
        post: op("HL7 v2 inbound: ADT^A01/A08 + ORU^R01", "hl7", { body: true, errors: [400, 403, 422] }),
        get: op("HL7 v2 outbound: ADT^A08 / ORU^R01", "hl7", { params: ["patientId", "kind"] }),
      },
      "/api/nx/webhooks/endpoints": {
        get: op("Signed webhook endpoints + recent deliveries", "integrations"),
        post: op("Register endpoint (secret shown once)", "integrations", { body: true }),
        delete: op("Remove endpoint", "integrations", { body: true }),
      },
      "/api/nx/webhooks/inbound": { post: op("Partner push with HMAC signature verification", "integrations", { body: true, errors: [401, 422] }) },
      "/api/nx/dicom": {
        get: op("DICOM study registry + viewer deep links", "imaging", { params: ["patientId"] }),
        post: op("Register study", "imaging", { body: true }),
      },
      "/api/nx/abac": {
        get: op("List ABAC policies", "security"),
        post: op("Upsert ABAC policy", "security", { body: true }),
        delete: op("Delete policy", "security", { body: true }),
      },
      "/api/nx/auth/stepup": { post: op("Step-up second factor (PIN/TOTP) for privileged actions", "security", { body: true, errors: [401] }) },
      "/api/nx/security/posture": { get: op("Security posture score + checks", "security") },
      "/api/nx/compliance": {
        get: op("NABH/ISO/CBHI metrics (audit.view)", "compliance"),
        post: op("Run data-retention profile", "compliance", { body: true }),
      },
      "/api/nx/compliance/consents": {
        get: op("Consent dashboard (consent.manage)", "compliance"),
        post: op("Capture consent", "compliance", { body: true }),
      },
      "/api/nx/pathways": {
        get: op("Pathway definitions + runs with SLA flags", "clinical"),
        post: op("create_def | start | advance (critical skip blocked)", "clinical", { body: true, errors: [422] }),
      },
      "/api/nx/escalations": {
        get: op("Escalation policies + events (runs overdue sweep)", "clinical"),
        post: op("Upsert policy | advance event", "clinical", { body: true }),
      },
      "/api/nx/prescriptions/sign": {
        post: op("DPCO two-person e-prescription signing", "clinical", { body: true, errors: [401, 422] }),
        get: op("Signature records for an order", "clinical", { params: ["orderId"] }),
      },
      "/api/nx/docs/versions": {
        get: op("Document versions with tracked edits", "clinical", { params: ["entityType", "entityId"] }),
        post: op("Append version", "clinical", { body: true }),
      },
      "/api/nx/journey/annotations": {
        get: op("Journey annotations + decision logs", "clinical", { params: ["patientId"] }),
        post: op("Annotate journey event", "clinical", { body: true }),
      },
      "/api/nx/ai/feedback": {
        get: op("Recent clinician AI feedback", "ai"),
        post: op("HITL accept/correct/reject", "ai", { body: true }),
      },
      "/api/nx/ai/report": { get: op("Daily AI performance report", "ai") },
      "/api/nx/ai/thresholds": {
        get: op("Confidence thresholds + versions", "ai"),
        post: op("Configure thresholds", "ai", { body: true }),
      },
      "/api/nx/automations/explain": { get: op("Explainable automations", "automations", { params: ["ruleId"] }) },
      "/api/nx/identity/vc": {
        post: op("Issue W3C-VC patient credential (PoC)", "identity", { body: true }),
        get: op("Verify credential", "identity", { params: ["id"] }),
      },
      "/api/nx/audit/blocks": {
        get: op("Merkle timestamp blocks + chain check", "audit"),
        post: op("Anchor audit events into next block", "audit"),
      },
      "/api/nx/insurance/settlement": {
        get: op("Settlement contracts + progress", "billing"),
        post: op("Settlement state machine", "billing", { body: true, errors: [422] }),
      },
      "/api/nx/wearables/ingest": { post: op("Ingest wearable samples", "patient360", { body: true }) },
      "/api/nx/wearables/insights": { get: op("Deterministic wearable insights", "patient360", { params: ["patientId"] }) },
      "/api/nx/twin/simulate": { post: op("Digital twin projection (education only)", "patient360", { body: true }) },
      "/api/nx/telehealth": {
        get: op("Teleconsult queue", "telehealth"),
        post: op("Doctor-on-demand routing + bandwidth mode", "telehealth", { body: true, errors: [503] }),
      },
      "/api/nx/genomics/profile": {
        get: op("Genomic profile (vault-ref only)", "patient360", { params: ["patientId"] }),
        post: op("Consent-gated risk computation", "patient360", { body: true, errors: [403] }),
      },
      "/api/nx/simulations": {
        get: op("Adaptive symptom tree scenarios", "education"),
        post: op("Run scenario with deterministic scoring", "education", { body: true }),
      },
      "/api/nx/journey/predicted": { get: op("Predicted care journey nodes", "clinical", { params: ["patientId"] }) },
      "/api/nx/templates": { get: op("Hospital-as-a-Service templates", "platform") },
      "/api/nx/onboard": { post: op("Apply HaaS template to provision hospital", "platform", { body: true }) },
      "/api/nx/plugins": {
        get: op("Plugin registry + sandbox policy", "platform"),
        post: op("Register/enable plugin", "platform", { body: true }),
      },
      "/api/nx/events": { get: op("Event log replay per aggregate", "audit", { params: ["aggregateType", "aggregateId"] }) },
      "/api/nx/offline/sync": { post: op("Flush offline write buffer (idempotent)", "offline", { body: true }) },
    },
  };
  return NextResponse.json(spec);
}
