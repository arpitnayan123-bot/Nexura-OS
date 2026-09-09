"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { useOs } from "./os/store";
import { Activity, ArrowUpRight, Bot, ClipboardList, FileText, Loader2, Moon, ShieldAlert, Thermometer } from "lucide-react";
import { nx, useNx, timeAgo, fmtClock } from "./client";
import { AiBanner, Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";

/* ============================================================
   CLINICIAN WORKSPACE — doctor / nurse role surfaces
   ============================================================ */

interface WorkspaceData {
  workspace: string;
  clinician: { name: string; role: string };
  tasks: Array<{ id: string; title: string; priority: string; status: string; dueAt: string | null; reason: string | null; ownerName: string | null }>;
  patients: Array<{
    admissionId: string; patient: { id: string; fullName: string; uhid: string; age: number | null; gender: string; bloodGroup: string | null; allergy: string | null; chronicConditions: string | null };
    diagnosis: string | null; doctor: string | null; location: string | null; admittedAt: string;
    riskScore: number;
    pendingOrders: Array<{ id: string; type: string; test: string | null; priority: string; criticalResults: number }>;
    latestVitals: { bp: string; pulse: number | null; spo2: number | null; temp: number | null; at: string } | null;
  }>;
  pendingOrders: Array<{ id: string; type: string; priority: string; status: string; patient: { fullName: string; uhid: string }; details?: { testName?: string } }>;
  summary: { myTasks: number; criticalTasks: number; patients: number; criticalResults: number };
}

export function ClinicianWorkspace({ kind }: { kind: "doctor" | "nurse" }) {
  const { data, error, loading, refresh } = useNx<WorkspaceData>("/api/nx/workspace", { pollMs: 25000 });
  const [aiPatient, setAiPatient] = useState<string | null>(null);
  const [ai, setAi] = useState<{ summary: { oneLine: string; currentStatus: string; activeProblems: string[]; watchItems: string[]; dataGaps: string[] }; disclaimer: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [handover, setHandover] = useState<{ handover: { headline: string; stable: string[]; needsAttention: string[]; pendingTasks: string[] }; disclaimer: string } | null>(null);
  const [handoverBusy, setHandoverBusy] = useState(false);

  async function summarize(patientId: string) {
    setAiPatient(patientId);
    setAiBusy(true);
    setAi(null);
    try {
      const res = await nx<typeof ai>("/api/nx/ai", { method: "POST", body: JSON.stringify({ feature: "patient_summary", patientId }) });
      setAi(res as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setAiBusy(false);
    }
  }

  async function makeHandover() {
    setHandoverBusy(true);
    setHandover(null);
    try {
      const res = await nx<typeof handover>("/api/nx/ai", { method: "POST", body: JSON.stringify({ feature: "handover" }) });
      setHandover(res as never);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setHandoverBusy(false);
    }
  }

  if (loading) return <Loading rows={6} label={`Preparing ${kind} workspace…`} />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;
  if (!data) return <Empty title="Workspace unavailable" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={kind === "nurse" ? "Assigned patients" : "Panel"} value={data.summary.patients} icon={<Activity className="h-4 w-4" />} />
        <Stat label="My open tasks" value={data.summary.myTasks} sub={`${data.summary.criticalTasks} critical`} tone={data.summary.criticalTasks ? "critical" : "default"} icon={<ClipboardList className="h-4 w-4" />} />
        <Stat label="Critical results" value={data.summary.criticalResults} tone={data.summary.criticalResults ? "critical" : "good"} icon={<ShieldAlert className="h-4 w-4" />} />
        <Stat label="Pending orders" value={data.pendingOrders.length} tone="info" icon={<FileText className="h-4 w-4" />} />
      </div>

      {/* Risk-sorted patient list */}
      <Panel
        title={kind === "nurse" ? "My assigned patients — risk-sorted" : "Patient list — risk-sorted"}
        subtitle="Risk computed deterministically from latest vitals (SpO₂, pulse, temp, BP, RR)"
        actions={
          kind === "nurse" ? (
            <button onClick={makeHandover} disabled={handoverBusy} className="flex items-center gap-1.5 rounded-lg bg-vio-soft px-3 py-1.5 text-xs font-medium text-vio ring-1 ring-vio-line hover:bg-vio-soft disabled:opacity-50">
              {handoverBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Moon className="h-3.5 w-3.5" />} SBAR handover brief
            </button>
          ) : undefined
        }
      >
        {handover && (
          <div className="mb-4 space-y-2 rounded-lg border border-vio-line bg-vio-soft p-3">
            <AiBanner disclaimer={handover.disclaimer} />
            <p className="text-sm font-medium text-ink">{handover.handover.headline}</p>
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase text-good">Stable</p>
                <ul className="mt-1 space-y-0.5 text-[11px] text-ink-2">{handover.handover.stable.map((s, i) => <li key={i}>• {s}</li>)}</ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-crit">Needs attention</p>
                <ul className="mt-1 space-y-0.5 text-[11px] text-ink-2">{handover.handover.needsAttention.map((s, i) => <li key={i}>• {s}</li>)}</ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-accent">Pending tasks</p>
                <ul className="mt-1 space-y-0.5 text-[11px] text-ink-2">{handover.handover.pendingTasks.map((s, i) => <li key={i}>• {s}</li>)}</ul>
              </div>
            </div>
          </div>
        )}
        {data.patients.length === 0 ? (
          <Empty title="No active patients" />
        ) : (
          <div className="grid gap-2.5 lg:grid-cols-2">
            {data.patients.map((p) => (
              <div key={p.admissionId} className={`rounded-xl border p-4 ${p.riskScore >= 4 ? "border-crit-line bg-crit-soft" : p.riskScore >= 2 ? "border-accent-line bg-accent-soft" : "border-line bg-panel"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-ink">{p.patient.fullName} <span className="text-[11px] font-normal text-ink-3">{p.patient.uhid} · {p.patient.age ?? "?"}y {p.patient.gender} {p.patient.bloodGroup}</span></p>
                    <p className="text-[11px] text-ink-3">{p.diagnosis || "—"} · {p.location} · {p.doctor}</p>
                  </div>
                  <Pill tone={p.riskScore >= 4 ? "critical" : p.riskScore >= 2 ? "warn" : "good"}>risk {p.riskScore}</Pill>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
                  {p.latestVitals && (
                    <span className="flex items-center gap-1 tabular-nums"><Thermometer className="h-3 w-3" /> {p.latestVitals.bp} · P{p.latestVitals.pulse ?? "?"} · {p.latestVitals.spo2 ?? "?"}% <span className="text-ink-4">({fmtClock(p.latestVitals.at)})</span></span>
                  )}
                  {p.patient.allergy && <Pill tone="critical">allergy: {p.patient.allergy}</Pill>}
                </div>
                {p.pendingOrders.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.pendingOrders.map((o) => (
                      <Pill key={o.id} tone={o.priority === "stat" ? "critical" : "info"}>{o.test || o.type} · {o.priority}</Pill>
                    ))}
                  </div>
                )}
                {kind === "doctor" && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => summarize(p.patient.id)}
                      disabled={aiBusy && aiPatient === p.patient.id}
                      className="flex items-center gap-1.5 rounded-md border border-vio-line px-2 py-1 text-[11px] text-vio hover:bg-vio-soft disabled:opacity-50"
                    >
                      {aiBusy && aiPatient === p.patient.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                      AI brief
                    </button>
                    <button
                      onClick={() => {
                        // Both halves matter: hand the id to Patient Records AND
                        // actually open its window (a bare dispatch did nothing
                        // when no listener was mounted).
                        window.dispatchEvent(new CustomEvent("nx-open-patient", { detail: p.patient.id }));
                        useOs.getState().openApp("patients");
                      }}
                      className="flex items-center gap-1 rounded-md border border-line-2 px-2 py-1 text-[11px] text-ink-2 hover:bg-inset"
                    >
                      Full record <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* AI patient brief */}
      {ai && (
        <Panel title="Nexura Intelligence — patient brief">
          <div className="space-y-3">
            <AiBanner disclaimer={ai.disclaimer} />
            <p className="text-sm font-medium text-ink">{ai.summary.oneLine}</p>
            <p className="text-xs text-ink-2">{ai.summary.currentStatus}</p>
            <div className="flex flex-wrap gap-1.5">
              {ai.summary.activeProblems.map((x, i) => <Pill key={`p${i}`} tone="warn">{x}</Pill>)}
              {ai.summary.watchItems.map((x, i) => <Pill key={`w${i}`} tone="critical">{x}</Pill>)}
              {ai.summary.dataGaps.map((x, i) => <Pill key={`g${i}`}>{x}</Pill>)}
            </div>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="My tasks" subtitle="Transparent priority with reasons">
          {data.tasks.length === 0 ? <Empty title="No open tasks" /> : (
            <div className="space-y-2">
              {data.tasks.slice(0, 6).map((t) => (
                <div key={t.id} className="rounded-lg border border-line bg-panel px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-ink">{t.title}</p>
                    <StatusPill status={t.priority} />
                  </div>
                  <p className="text-[11px] text-ink-3">{t.reason || t.ownerName} {t.dueAt && `· due ${timeAgo(t.dueAt)}`}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Pending orders awaiting results">
          {data.pendingOrders.length === 0 ? <Empty title="Nothing pending" /> : (
            <div className="space-y-2">
              {data.pendingOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2">
                  <p className="truncate text-xs text-ink-2">{o.details?.testName || o.type} — {o.patient.fullName}</p>
                  <div className="flex items-center gap-1.5">
                    <StatusPill status={o.priority} />
                    <StatusPill status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
