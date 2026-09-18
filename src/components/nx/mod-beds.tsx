"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { BrushCleaning, ClipboardCheck, SearchCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { nx, useNx, timeAgo } from "./client";
import { Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";

/* ============================================================
   BEDS & ROOMS — lifecycle-driven bed management
   occupied → discharge_pending → cleaning_required →
   cleaning_in_progress → inspection_required → ready → reserved
   ============================================================ */

interface Bed {
  id: string;
  number: string;
  status: string;
  patient: {
    id: string;
    name: string;
    uhid: string;
    age: number | null;
    gender: string;
    diagnosis: string | null;
    since: string;
  } | null;
  reservedFor: string | null;
  lastCleanedAt: string | null;
}
interface Ward {
  id: string;
  name: string;
  type: string;
  beds: Bed[];
}
interface BedData {
  wards: Ward[];
  counts: Record<string, number>;
  total: number;
  occupancyPct: number;
}

const NEXT_LABEL: Record<string, string> = {
  discharge_pending: "Discharge complete → needs cleaning",
  cleaning_required: "Start cleaning",
  cleaning_in_progress: "Cleaning done → inspect",
  inspection_required: "Pass inspection → ready",
  ready: "Reserve",
  reserved: "Check in patient",
};

const NEXT_STATE: Record<string, string> = {
  discharge_pending: "cleaning_required",
  cleaning_required: "cleaning_in_progress",
  cleaning_in_progress: "inspection_required",
  inspection_required: "ready",
};

export function BedBoard() {
  const { data, error, loading, refresh } = useNx<BedData>("/api/nx/beds", { pollMs: 20000 });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function transition(bedId: string, to: string) {
    setBusyId(bedId);
    try {
      await nx("/api/nx/beds", { method: "PATCH", body: JSON.stringify({ bedId, to }) });
      toast.success(
        to === "ready"
          ? "Bed ready — assignment nudge sent to bed management"
          : `Bed → ${to.replace(/_/g, " ")}`,
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Transition failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {[
          ["occupied", "info"],
          ["discharge_pending", "warn"],
          ["cleaning_required", "warn"],
          ["cleaning_in_progress", "violet"],
          ["inspection_required", "info"],
          ["ready", "good"],
          ["reserved", "violet"],
          ["available", "neutral"],
        ].map(([k, tone]) => (
          <div key={k} className="rounded-xl border border-line bg-panel px-3 py-2.5 text-center">
            <p className="text-lg font-bold tabular-nums text-ink">{data?.counts[k] ?? "—"}</p>
            <p className="mt-0.5 text-[10px] capitalize text-ink-3">
              {(k as string).replace(/_/g, " ")}
            </p>
            <div className="mt-1.5 flex justify-center">
              <StatusPill status={k} />
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <Loading rows={6} label="Loading bed board…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refresh} />
      ) : !data ? (
        <Empty title="No bed data" />
      ) : (
        data.wards.map((w) => (
          <Panel
            key={w.id}
            title={w.name}
            subtitle={`${w.beds.filter((b) => ["occupied", "discharge_pending"].includes(b.status)).length}/${w.beds.length} occupied`}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {w.beds.map((b) => (
                <div
                  key={b.id}
                  className={cn(
                    "rounded-lg border p-3",
                    b.status === "occupied"
                      ? "border-info-line bg-info-soft"
                      : b.status === "ready"
                        ? "border-good-line bg-good-soft"
                        : b.status === "cleaning_required" || b.status === "discharge_pending"
                          ? "border-accent-line bg-accent-soft"
                          : "border-line bg-panel",
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-semibold text-ink">{b.number}</p>
                    <StatusPill status={b.status} />
                  </div>
                  {b.patient ? (
                    <div className="mt-2 min-h-10">
                      <p className="truncate text-xs font-medium text-ink">{b.patient.name}</p>
                      <p className="truncate text-[10px] text-ink-3">
                        {b.patient.uhid} · {b.patient.diagnosis || "—"}
                      </p>
                      <p className="text-[10px] text-ink-4">since {timeAgo(b.patient.since)}</p>
                    </div>
                  ) : b.reservedFor ? (
                    <p className="mt-2 min-h-10 truncate text-[11px] text-vio">
                      reserved: {b.reservedFor}
                    </p>
                  ) : (
                    <p className="mt-2 min-h-10 text-[10px] text-ink-4">
                      {b.lastCleanedAt ? `cleaned ${timeAgo(b.lastCleanedAt)}` : "—"}
                    </p>
                  )}
                  <div className="mt-2">
                    {NEXT_STATE[b.status] ? (
                      <button
                        onClick={() => transition(b.id, NEXT_STATE[b.status])}
                        disabled={busyId === b.id}
                        className={cn(
                          "flex w-full items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium transition disabled:opacity-50",
                          b.status === "cleaning_required"
                            ? "border-vio-line text-vio hover:bg-vio-soft"
                            : b.status === "inspection_required"
                              ? "border-good-line text-good hover:bg-good-soft"
                              : "border-line-2 text-ink-2 hover:bg-inset",
                        )}
                      >
                        {b.status === "cleaning_required" ? (
                          <BrushCleaning className="h-3 w-3" />
                        ) : b.status === "inspection_required" ? (
                          <SearchCheck className="h-3 w-3" />
                        ) : (
                          <ClipboardCheck className="h-3 w-3" />
                        )}
                        {NEXT_LABEL[b.status]}
                      </button>
                    ) : b.status === "ready" ? (
                      <button
                        onClick={() => transition(b.id, "reserved")}
                        disabled={busyId === b.id}
                        className="w-full rounded-md border border-good-line px-1.5 py-1 text-[10px] font-medium text-good transition hover:bg-good-soft disabled:opacity-50"
                      >
                        Reserve bed
                      </button>
                    ) : b.status === "available" ? (
                      <div className="rounded-md border border-good-line px-1.5 py-1 text-center text-[10px] text-good">
                        unoccupied
                      </div>
                    ) : (
                      <div className="rounded-md border border-line px-1.5 py-1 text-center text-[10px] text-ink-4">
                        {b.status === "occupied" ? "in use" : "awaiting action"}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ))
      )}

      <Panel title="Room lifecycle policy">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-3">
          {[
            "occupied",
            "discharge_pending",
            "cleaning_required",
            "cleaning_in_progress",
            "inspection_required",
            "ready",
            "reserved",
          ].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-1.5">
              <StatusPill status={s} />
              {i < arr.length - 1 && <span className="text-ink-4">→</span>}
            </span>
          ))}
          <span className="text-ink-4">→ occupied…</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-3">
          Transitions are a deterministic state machine — invalid jumps are rejected server-side.
          Every move is audited, and passing inspection fires the{" "}
          <span className="text-ink-2">bed-ready assignment nudge</span> so the next patient is
          allocated without waiting.
        </p>
      </Panel>
    </div>
  );
}
