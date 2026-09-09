"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { ShieldAlert } from "lucide-react";
import { nx, useNx, timeAgo } from "./client";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-line bg-[#0d1526] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-ink">Report incident</h3>
        <div className="mt-3 space-y-2.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What happened?" className="w-full rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details (optional)" rows={2} className="w-full rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line" />
          <div className="grid grid-cols-2 gap-2">
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none">
              {["info", "minor", "major", "critical"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g. ICU Bay 2)" className="w-full rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-line-2 px-3 py-1.5 text-xs text-ink-2 hover:bg-inset">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent disabled:opacity-50">{busy ? "Reporting…" : "Report"}</button>
        </div>
      </div>
    </div>
  );
}
