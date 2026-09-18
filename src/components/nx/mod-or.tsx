"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { CheckCircle2, Circle, Syringe } from "lucide-react";
import { cn } from "@/lib/utils";
import { nx, useNx, fmtClock } from "./client";
import { Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";

/* ============================================================
   OPERATING ROOMS — schedule, pre-op readiness, turnover
   ============================================================ */

interface OrCase {
  id: string;
  otRoomNumber: string;
  procedureName: string;
  patientUhid: string;
  status: string;
  plannedStartTime: string | null;
  actualStartTime: string | null;
  estimatedDurationMin: number | null;
  surgeon?: { name: string } | null;
  anesthetist?: { name: string } | null;
  patient?: {
    fullName: string;
    age: number | null;
    gender: string;
    bloodGroup: string | null;
    allergy: string | null;
  } | null;
  checklist: Record<string, boolean>;
  readiness: { pct: number; missing: string[] };
}

const CHECK_ITEMS: Array<[string, string]> = [
  ["consent", "Consent signed"],
  ["fasted", "Fasting confirmed"],
  ["site_marked", "Site marked"],
  ["allergies_verified", "Allergies verified"],
  ["blood_arranged", "Blood arranged"],
  ["equipment_checked", "Equipment checked"],
];

export function OrBoard() {
  const { data, error, loading, refresh } = useNx<OrData>("/api/nx/or");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      await nx("/api/nx/or", { method: "PATCH", body: JSON.stringify({ id, ...body }) });
      toast.success("Operating room updated — audited");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loading rows={5} label="Loading OR schedule…" />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;
  if (!data) return <Empty title="No data" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Planned"
          value={data.stats.planned}
          tone="info"
          icon={<Syringe className="h-4 w-4" />}
        />
        <Stat label="In progress" value={data.stats.inProgress} tone="warn" />
        <Stat label="Completed" value={data.stats.completed} tone="good" />
      </div>

      {data.rooms.length === 0 ? (
        <Empty title="No OR cases scheduled" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.rooms.map((room) => (
            <Panel
              key={room.room}
              title={`OT ${room.room}`}
              subtitle={`${room.cases.length} case(s) today`}
            >
              <div className="space-y-3">
                {room.cases.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "rounded-xl border p-3.5",
                      c.status === "in_progress"
                        ? "border-accent-line bg-accent-soft"
                        : "border-line bg-panel",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{c.procedureName}</p>
                        <p className="text-[11px] text-ink-3">
                          {c.patient?.fullName || c.patientUhid}{" "}
                          {c.patient &&
                            `· ${c.patient.age ?? "?"}y ${c.patient.gender} ${c.patient.bloodGroup || "?"}`}
                          {c.patient?.allergy && (
                            <span className="text-crit"> · allergy: {c.patient.allergy}</span>
                          )}
                        </p>
                        <p className="text-[11px] text-ink-3">
                          Surgeon {c.surgeon?.name || "TBD"}{" "}
                          {c.anesthetist && `· Anesth. ${c.anesthetist.name}`} · start{" "}
                          {c.plannedStartTime ? fmtClock(c.plannedStartTime) : "TBD"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Pill
                          tone={
                            c.readiness.pct === 100
                              ? "good"
                              : c.readiness.pct >= 60
                                ? "warn"
                                : "critical"
                          }
                        >
                          ready {c.readiness.pct}%
                        </Pill>
                        <StatusPill status={c.status} />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3">
                      {CHECK_ITEMS.map(([key, label]) => {
                        const done = Boolean(c.checklist[key]);
                        return (
                          <button
                            key={key}
                            onClick={() => patch(c.id, { checklistKey: key, value: !done })}
                            disabled={busyId === c.id}
                            className={cn(
                              "flex items-center gap-1.5 rounded-md border px-2 py-1 text-left text-[10px] transition disabled:opacity-50",
                              done
                                ? "border-good-line bg-good-soft text-good"
                                : "border-line text-ink-3 hover:border-line-2",
                            )}
                          >
                            {done ? (
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                            ) : (
                              <Circle className="h-3 w-3 shrink-0" />
                            )}
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      {c.status === "planned" && (
                        <>
                          <button
                            onClick={() => patch(c.id, { status: "in_progress" })}
                            disabled={busyId === c.id}
                            className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-ink hover:bg-accent disabled:opacity-50"
                          >
                            Start case
                          </button>
                          <button
                            onClick={() => patch(c.id, { status: "postponed" })}
                            disabled={busyId === c.id}
                            className="rounded-md border border-line-2 px-2.5 py-1 text-[11px] text-ink-2 hover:bg-inset disabled:opacity-50"
                          >
                            Postpone
                          </button>
                        </>
                      )}
                      {c.status === "in_progress" && (
                        <button
                          onClick={() => patch(c.id, { status: "completed" })}
                          disabled={busyId === c.id}
                          className="rounded-md bg-good px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-good disabled:opacity-50"
                        >
                          Complete case
                        </button>
                      )}
                      {c.status === "postponed" && (
                        <button
                          onClick={() => patch(c.id, { status: "planned" })}
                          disabled={busyId === c.id}
                          className="rounded-md border border-line-2 px-2.5 py-1 text-[11px] text-ink-2 hover:bg-inset disabled:opacity-50"
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

interface OrData {
  rooms: Array<{ room: string; cases: OrCase[] }>;
  stats: { planned: number; inProgress: number; completed: number };
}
