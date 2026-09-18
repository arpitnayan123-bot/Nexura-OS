"use client";

import { useState } from "react";
import { Panel, Pill, Stat, Empty, Loading, MiniBar, StatusPill } from "./bits";
import { useNx, useNxMutation, nx } from "./client";

/* ============================================================
   NEXURA OS v5 — GOVERNANCE & TRUST CENTER
   One app for: tenancy, interoperability, security posture,
   compliance (NABH/ISO), AI governance, plugins, event log.
   Everything here is powered by the live /api/nx APIs — the same
   numbers an auditor or platform operator would see.
   ============================================================ */

type TabKey = "tenancy" | "interop" | "security" | "compliance" | "ai" | "plugins" | "events";

const TABS: { key: TabKey; label: string }[] = [
  { key: "tenancy", label: "Tenancy" },
  { key: "interop", label: "Interoperability" },
  { key: "security", label: "Security" },
  { key: "compliance", label: "Compliance" },
  { key: "ai", label: "AI Governance" },
  { key: "plugins", label: "Plugins" },
  { key: "events", label: "Event Log" },
];

export function GovernanceCenter() {
  const [tab, setTab] = useState<TabKey>("tenancy");
  return (
    <div
      className="flex flex-col gap-3 p-1"
      role="tabpanel"
      aria-label="Governance and Trust Center"
    >
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Governance sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key ? "bg-ink-12 text-paper-1" : "bg-inset hover:bg-panel-3"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "tenancy" && <TenancyTab />}
        {tab === "interop" && <InteropTab />}
        {tab === "security" && <SecurityTab />}
        {tab === "compliance" && <ComplianceTab />}
        {tab === "ai" && <AiGovernanceTab />}
        {tab === "plugins" && <PluginsTab />}
        {tab === "events" && <EventsTab />}
      </div>
    </div>
  );
}

/* ---------- Tenancy ---------- */

interface TenantRow {
  id: string;
  code: string;
  name: string;
  plan: string;
  status: string;
  hospitals: { id: string; name: string }[];
  apiKeyCount: number;
}

function TenancyTab() {
  const { data, error, loading, refresh: reload } = useNx<{ data: TenantRow[] }>("/api/nx/tenants");
  const act = useNxMutation();
  if (loading) return <Loading rows={5} />;
  if (error)
    return (
      <Empty
        title="Tenancy requires platform role"
        hint="Sign in as org/super admin to manage tenants."
      />
    );
  const tenants = data?.data ?? [];
  return (
    <div className="grid gap-3">
      {tenants.length === 0 && (
        <Empty
          title="No tenants yet"
          hint="Hospitals run single-tenant by default; create a tenant to group hospitals."
        />
      )}
      {tenants.map((t) => (
        <Panel
          key={t.id}
          title={t.name}
          subtitle={`code: ${t.code} · plan: ${t.plan}`}
          actions={
            <div className="flex items-center gap-2">
              <Pill tone={t.status === "active" ? "good" : "warn"}>{t.status}</Pill>
              {t.status === "active" && (
                <button
                  className="rounded-md bg-inset px-2 py-1 text-xs hover:bg-panel-3"
                  disabled={act.isBusy(t.id)}
                  onClick={() =>
                    act.run(
                      t.id,
                      () =>
                        nx("/api/nx/tenants", {
                          method: "POST",
                          body: JSON.stringify({
                            id: t.id,
                            code: t.code,
                            name: t.name,
                            status: "suspended",
                          }),
                        }),
                      { success: "Tenant suspended", onDone: reload },
                    )
                  }
                >
                  Suspend
                </button>
              )}
            </div>
          }
        >
          <div className="flex flex-wrap gap-2 text-xs text-ink-6">
            <span>{t.hospitals.length} hospital(s)</span>
            <span>·</span>
            <span>{t.apiKeyCount} active API key(s)</span>
          </div>
          <div className="mt-1 text-xs text-ink-5">
            {t.hospitals.map((h) => h.name).join(" · ")}
          </div>
        </Panel>
      ))}
      <Panel
        title="Sandbox partner gateway"
        subtitle="Scoped API keys for LIS/PACS/HIS — keys are hashed, rate-limited per key"
      >
        <div className="text-xs text-ink-6">
          Issue keys under <code className="bg-inset px-1 rounded">POST /api/nx/gateway/keys</code>{" "}
          · partner reads:
          <code className="ml-1 bg-inset px-1 rounded">GET /api/nx/gateway/v1/patients</code> · demo
          key <code className="bg-inset px-1 rounded">nxk_live_demo…</code> is seeded for
          evaluations.
        </div>
      </Panel>
    </div>
  );
}

/* ---------- Interoperability ---------- */

function InteropTab() {
  const { data, loading } = useNx<{
    data: {
      endpoints: { id: string; name: string; url: string; active: boolean; events: string[] }[];
      supportedEvents: string[];
    };
  }>("/api/nx/webhooks/endpoints");
  if (loading) return <Loading rows={4} />;
  const webhooks = data?.data;
  return (
    <div className="grid gap-3">
      <Panel
        title="FHIR R4 server (read)"
        subtitle="Patient · Encounter · Observation · MedicationRequest + CapabilityStatement"
      >
        <div className="grid gap-1 font-mono text-xs text-ink-6">
          <span>GET /api/nx/fhir/metadata</span>
          <span>GET /api/nx/fhir/Patient?name=…</span>
          <span>GET /api/nx/fhir/Observation?patient=…</span>
          <span>GET /api/nx/fhir/MedicationRequest?patient=…</span>
        </div>
      </Panel>
      <Panel
        title="HL7 v2 interface"
        subtitle="ADT^A01/A08 inbound upserts · ORU^R01 inbound results · outbound ADT/ORU for interface engines"
      >
        <div className="grid gap-1 font-mono text-xs text-ink-6">
          <span>POST /api/nx/hl7 {"{ message: 'MSH|…' }"}</span>
          <span>GET /api/nx/hl7?patientId=…&amp;kind=oru|adt</span>
        </div>
      </Panel>
      <Panel
        title="Outbound webhooks (signed)"
        subtitle="HMAC signatures + 3 retries + delivery records"
      >
        {webhooks?.endpoints?.length ? (
          webhooks.endpoints.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between border-t border-line py-2 first:border-0 text-xs"
            >
              <span>{e.name}</span>
              <span className="flex items-center gap-2 text-ink-6">
                <span className="font-mono">{e.events.join(", ")}</span>
                <StatusPill status={e.active ? "active" : "disabled"} />
              </span>
            </div>
          ))
        ) : (
          <Empty
            title="No endpoints registered"
            hint="Register LIS/PACS sinks to receive signed events."
          />
        )}
      </Panel>
      <Panel
        title="DICOM registry"
        subtitle="Studies registered with external viewer deep links (OHIF/vendor) — pixels never enter the core app"
      >
        <div className="font-mono text-xs text-ink-6">
          GET /api/nx/dicom?patientId=… · viewer template via DICOM_VIEWER_TEMPLATE
        </div>
      </Panel>
    </div>
  );
}

/* ---------- Security ---------- */

interface PostureCheck {
  id: string;
  title: string;
  status: "pass" | "warn" | "fail" | "unknown";
  detail: string;
  weight: number;
}

function SecurityTab() {
  const { data, loading } = useNx<{
    data: { score: number; grade: string; checks: PostureCheck[] };
  }>("/api/nx/security/posture");
  if (loading) return <Loading rows={5} />;
  const posture = data?.data;
  if (!posture) return <Empty title="Posture requires security.manage" />;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Posture score"
          value={`${posture.score}`}
          sub={`grade ${posture.grade}`}
          tone={posture.score >= 80 ? "good" : posture.score >= 60 ? "default" : "critical"}
        />
        <Stat label="Checks" value={`${posture.checks.length}`} sub="weighted" />
        <Stat
          label="Failing"
          value={`${posture.checks.filter((c) => c.status === "fail").length}`}
          tone={posture.checks.some((c) => c.status === "fail") ? "critical" : "good"}
        />
        <Stat
          label="Needs attention"
          value={`${posture.checks.filter((c) => c.status === "warn").length}`}
          tone={posture.checks.some((c) => c.status === "warn") ? "default" : "good"}
        />
      </div>
      <Panel
        title="Configuration & runtime posture"
        subtitle="Never guesses CVE counts — dependency scans run in CI with registry access"
      >
        {posture.checks.map((c) => (
          <div
            key={c.id}
            className="flex items-start justify-between gap-3 border-t border-line py-2 first:border-0"
          >
            <div>
              <div className="text-sm">{c.title}</div>
              <div className="text-xs text-ink-5">{c.detail}</div>
            </div>
            <Pill
              tone={
                c.status === "pass"
                  ? "good"
                  : c.status === "warn"
                    ? "warn"
                    : c.status === "fail"
                      ? "critical"
                      : "neutral"
              }
            >
              {c.status}
            </Pill>
          </div>
        ))}
      </Panel>
      <Panel
        title="ABAC policies"
        subtitle="Attribute-based access: department / ward / assignment / time-window — enforced in clinical routes"
      >
        <AbacList />
      </Panel>
    </div>
  );
}

function AbacList() {
  const { data, loading } = useNx<{
    data: {
      id: string;
      role: string | null;
      effect: string;
      action: string;
      resource: string;
      patientScope: string;
      note: string | null;
    }[];
  }>("/api/nx/abac");
  if (loading) return <Loading rows={3} />;
  const policies = data?.data ?? [];
  if (!policies.length)
    return (
      <Empty
        title="No ABAC policies"
        hint="RBAC is fully active; add policies for ward/shift-level narrowing."
      />
    );
  return (
    <div className="grid gap-1 text-xs">
      {policies.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between gap-2 border-t border-line py-1.5 first:border-0"
        >
          <span>
            <Pill tone={p.effect === "allow" ? "good" : "critical"}>{p.effect}</Pill>{" "}
            <b>{p.role ?? "all roles"}</b> → {p.action} on {p.resource}{" "}
            <span className="text-ink-5">({p.patientScope})</span>
          </span>
          <span className="text-ink-5">{p.note}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Compliance ---------- */

interface ComplianceMetric {
  id: string;
  name: string;
  value: string;
  target: string;
  status: string;
  source: string;
}

function ComplianceTab() {
  const { data, loading } = useNx<{
    data: { metrics: ComplianceMetric[]; readinessScore: number; frameworks: string[] };
  }>("/api/nx/compliance");
  const { data: consentData } = useNx<{ data: { total: number; grantedPct: number } }>(
    "/api/nx/compliance/consents",
  );
  if (loading) return <Loading rows={5} />;
  const c = data?.data;
  if (!c) return <Empty title="Compliance requires audit.view" />;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat
          label="Audit readiness"
          value={`${c.readinessScore}%`}
          sub="metrics passing"
          tone={c.readinessScore >= 75 ? "good" : "default"}
        />
        <Stat
          label="Consents on file"
          value={`${consentData?.data?.total ?? "—"}`}
          sub={`${consentData?.data?.grantedPct ?? 0}% granted`}
        />
        <Stat label="Frameworks" value={`${c.frameworks.length}`} sub="tracked" />
      </div>
      <Panel
        title="Certification metrics (computed live)"
        subtitle="NABH · ISO 27001 · ABDM/CBHI · DPDP"
      >
        {c.metrics.map((m) => (
          <div key={m.id} className="border-t border-line py-2 first:border-0">
            <div className="flex items-center justify-between">
              <span className="text-sm">{m.name}</span>
              <span className="flex items-center gap-2 text-xs">
                <span className="text-ink-6">target {m.target}</span>
                <StatusPill
                  status={
                    m.status === "pass" ? "active" : m.status === "watch" ? "pending" : "critical"
                  }
                />
              </span>
            </div>
            <div className="text-xs text-ink-5">
              {m.value} · {m.source}
            </div>
          </div>
        ))}
      </Panel>
      <Panel
        title="Data retention engine"
        subtitle="Purge partner payloads, AI telemetry, login attempts and dead sessions per profile"
      >
        <RetentionControls />
      </Panel>
    </div>
  );
}

function RetentionControls() {
  const act = useNxMutation();
  const [result, setResult] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {["default", "strict", "long"].map((p) => (
        <button
          key={p}
          disabled={act.isBusy(p)}
          className="rounded-md bg-inset px-2 py-1 hover:bg-panel-3 disabled:opacity-50"
          onClick={() =>
            act.run(
              p,
              async () => {
                const r = await nx(`/api/nx/compliance?profile=${p}`, {
                  method: "POST",
                  body: JSON.stringify({}),
                });
                setResult(JSON.stringify((r as { data?: unknown }).data ?? r));
              },
              { success: `Retention profile ${p} applied` },
            )
          }
        >
          Run {p}
        </button>
      ))}
      {result && <code className="max-w-full truncate bg-inset px-2 py-1 rounded">{result}</code>}
    </div>
  );
}

/* ---------- AI Governance ---------- */

interface AiFeatureRow {
  feature: string;
  calls: number;
  avgConfidence: number | null;
  humanFallbacks: number;
  blocked: number;
  overrideRatePct: number;
}

function AiGovernanceTab() {
  const {
    data,
    loading,
    refresh: reload,
  } = useNx<{
    data: {
      totalCalls: number;
      reviewed: number;
      reviewRatePct: number;
      verdicts: { accepted: number; corrected: number; rejected: number };
      perFeature: AiFeatureRow[];
    };
  }>("/api/nx/ai/report");
  if (loading) return <Loading rows={4} />;
  const r = data?.data;
  if (!r) return <Empty title="AI report requires audit.view" />;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="AI calls (24h)" value={`${r.totalCalls}`} />
        <Stat
          label="Human review rate"
          value={`${r.reviewRatePct}%`}
          sub={`${r.reviewed} reviewed`}
        />
        <Stat label="Accepted" value={`${r.verdicts.accepted}`} tone="good" />
        <Stat
          label="Corrected/rejected"
          value={`${r.verdicts.corrected + r.verdicts.rejected}`}
          tone={r.verdicts.rejected > 0 ? "critical" : "default"}
        />
      </div>
      <Panel
        title="Per-feature performance"
        subtitle="confidence = structured-output completeness (deterministic, explainable)"
      >
        {r.perFeature.length === 0 && (
          <Empty
            title="No AI calls in window"
            hint="Run a patient summary or handover from Doctor Workspace."
          />
        )}
        {r.perFeature.map((f) => (
          <div key={f.feature} className="border-t border-line py-2 first:border-0">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono">{f.feature}</span>
              <span className="text-xs text-ink-6">{f.calls} calls</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-ink-5">
              <span>avg confidence {f.avgConfidence ?? "—"}</span>
              <MiniBar
                pct={(f.avgConfidence ?? 0) * 100}
                tone={(f.avgConfidence ?? 1) >= 0.7 ? "good" : "warn"}
              />
              <span>
                {f.humanFallbacks} fallbacks · {f.blocked} blocked · override {f.overrideRatePct}%
              </span>
            </div>
          </div>
        ))}
      </Panel>
      <Panel
        title="HITL loop"
        subtitle="Every correction feeds prompt iteration; thresholds configurable per feature"
      >
        <button className="rounded-md bg-inset px-2 py-1 text-xs hover:bg-panel-3" onClick={reload}>
          Refresh report
        </button>
      </Panel>
    </div>
  );
}

/* ---------- Plugins ---------- */

interface PluginRow {
  id: string;
  code: string;
  name: string;
  version: string;
  vendor: string | null;
  permissions: string[];
  enabled: boolean;
  entry: { slots?: string[] };
}

function PluginsTab() {
  const {
    data,
    loading,
    refresh: reload,
  } = useNx<{ data: { plugins: PluginRow[]; knownSlots: string[] } }>("/api/nx/plugins");
  const act = useNxMutation();
  if (loading) return <Loading rows={3} />;
  const p = data?.data;
  if (!p) return <Empty title="Plugins require settings.manage" />;
  return (
    <div className="grid gap-3">
      <Panel
        title="Sandbox policy"
        subtitle="Panels only · scoped APIs · no direct DB · permission grants audited"
      >
        <div className="text-xs text-ink-6">Offered slots: {p.knownSlots.join(", ")}</div>
      </Panel>
      {p.plugins.map((pl) => (
        <Panel
          key={pl.id}
          title={`${pl.name} v${pl.version}`}
          subtitle={`vendor: ${pl.vendor ?? "internal"} · slots: ${pl.entry.slots?.join(", ") ?? "—"}`}
          actions={
            <button
              className={`rounded-md px-2 py-1 text-xs ${pl.enabled ? "bg-inset hover:bg-panel-3" : "bg-ink-12 text-paper-1"}`}
              disabled={act.isBusy(pl.id)}
              onClick={() =>
                act.run(
                  pl.id,
                  () =>
                    nx("/api/nx/plugins", {
                      method: "POST",
                      body: JSON.stringify({
                        code: pl.code,
                        name: pl.name,
                        version: pl.version,
                        vendor: pl.vendor ?? undefined,
                        permissions: pl.permissions,
                        slots: pl.entry.slots ?? [],
                        enabled: !pl.enabled,
                      }),
                    }),
                  { success: pl.enabled ? "Plugin disabled" : "Plugin enabled", onDone: reload },
                )
              }
            >
              {pl.enabled ? "Disable" : "Enable"}
            </button>
          }
        >
          <div className="text-xs text-ink-6">permissions: {pl.permissions.join(", ")}</div>
        </Panel>
      ))}
    </div>
  );
}

/* ---------- Event log ---------- */

function EventsTab() {
  const [aggregateType, setAggregateType] = useState("insurance_contract");
  const [aggregateId, setAggregateId] = useState("");
  const { data, loading } = useNx<{
    data: {
      count: number;
      events: {
        id: string;
        type: string;
        seq: number;
        createdAt: string;
        actorName: string | null;
      }[];
    };
  }>(
    aggregateId ? `/api/nx/events?aggregateType=${aggregateType}&aggregateId=${aggregateId}` : null,
  );
  return (
    <div className="grid gap-3">
      <Panel
        title="Event stream replay (CQRS-lite)"
        subtitle="Query the append-only log that backs Command Center projections and partner audits"
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <select
            aria-label="Aggregate type"
            value={aggregateType}
            onChange={(e) => setAggregateType(e.target.value)}
            className="rounded-md bg-inset px-2 py-1"
          >
            {["insurance_contract", "offline_sync", "pathway_run"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            aria-label="Aggregate id"
            placeholder="aggregate id"
            value={aggregateId}
            onChange={(e) => setAggregateId(e.target.value)}
            className="min-w-40 rounded-md bg-inset px-2 py-1"
          />
        </div>
      </Panel>
      {loading && <Loading rows={3} />}
      {data?.data && data.data.count === 0 && (
        <Empty
          title="No events"
          hint="Settlement actions, offline flushes and pathway runs append here."
        />
      )}
      {data?.data?.events.map((e) => (
        <div
          key={e.id}
          className="flex items-center justify-between rounded-md bg-inset px-3 py-2 text-xs"
        >
          <span>
            <span className="font-mono">#{e.seq}</span> {e.type}
          </span>
          <span className="text-ink-5">
            {new Date(e.createdAt).toLocaleString()} · {e.actorName ?? "system"}
          </span>
        </div>
      ))}
    </div>
  );
}
