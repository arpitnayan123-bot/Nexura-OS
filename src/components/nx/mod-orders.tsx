"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { useBackLayer } from "./os/back";
import { Plus, ScrollText } from "lucide-react";
import { nx, useNx, timeAgo } from "./client";
import { NxModal, nxField } from "./os/modal";
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
  results: Array<{
    id: string;
    test: string;
    value: string | null;
    unit: string | null;
    flag: string;
    ref: unknown[];
  }>;
  timeline: Array<{
    from: string | null;
    to: string;
    actor: string | null;
    role: string | null;
    at: string;
    note: string | null;
  }>;
}
interface OrdersData {
  orders: OrderRow[];
  counts: { stat: number; active: number; completed: number; criticalResults: number };
}

const TYPES = ["all", "lab", "imaging", "medication", "procedure", "referral"] as const;

export function OrdersCenter() {
  const [type, setType] = useState<string>("all");
  const { data, error, loading, refresh } = useNx<OrdersData>(
    `/api/nx/orders${type !== "all" ? `?type=${type}` : ""}`,
    { pollMs: 25000 },
  );
  const [newOpen, setNewOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /* dialogs and expanded details are one step back each */
  useBackLayer(newOpen, "orders", "Orders & Results", () => setNewOpen(false));
  useBackLayer(Boolean(expanded), "orders", "Orders & Results", () => setExpanded(null));

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

  const NEXT: Record<string, string> = {
    ordered: "acknowledged",
    acknowledged: "in_progress",
    in_progress: "completed",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="STAT active"
          value={data?.counts.stat ?? "—"}
          tone={data?.counts.stat ? "critical" : "good"}
        />
        <Stat label="Active" value={data?.counts.active ?? "—"} tone="info" />
        <Stat label="Completed" value={data?.counts.completed ?? "—"} tone="good" />
        <Stat
          label="Critical results"
          value={data?.counts.criticalResults ?? "—"}
          tone={data?.counts.criticalResults ? "critical" : "good"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-lg px-3 py-1.5 text-xs capitalize transition ${type === t ? "bg-accent-soft text-accent ring-1 ring-accent-line" : "text-ink-3 hover:bg-inset"}`}
          >
            {t}
          </button>
        ))}
        <button
          onClick={() => setNewOpen(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent"
        >
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
            <div
              key={o.id}
              className={`rounded-xl border p-3.5 ${o.priority === "stat" ? "border-crit-line bg-crit-soft" : "border-line bg-panel"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-ink">{o.details?.testName || o.type}</p>
                    <Pill tone="info">{o.type}</Pill>
                    <StatusPill status={o.priority} />
                    <StatusPill status={o.status} />
                  </div>
                  <p className="text-[11px] text-ink-3">
                    {o.patient.fullName} · {o.patient.uhid} · by {o.doctor || "—"} · {timeAgo(o.at)}
                  </p>
                </button>
                <div className="flex items-center gap-1.5">
                  {NEXT[o.status] && (
                    <button
                      onClick={() => advance(o.id, NEXT[o.status])}
                      disabled={busyId === o.id}
                      className="rounded-md border border-line-2 px-2 py-1 text-[11px] text-ink-2 hover:bg-inset disabled:opacity-50"
                    >
                      → {NEXT[o.status].replace(/_/g, " ")}
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-ink-3 hover:text-ink-2"
                  >
                    <ScrollText className="h-3 w-3" /> audit
                  </button>
                </div>
              </div>

              {o.results.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {o.results.map((r) => (
                    <Pill
                      key={r.id}
                      tone={
                        r.flag === "critical" ? "critical" : r.flag === "normal" ? "good" : "warn"
                      }
                    >
                      {r.test}: {r.value} {r.unit} [{r.flag}]
                    </Pill>
                  ))}
                </div>
              )}

              {expanded === o.id && (
                <div className="mt-3 rounded-lg border border-line bg-panel p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3">
                    Lifecycle audit
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {o.timeline.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <Pill tone="info">{e.to}</Pill>
                        <span className="text-ink-3">
                          {e.actor} ({e.role})
                        </span>
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

      {newOpen && (
        <NewOrder
          onClose={() => setNewOpen(false)}
          onDone={() => {
            setNewOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function NewOrder({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { data } = useNx<{ patients: Array<{ id: string; fullName: string; uhid: string }> }>(
    "/api/nx/patients?take=30",
  );
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
      await nx("/api/nx/orders", {
        method: "POST",
        body: JSON.stringify({ patientId, orderType, testName, priority, notes }),
      });
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
    <NxModal
      open
      onClose={onClose}
      title="New order"
      subtitle="Creating an order routes it automatically — lab → specimen collection, medication → pharmacist verification."
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-md border border-line-2 px-3 py-1.5 text-xs text-ink-2 hover:bg-inset"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create order"}
          </button>
        </>
      }
    >
      <div>
        <label htmlFor="ord-patient" className="sr-only">
          Patient
        </label>
        <select
          id="ord-patient"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className={nxField}
        >
          <option value="">Select patient…</option>
          {data?.patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName} · {p.uhid}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="ord-type" className="sr-only">
            Order type
          </label>
          <select
            id="ord-type"
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
            className={nxField}
          >
            {["lab", "imaging", "medication", "procedure", "referral"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ord-priority" className="sr-only">
            Priority
          </label>
          <select
            id="ord-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={nxField}
          >
            {["routine", "urgent", "stat"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="ord-test" className="sr-only">
          Test or procedure
        </label>
        <input
          id="ord-test"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          placeholder={
            orderType === "medication"
              ? "Drug & dose (e.g. Ceftriaxone 1g IV BD)"
              : "Test / procedure"
          }
          className={nxField}
        />
      </div>
      <div>
        <label htmlFor="ord-notes" className="sr-only">
          Clinical note
        </label>
        <textarea
          id="ord-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Clinical note (optional)"
          rows={2}
          className={nxField}
        />
      </div>
    </NxModal>
  );
}
