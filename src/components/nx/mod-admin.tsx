"use client";

import { Lock, Server, ShieldCheck, Workflow } from "lucide-react";
import { useNx, timeAgo } from "./client";
import { Empty, ErrorState, Loading, OkBadge, Panel, Pill } from "./bits";

/* ============================================================
   ADMINISTRATION — config center, audit trail, integrations
   ============================================================ */

const INTEGRATIONS = [
  { name: "HL7 v2 ADT gateway", proto: "HL7 v2", status: "healthy", latency: "42ms", detail: "Admit/discharge/transfer feeds" },
  { name: "FHIR R4 server", proto: "HL7 FHIR", status: "healthy", latency: "88ms", detail: "Patient & encounter resources" },
  { name: "PACS / DICOM adapter", proto: "DICOM", status: "healthy", latency: "210ms", detail: "Imaging study exchange" },
  { name: "Lab instrument HL7 feed", proto: "HL7 v2", status: "degraded", latency: "1.4s", detail: "Analyzer backlog — retry queue active" },
  { name: "Insurance/TPA gateway", proto: "REST", status: "healthy", latency: "350ms", detail: "Pre-auth & claims" },
  { name: "ABDM link (M1)", proto: "FHIR + OAuth2", status: "healthy", latency: "520ms", detail: "ABHA linking, HIE consented flows" },
  { name: "Ambulance dispatch", proto: "Webhook", status: "healthy", latency: "95ms", detail: "Pre-arrival notifications" },
  { name: "Legacy HIS bridge", proto: "Flat-file SFTP", status: "monitoring", latency: "5 min sync", detail: "Nightly reconciliation after recovery" },
];

const AUDIT_ACTIONS = [
  "auth", "order", "result", "incident", "bed", "task", "medication", "appointment", "automation", "encounter",
];

export function AdminCenter({ view }: { view: "audit" | "admin" }) {
  const { data, error, loading, refresh } = useNx<{
    events: Array<{ id: string; actorName: string; actorRole: string; action: string; entityType: string; entityId: string | null; detail: Record<string, unknown> | null; at: string; chainOk: boolean; seq: number }>;
    integrity: { verified: boolean; algorithm: string; coverage: string };
  }>(view === "audit" ? "/api/nx/audit?take=80" : null, { pollMs: 20000 });

  if (view === "audit") {
    if (loading) return <Loading rows={8} label="Loading audit trail…" />;
    if (error) return <ErrorState message={error.message} onRetry={refresh} />;
    return (
      <div className="space-y-4">
        <Panel
          title="Audit integrity"
          subtitle="Every access and change is recorded in a hash-chained, tamper-evident log"
          actions={
            <Pill tone={data?.integrity.verified ? "good" : "critical"}>
              <ShieldCheck className="h-3 w-3" /> {data?.integrity.verified ? "chain verified" : "chain broken"}
            </Pill>
          }
        >
          <div className="flex flex-wrap gap-2 text-xs text-ink-3">
            <Pill tone="info">{data?.integrity.algorithm}</Pill>
            <Pill>coverage: {data?.integrity.coverage}</Pill>
            <Pill>{data?.events.length} recent events</Pill>
          </div>
        </Panel>

        <div className="flex flex-wrap gap-1.5">
          {AUDIT_ACTIONS.map((a) => (
            <a key={a} href={`/hospital#m=audit`} className="rounded-md border border-line px-2 py-1 text-[11px] text-ink-3 hover:text-ink-2">{a}.*</a>
          ))}
        </div>

        <Panel title="Event stream" subtitle="Newest first">
          {!data?.events.length ? <Empty title="No audit events" /> : (
            <div className="nx-scroll max-h-[540px] space-y-1 overflow-y-auto pr-1">
              {data.events.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-[11px]">
                  <span className="w-8 shrink-0 tabular-nums text-ink-4">#{e.seq}</span>
                  <span className="font-medium text-ink-2">{e.actorName}</span>
                  <span className="text-ink-4">({e.actorRole})</span>
                  <Pill tone="info">{e.action}</Pill>
                  <span className="truncate text-ink-3">{e.entityType}</span>
                  {e.detail && <span className="truncate text-ink-4">{JSON.stringify(e.detail).slice(0, 80)}</span>}
                  <span className="ml-auto shrink-0 text-ink-4">{timeAgo(e.at)}</span>
                  <OkBadge ok={e.chainOk} label="" />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Hospital configuration" subtitle="Aarogya Multi-Specialty Hospital · NABH accredited">
          <div className="space-y-2 text-xs text-ink-3">
            <p>Departments, wards, roles and SLA policies are canonical records. Demos run against seeded configuration; production deployments configure these per facility through this center.</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["RBAC enforced server-side", "PIN + role sessions (MFA-ready)", "Break-glass access policy", "Downtime mode: read-only cache", "Soft deletion + versioning", "Multi-tenant ready"].map((x) => (
                <Pill key={x} tone="good"><ShieldCheck className="h-3 w-3" /> {x}</Pill>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Security posture" subtitle="Defense in depth">
          <div className="space-y-1.5 text-xs text-ink-3">
            <p className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-good" /> JWT httpOnly sessions · bcrypt pins · deterministic module RBAC re-checked on every API call</p>
            <p className="flex items-center gap-2"><Workflow className="h-3.5 w-3.5 text-accent" /> High-risk actions (discharge, orders, automation toggles) require authorized roles — enforced in code, not UI</p>
            <p className="flex items-center gap-2"><Server className="h-3.5 w-3.5 text-info" /> Audit events are hash-chained; any retroactive edit breaks verification</p>
          </div>
        </Panel>
      </div>

      <Panel title="Integration monitoring" subtitle="Standards-based gateway — legacy systems included">
        <div className="grid gap-2 md:grid-cols-2">
          {INTEGRATIONS.map((i) => (
            <div key={i.name} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink">{i.name} <span className="ml-1 text-[10px] text-ink-3">{i.proto}</span></p>
                <p className="truncate text-[11px] text-ink-3">{i.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Pill tone={i.status === "healthy" ? "good" : i.status === "degraded" ? "warn" : "info"}>{i.status}</Pill>
                <span className="text-[10px] tabular-nums text-ink-4">{i.latency}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
