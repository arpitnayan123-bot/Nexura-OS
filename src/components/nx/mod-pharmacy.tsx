"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { AlertTriangle, PackageOpen, Pill as PillIcon, Timer } from "lucide-react";
import { nx, useNx, timeAgo } from "./client";
import { Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";

/* ============================================================
   PHARMACY — verification queue with safety flags + alerts
   ============================================================ */

interface PharmacyData {
  verificationQueue: Array<{
    id: string;
    patient: { fullName: string; uhid: string; allergy: string | null };
    doctor: string | null;
    drug: string;
    dose: string | null;
    frequency: string | null;
    priority: string;
    status: string;
    at: string;
    allergies: string[];
    verified: boolean;
  }>;
  lowStock: Array<{ id: string; name: string; onHand: number; reorderLevel: number; unit: string }>;
  expiringSoon: Array<{
    id: string;
    name: string;
    expiryDate: string | null;
    batchNo: string | null;
  }>;
}

export function PharmacyQueue() {
  const { data, error, loading, refresh } = useNx<PharmacyData>("/api/nx/pharmacy", {
    pollMs: 20000,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function verify(id: string, to: string) {
    setBusyId(id);
    try {
      await nx("/api/nx/pharmacy", { method: "PATCH", body: JSON.stringify({ id, to }) });
      toast.success(
        to === "acknowledged" ? "Verified — interaction & dose check passed" : `Order → ${to}`,
      );
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loading rows={5} label="Loading pharmacy queue…" />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;
  if (!data) return <Empty title="No data" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Awaiting verification"
          value={data.verificationQueue.filter((v) => !v.verified).length}
          tone="warn"
          icon={<PillIcon className="h-4 w-4" />}
        />
        <Stat
          label="STAT orders"
          value={data.verificationQueue.filter((v) => v.priority === "stat").length}
          tone={data.verificationQueue.some((v) => v.priority === "stat") ? "critical" : "good"}
          icon={<Timer className="h-4 w-4" />}
        />
        <Stat
          label="Low stock items"
          value={data.lowStock.length}
          tone={data.lowStock.length ? "warn" : "good"}
          icon={<PackageOpen className="h-4 w-4" />}
        />
        <Stat
          label="Expiring ≤90d"
          value={data.expiringSoon.length}
          tone={data.expiringSoon.length ? "warn" : "good"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <Panel
        title="Verification queue"
        subtitle="Every order checked for allergies, interactions and duplicates before dispensing"
      >
        {data.verificationQueue.length === 0 ? (
          <Empty title="No medication orders" />
        ) : (
          <div className="space-y-2">
            {data.verificationQueue.map((v) => {
              const allergyHit = v.allergies.length > 0;
              return (
                <div
                  key={v.id}
                  className={`rounded-xl border p-3.5 ${v.priority === "stat" ? "border-crit-line bg-crit-soft" : allergyHit ? "border-accent-line bg-accent-soft" : "border-line bg-panel"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-ink">{v.drug}</p>
                        <StatusPill status={v.priority} />
                        <StatusPill status={v.status} />
                      </div>
                      <p className="text-[11px] text-ink-3">
                        {v.patient.fullName} · {v.patient.uhid} · {v.dose || "dose TBD"}{" "}
                        {v.frequency || ""} · by {v.doctor || "—"} · {timeAgo(v.at)}
                      </p>
                      {allergyHit && (
                        <p className="mt-1.5 flex items-center gap-1 rounded-md bg-crit-soft px-2 py-1 text-[11px] text-crit">
                          <AlertTriangle className="h-3 w-3" /> Patient allergies on file:{" "}
                          {v.allergies.join(", ")} — verify before dispensing
                        </p>
                      )}
                    </div>
                    {!v.verified && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => verify(v.id, "acknowledged")}
                          disabled={busyId === v.id}
                          className="rounded-md bg-good px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-good disabled:opacity-50"
                        >
                          Verify & release
                        </button>
                        <button
                          onClick={() => verify(v.id, "cancelled")}
                          disabled={busyId === v.id}
                          className="rounded-md border border-crit-line px-2 py-1 text-[11px] text-crit hover:bg-crit-soft disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Low stock" subtitle="Auto-flagged at reorder level">
          {data.lowStock.length === 0 ? (
            <Empty title="Stock levels healthy" />
          ) : (
            <div className="space-y-2">
              {data.lowStock.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-accent-line bg-accent-soft px-3 py-2"
                >
                  <p className="truncate text-xs text-ink">{s.name}</p>
                  <Pill tone="warn">
                    {s.onHand}/{s.reorderLevel} {s.unit}
                  </Pill>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Expiring soon" subtitle="Within 90 days — FEFO rotation suggested">
          {data.expiringSoon.length === 0 ? (
            <Empty title="Nothing expiring" />
          ) : (
            <div className="space-y-2">
              {data.expiringSoon.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2"
                >
                  <p className="truncate text-xs text-ink">
                    {m.name} <span className="text-ink-3">{m.batchNo}</span>
                  </p>
                  <Pill tone="warn">
                    {m.expiryDate ? new Date(m.expiryDate).toLocaleDateString("en-IN") : "—"}
                  </Pill>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
