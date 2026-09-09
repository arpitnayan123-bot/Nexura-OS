"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { Plus, ScrollText } from "lucide-react";
import { nx, useNx, timeAgo } from "./client";
import { Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";

/* ============================================================
   ORDERS & RESULTS — one unified order lifecycle
   ============================================================ */

interface OrderRow {
  id: string;
  patient: { fullName: string; uhid: string };
  doctor: string | null;
  type: string;
  details: { testName?: string; dose?: string; frequency?: string; notes?: string };
  priority: string;
  status: string;
  at: string;
  results: Array<{ id: string; test: string; value: string | null; unit: string | null; flag: string; ref: unknown[] }>;
  timeline: Array<{ from: string | null; to: string; actor: string | null; role: string | null; at: string; note: string | null }>;
}
interface OrdersData {
  orders: OrderRow[];
  counts: { stat: number; active: number; completed: number; criticalResults: number };
}

const TYPES = ["all", "lab", "imaging", "medication", "procedure", "referral"] as const;

export function OrdersCenter() {
  const [type, setType] = useState<string>("all");
  const { data, error, loading, refresh } = useNx<OrdersData>(`/api/nx/orders${type !== "all" ? `?type=${type}` : ""}`, { pollMs: 25000 });
  const [newOpen, setNewOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function advance(id: string, to: string) {
    setBusyId(id);
    try {
      await nx("/api/nx/orders", { method: "PATCH", body: JSON.stringify({ id, to }) });
      toast.success(`Order → ${to.replace(/_/g, " ")} — audited`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  const NEXT: Record<string, string> = { ordered: "acknowledged", acknowledged: "in_progress", in_progress: "completed" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="STAT active" value={data?.counts.stat ?? "—"} tone={data?.counts.stat ? "critical" : "good"} />
        <Stat label="Active" value={data?.counts.active ?? "—"} tone="info" />
        <Stat label="Completed" value={data?.counts.completed ?? "—"} tone="good" />
        <Stat label="Critical results" value={data?.counts.criticalResults ?? "—"} tone={data?.counts.criticalResults ? "critical" : "good"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} className={`rounded-lg px-3 py-1.5 text-xs capitalize transition ${type === t ? "bg-accent-soft text-accent ring-1 ring-accent-line" : "text-ink-3 hover:bg-inset"}`}>
            {t}
          </button>
        ))}
        <button onClick={() => setNewOpen(true)} className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent">
          <Plus className="h-3.5 w-3.5" /> New order
        </button>
      </div>

      {loading ? (
        <Loading rows={6} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refresh} />
      ) : !data?.orders.length ? (
        <Empty title="No orders match" hint="Create one with the New order button." />
      ) : (
        <div className="space-y-2">
          {data.orders.map((o) => (
            <div key={o.id} className={`rounded-xl border p-3.5 ${o.priority === "stat" ? "border-crit-line bg-crit-soft" : "border-line bg-panel"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button className="min-w-0 flex-1 text-left" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-ink">{o.details?.testName || o.type}</p>
                    <Pill tone="info">{o.type}</Pill>
                    <StatusPill status={o.priority} />
                    <StatusPill status={o.status} />
                  </div>
                  <p className="text-[11px] text-ink-3">{o.patient.fullName} · {o.patient.uhid} · by {o.doctor || "—"} · {timeAgo(o.at)}</p>
                </button>
                <div className="flex items-center gap-1.5">
                  {NEXT[o.status] && (
                    <button onClick={() => advance(o.id, NEXT[o.status])} disabled={busyId === o.id} className="rounded-md border border-line-2 px-2 py-1 text-[11px] text-ink-2 hover:bg-inset disabled:opacity-50">
                      → {NEXT[o.status].replace(/_/g, " ")}
                    </button>
                  )}
                  <button onClick={() => setExpanded(expanded === o.id ? null : o.id)} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-ink-3 hover:text-ink-2">
                    <ScrollText className="h-3 w-3" /> audit
                  </button>
                </div>
              </div>

              {o.results.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {o.results.map((r) => (
                    <Pill key={r.id} tone={r.flag === "critical" ? "critical" : r.flag === "normal" ? "good" : "warn"}>
                      {r.test}: {r.value} {r.unit} [{r.flag}]
                    </Pill>
                  ))}
                </div>
              )}

              {expanded === o.id && (
                <div className="mt-3 rounded-lg border border-line bg-panel p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3">Lifecycle audit</p>
                  <div className="mt-2 space-y-1.5">
                    {o.timeline.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <Pill tone="info">{e.to}</Pill>
                        <span className="text-ink-3">{e.actor} ({e.role})</span>
                        <span className="text-ink-4">{timeAgo(e.at)}</span>
                        {e.note && <span className="truncate text-ink-3">— {e.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {newOpen && <NewOrder onClose={() => setNewOpen(false)} onDone={() => { setNewOpen(false); refresh(); }} />}
    </div>
  );
}

function NewOrder({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { data } = useNx<{ patients: Array<{ id: string; fullName: string; uhid: string }> }>("/api/nx/patients?take=30");
  const [patientId, setPatientId] = useState("");
  const [orderType, setOrderType] = useState("lab");
  const [testName, setTestName] = useState("");
  const [priority, setPriority] = useState("routine");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!patientId || !testName.trim()) {
      toast.error("Patient and order description are required");
      return;
    }
    setBusy(true);
    try {
      await nx("/api/nx/orders", { method: "POST", body: JSON.stringify({ patientId, orderType, testName, priority, notes }) });
      toast.success("Order created — routed to the right worklist with SLA");
      onDone();
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 403) toast.error("Ordering requires a doctor role — switch to DR.RAJESH");
      else toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-line bg-[#0d1526] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-ink">New order</h3>
        <p className="text-[11px] text-ink-3">Creating an order routes it automatically — lab → specimen collection, medication → pharmacist verification.</p>
        <div className="mt-3 space-y-2.5">
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line">
            <option value="">Select patient…</option>
            {data?.patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} · {p.uhid}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line">
              {["lab", "imaging", "medication", "procedure", "referral"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line">
              {["routine", "urgent", "stat"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <input value={testName} onChange={(e) => setTestName(e.target.value)} placeholder={orderType === "medication" ? "Drug & dose (e.g. Ceftriaxone 1g IV BD)" : "Test / procedure"} className="w-full rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Clinical note (optional)" rows={2} className="w-full rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-line-2 px-3 py-1.5 text-xs text-ink-2 hover:bg-inset">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent disabled:opacity-50">
            {busy ? "Creating…" : "Create order"}
          </button>
        </div>
      </div>
    </div>
  );
}
