"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { Siren, Timer } from "lucide-react";
import { nx, useNx, timeAgo } from "./client";
import { NxModal, nxField } from "./os/modal";
import { Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";

/* ============================================================
   EMERGENCY DEPARTMENT — arrival board, acuity, time-to-care
   ============================================================ */

interface EdCase {
  id: string;
  patient: { id: string; fullName: string; uhid: string; age: number | null; gender: string; allergy: string | null };
  diagnosis: string | null; doctor: string | null; arrival: string; waitMins: number;
  acuity: { level: number; label: string; reason: string };
  location: string; disposition: string;
  latestVitals: { bp: string; pulse: number | null; spo2: number | null; temp: number | null; at: string } | null;
}
interface EdData {
  cases: EdCase[];
  stats: { active: number; level1: number; waitingSpace: number; avgWaitMins: number; longWaits: number };
}

const ACUITY_TONE = ["critical", "warn", "info"] as const;

export function EdBoard() {
  const { data, error, loading, refresh } = useNx<EdData>("/api/nx/ed", { pollMs: 15000 });
  const [noteFor, setNoteFor] = useState<EdCase | null>(null);

  if (loading) return <Loading rows={5} label="Loading emergency board…" />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;
  if (!data) return <Empty title="No data" />;

  const sorted = [...data.cases].sort((a, b) => a.acuity.level - b.acuity.level || b.waitMins - a.waitMins);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Active cases" value={data.stats.active} tone="info" icon={<Siren className="h-4 w-4" />} />
        <Stat label="Resuscitation (L1)" value={data.stats.level1} tone={data.stats.level1 ? "critical" : "good"} />
        <Stat label="Awaiting space" value={data.stats.waitingSpace} tone={data.stats.waitingSpace ? "warn" : "good"} />
        <Stat label="Avg wait" value={`${data.stats.avgWaitMins}m`} tone={data.stats.avgWaitMins > 30 ? "warn" : "default"} icon={<Timer className="h-4 w-4" />} />
        <Stat label="Waiting >60m" value={data.stats.longWaits} tone={data.stats.longWaits ? "critical" : "good"} />
      </div>

      <Panel title="Arrival & treatment board" subtitle="Acuity-ranked · live wait times · time-to-treatment tracking">
        {sorted.length === 0 ? (
          <Empty title="No ED cases in the last 24h" hint="Emergency admissions appear here the moment they are registered." />
        ) : (
          <div className="space-y-2">
            {sorted.map((c) => (
              <div key={c.id} className={`rounded-xl border p-4 ${c.acuity.level === 1 ? "border-crit-line bg-crit-soft" : "border-line bg-panel"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink">{c.patient.fullName}</p>
                      <Pill tone={ACUITY_TONE[c.acuity.level - 1]}>L{c.acuity.level} · {c.acuity.label}</Pill>
                      {c.patient.allergy && <Pill tone="critical">allergy: {c.patient.allergy}</Pill>}
                      <StatusPill status={c.disposition} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {c.patient.uhid} · {c.patient.age ?? "?"}y {c.patient.gender} · {c.diagnosis || "undifferentiated"} · {c.location} · {c.doctor || "unassigned"}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-4">Acuity: {c.acuity.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone={c.waitMins > 60 ? "critical" : c.waitMins > 30 ? "warn" : "good"}>wait {c.waitMins}m</Pill>
                    <button onClick={() => setNoteFor(c)} className="rounded-md border border-line-2 px-2 py-1 text-[11px] text-ink-2 hover:bg-inset">
                      Triage note
                    </button>
                  </div>
                </div>
                {c.latestVitals && (
                  <p className="mt-2 text-[11px] tabular-nums text-ink-3">
                    Vitals {timeAgo(c.latestVitals.at)}: BP {c.latestVitals.bp} · P{c.latestVitals.pulse ?? "?"} · SpO₂ {c.latestVitals.spo2 ?? "?"}% · {c.latestVitals.temp ?? "?"}°C
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {noteFor && (
        <TriageNoteModal
          row={noteFor}
          onClose={() => setNoteFor(null)}
          onDone={() => { setNoteFor(null); refresh(); }}
        />
      )}
    </div>
  );
}

function TriageNoteModal({ row, onClose, onDone }: { row: EdCase; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!note.trim()) {
      toast.error("Triage note is required");
      return;
    }
    setBusy(true);
    try {
      await nx("/api/nx/ed", { method: "PATCH", body: JSON.stringify({ id: row.id, note: note.trim() }) });
      toast.success("Triage note recorded");
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
      title={`Triage note — ${row.patient.fullName}`}
      subtitle={`${row.patient.uhid} · acuity L${row.acuity.level} ${row.acuity.label} · every note is audited`}
      footer={
        <>
          <button onClick={onClose} className="rounded-md border border-line-2 px-3 py-1.5 text-xs text-ink-2 hover:bg-inset">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent disabled:opacity-50">
            {busy ? "Saving…" : "Save note"}
          </button>
        </>
      }
    >
      <div>
        <label htmlFor="triage-note" className="sr-only">Triage note</label>
        <textarea id="triage-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Disposition note, observations, or instructions…" rows={4} autoFocus className={nxField} />
      </div>
    </NxModal>
  );
}
