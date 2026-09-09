"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { useBackLayer } from "./os/back";
import { ShieldAlert } from "lucide-react";
import { nx, useNx, timeAgo } from "./client";
import { NxModal, nxField } from "./os/modal";
import { Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";

/* ============================================================
   INCIDENT & ESCALATION CENTER
   ============================================================ */

interface Incident {
  id: string; severity: string; status: string; category: string; title: string; description: string | null;
  location: string | null; reportedBy: string | null; acknowledgedAt: string | null; resolvedAt: string | null; createdAt: string;
}
interface IncidentData {
  incidents: Incident[];
  counts: { open: number; critical: number; investigating: number; resolved30d: number };
}

const CATEGORIES = ["clinical", "medication", "safety", "equipment", "security", "operational", "it"];

export function IncidentCenter() {
  const { data, error, loading, refresh } = useNx<IncidentData>("/api/nx/incidents", { pollMs: 30000 });
  const [reportOpen, setReportOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  /* the report dialog is one step back */
  useBackLayer(reportOpen, "incidents", "Incidents", () => setReportOpen(false));

  async function patch(id: string, status: string) {
    setBusyId(id);
    try {
      await nx("/api/nx/incidents", { method: "PATCH", body: JSON.stringify({ id, status }) });
      toast.success(`Incident → ${status}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;
  if (!data) return <Empty title="No data" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open" value={data.counts.open} tone={data.counts.open ? "warn" : "good"} icon={<ShieldAlert className="h-4 w-4" />} />
        <Stat label="Critical" value={data.counts.critical} tone={data.counts.critical ? "critical" : "good"} />
        <Stat label="Investigating" value={data.counts.investigating} tone="info" />
        <Stat label="Resolved (30d)" value={data.counts.resolved30d} tone="good" />
      </div>

      <div className="flex justify-end">
        <button onClick={() => setReportOpen(true)} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent">Report incident</button>
      </div>

      {data.incidents.length === 0 ? (
        <Empty title="No incidents" hint="Reported and automation-generated incidents land here." />
      ) : (
        <div className="space-y-2">
          {data.incidents.map((i) => (
            <div key={i.id} className={`rounded-xl border p-4 ${i.severity === "critical" ? "border-crit-line bg-crit-soft" : i.severity === "major" ? "border-accent-line bg-accent-soft" : "border-line bg-panel"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-ink">{i.title}</p>
                    <StatusPill status={i.severity} />
                    <StatusPill status={i.status} />
                    <Pill>{i.category}</Pill>
                  </div>
                  {i.description && <p className="mt-1 text-xs text-ink-3">{i.description}</p>}
                  <p className="mt-1 text-[11px] text-ink-3">{i.location || "hospital-wide"} · reported by {i.reportedBy || "—"} · {timeAgo(i.createdAt)}{i.acknowledgedAt && ` · ack ${timeAgo(i.acknowledgedAt)}`}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {busyId === i.id ? (
                    <span className="text-[11px] text-ink-3">…</span>
                  ) : (
                    <>
                      {i.status === "open" && <button onClick={() => patch(i.id, "acknowledged")} className="rounded-md border border-vio-line px-2 py-1 text-[11px] text-vio hover:bg-vio-soft">Acknowledge</button>}
                      {(i.status === "acknowledged" || i.status === "open") && <button onClick={() => patch(i.id, "investigating")} className="rounded-md border border-line-2 px-2 py-1 text-[11px] text-ink-2 hover:bg-inset">Investigate</button>}
                      {["acknowledged", "investigating", "open"].includes(i.status) && <button onClick={() => patch(i.id, "resolved")} className="rounded-md border border-good-line px-2 py-1 text-[11px] text-good hover:bg-good-soft">Resolve</button>}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reportOpen && <ReportIncident onClose={() => setReportOpen(false)} onDone={() => { setReportOpen(false); refresh(); }} />}
    </div>
  );
}

function ReportIncident({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("minor");
  const [category, setCategory] = useState("operational");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    try {
      await nx("/api/nx/incidents", { method: "POST", body: JSON.stringify({ title, description, severity, category, location }) });
      toast.success("Incident reported — visible in Command Center");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <NxModal
      open
      onClose={onClose}
      title="Report incident"
      footer={
        <>
          <button onClick={onClose} className="rounded-md border border-line-2 px-3 py-1.5 text-xs text-ink-2 hover:bg-inset">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent disabled:opacity-50">{busy ? "Reporting…" : "Report"}</button>
        </>
      }
    >
      <div>
        <label htmlFor="inc-title" className="sr-only">What happened?</label>
        <input id="inc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What happened?" className={nxField} />
      </div>
      <div>
        <label htmlFor="inc-desc" className="sr-only">Details</label>
        <textarea id="inc-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details (optional)" rows={2} className={nxField} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="inc-sev" className="sr-only">Severity</label>
          <select id="inc-sev" value={severity} onChange={(e) => setSeverity(e.target.value)} className={nxField}>
            {["info", "minor", "major", "critical"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="inc-cat" className="sr-only">Category</label>
          <select id="inc-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={nxField}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="inc-loc" className="sr-only">Location</label>
        <input id="inc-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. ICU Bay 2)" className={nxField} />
      </div>
    </NxModal>
  );
}
