"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { useBackLayer } from "./os/back";
import { NxModal, nxField } from "./os/modal";
import { FlaskConical, TestTube2 } from "lucide-react";
import { nx, useNx, timeAgo } from "./client";
import { Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";

/* ============================================================
   LABORATORY — specimen queue → result entry → validation
   Critical validation fires the escalation automation live.
   ============================================================ */

interface LabRow {
  id: string;
  patient: { fullName: string; uhid: string };
  doctor: string | null;
  test: string | null;
  priority: string;
  status: string;
  at: string;
  stage: string;
  tatMins: number | null;
  results: Array<{
    id: string;
    test: string;
    value: string | null;
    unit: string | null;
    flag: string;
    ref: unknown[];
    reportedAt: string | null;
  }>;
}
interface LabData {
  queue: LabRow[];
  specimenTasks: Array<{
    id: string;
    title: string;
    priority: string;
    dueAt: string | null;
    location: string | null;
  }>;
  stats: { stat: number; pending: number; processing: number; completed: number; critical: number };
}

export function LabQueue() {
  const { data, error, loading, refresh } = useNx<LabData>("/api/nx/labs", { pollMs: 20000 });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resultFor, setResultFor] = useState<LabRow | null>(null);

  /* the result-entry dialog is one step back */
  useBackLayer(Boolean(resultFor), "labs", "Laboratory", () => setResultFor(null));

  async function advance(id: string, to: string) {
    setBusyId(id);
    try {
      await nx("/api/nx/orders", { method: "PATCH", body: JSON.stringify({ id, to }) });
      toast.success(`Order → ${to.replace(/_/g, " ")}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loading rows={5} label="Loading laboratory worklist…" />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;
  if (!data) return <Empty title="No data" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="STAT"
          value={data.stats.stat}
          tone={data.stats.stat ? "critical" : "good"}
          icon={<TestTube2 className="h-4 w-4" />}
        />
        <Stat label="Awaiting collection" value={data.stats.pending} tone="info" />
        <Stat label="Processing" value={data.stats.processing} tone="warn" />
        <Stat label="Completed" value={data.stats.completed} tone="good" />
        <Stat
          label="Critical values"
          value={data.stats.critical}
          tone={data.stats.critical ? "critical" : "good"}
          icon={<FlaskConical className="h-4 w-4" />}
        />
      </div>

      {resultFor && (
        <ResultEntry
          row={resultFor}
          onClose={() => setResultFor(null)}
          onDone={() => {
            setResultFor(null);
            refresh();
          }}
        />
      )}

      <Panel
        title="Specimen collection tasks"
        subtitle="Auto-routed by order automation with SLA timers"
      >
        {data.specimenTasks.length === 0 ? (
          <Empty title="No pending collections" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.specimenTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2"
              >
                <Pill tone={t.priority === "critical" ? "critical" : "info"}>{t.priority}</Pill>
                <p className="text-xs text-ink-2">{t.title}</p>
                <span className="text-[10px] text-ink-3">{t.location || ""}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Worklist" subtitle="Ordered → acknowledged → processing → validated">
        {data.queue.length === 0 ? (
          <Empty title="No lab orders" />
        ) : (
          <div className="space-y-2">
            {data.queue.map((o) => (
              <div
                key={o.id}
                className={`rounded-xl border p-3.5 ${o.priority === "stat" ? "border-crit-line bg-crit-soft" : "border-line bg-panel"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink">{o.test}</p>
                      <StatusPill status={o.priority} />
                      <StatusPill status={o.status} />
                      {o.tatMins != null && <Pill>TAT {o.tatMins}m</Pill>}
                    </div>
                    <p className="text-[11px] text-ink-3">
                      {o.patient.fullName} · {o.patient.uhid} · by {o.doctor || "—"} ·{" "}
                      {timeAgo(o.at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {o.status === "ordered" && (
                      <button
                        onClick={() => advance(o.id, "acknowledged")}
                        disabled={busyId === o.id}
                        className="rounded-md border border-line-2 px-2 py-1 text-[11px] text-ink-2 hover:bg-inset disabled:opacity-50"
                      >
                        Acknowledge
                      </button>
                    )}
                    {o.status === "acknowledged" && (
                      <button
                        onClick={() => advance(o.id, "in_progress")}
                        disabled={busyId === o.id}
                        className="rounded-md border border-vio-line px-2 py-1 text-[11px] text-vio hover:bg-vio-soft disabled:opacity-50"
                      >
                        Collect specimen
                      </button>
                    )}
                    {o.status === "in_progress" && (
                      <button
                        onClick={() => setResultFor(o)}
                        className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink hover:bg-accent"
                      >
                        Enter result
                      </button>
                    )}
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
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ResultEntry({
  row,
  onClose,
  onDone,
}: {
  row: LabRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [testName, setTestName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [refMin, setRefMin] = useState("");
  const [refMax, setRefMax] = useState("");
  const [flag, setFlag] = useState("normal");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!testName.trim() || !value.trim()) {
      toast.error("Test name and value are required");
      return;
    }
    setBusy(true);
    try {
      const created = await nx<{ result: { id: string } }>("/api/nx/labs", {
        method: "POST",
        body: JSON.stringify({
          orderId: row.id,
          testName,
          value,
          unit,
          refMin: refMin ? Number(refMin) : undefined,
          refMax: refMax ? Number(refMax) : undefined,
          flag,
        }),
      });
      // Validate immediately (completes the lifecycle)
      await nx("/api/nx/orders", {
        method: "PATCH",
        body: JSON.stringify({
          id: row.id,
          to: "validate_result",
          resultId: created.result.id,
          flag,
          value,
        }),
      });
      toast.success(
        flag === "critical"
          ? "Critical value recorded — escalation automation fired"
          : "Result validated",
      );
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record result");
    } finally {
      setBusy(false);
    }
  }

  return (
    <NxModal
      open
      onClose={onClose}
      title={`Record result — ${row.test}`}
      subtitle={`${row.patient.fullName} · ${row.patient.uhid}`}
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
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent disabled:opacity-50"
          >
            {busy && <TestTube2 className="h-3.5 w-3.5 animate-pulse" />} Validate &amp; report
          </button>
        </>
      }
    >
      <div>
        <label htmlFor="lab-analyte" className="sr-only">
          Analyte
        </label>
        <input
          id="lab-analyte"
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
          placeholder="Analyte (e.g. Potassium)"
          className={nxField}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="lab-value" className="sr-only">
            Value
          </label>
          <input
            id="lab-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Value"
            inputMode="decimal"
            aria-invalid={Boolean(value) && Number.isNaN(Number(value))}
            className={nxField}
          />
        </div>
        <div>
          <label htmlFor="lab-unit" className="sr-only">
            Unit
          </label>
          <input
            id="lab-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="Unit (mmol/L)"
            className={nxField}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="lab-refmin" className="sr-only">
            Reference min
          </label>
          <input
            id="lab-refmin"
            value={refMin}
            onChange={(e) => setRefMin(e.target.value)}
            placeholder="Ref min"
            inputMode="decimal"
            className={nxField}
          />
        </div>
        <div>
          <label htmlFor="lab-refmax" className="sr-only">
            Reference max
          </label>
          <input
            id="lab-refmax"
            value={refMax}
            onChange={(e) => setRefMax(e.target.value)}
            placeholder="Ref max"
            inputMode="decimal"
            className={nxField}
          />
        </div>
      </div>
      <div className="flex gap-1.5" role="group" aria-label="Result flag">
        {["normal", "low", "high", "critical"].map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={flag === f}
            onClick={() => setFlag(f)}
            className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] capitalize transition ${flag === f ? "border-accent-line bg-accent-soft text-accent" : "border-line text-ink-3 hover:border-line-2"}`}
          >
            {f}
          </button>
        ))}
      </div>
      {flag === "critical" && (
        <p className="rounded-md border border-crit-line bg-crit-soft px-3 py-2 text-[11px] text-crit">
          Critical flag will instantly create a 15-min acknowledgement task, open a critical
          incident, and alert the care team.
        </p>
      )}
    </NxModal>
  );
}
