"use client";

import { useState } from "react";
import { Brush, PackageOpen, Wrench } from "lucide-react";
import { toast } from "./os/toast";
import { nx, useNx, timeAgo } from "./client";
import { Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";

/* ============================================================
   EQUIPMENT & SUPPLY — assets, maintenance, inventory
   ============================================================ */

interface SupplyData {
  supplies: Array<{
    id: string;
    name: string;
    category: string;
    unit: string;
    onHand: number;
    reorderLevel: number;
    batchNo: string | null;
    expiryDate: string | null;
    supplier: string | null;
    low: boolean;
    daysToExpiry: number | null;
  }>;
  equipment: Array<{
    id: string;
    name: string;
    category: string;
    assetTag: string;
    location: string | null;
    department: string | null;
    status: string;
    nextMaintenance: string | null;
    utilization: number;
    maintenanceDueDays: number | null;
    maintenanceOverdue: boolean;
  }>;
  stats: {
    lowStock: number;
    expiring90d: number;
    equipmentFault: number;
    maintenanceOverdue: number;
    avgUtilization: number;
  };
}

export function SupplyCenter() {
  const [tab, setTab] = useState<"inventory" | "equipment">("inventory");
  const { data, error, loading, refresh } = useNx<SupplyData>("/api/nx/supply", { pollMs: 45000 });

  async function adjust(id: string, delta: number) {
    try {
      await nx("/api/nx/supply", { method: "PATCH", body: JSON.stringify({ id, delta }) });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function setEquipStatus(id: string, status: string) {
    try {
      await nx("/api/nx/supply", {
        method: "PATCH",
        body: JSON.stringify({ kind: "equipment", id, status }),
      });
      toast.success(`Asset → ${status.replace(/_/g, " ")}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;
  if (!data) return <Empty title="No data" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Low stock"
          value={data.stats.lowStock}
          tone={data.stats.lowStock ? "warn" : "good"}
          icon={<PackageOpen className="h-4 w-4" />}
        />
        <Stat
          label="Expiring ≤90d"
          value={data.stats.expiring90d}
          tone={data.stats.expiring90d ? "warn" : "good"}
        />
        <Stat
          label="Faulty assets"
          value={data.stats.equipmentFault}
          tone={data.stats.equipmentFault ? "critical" : "good"}
          icon={<Wrench className="h-4 w-4" />}
        />
        <Stat
          label="Maint. overdue"
          value={data.stats.maintenanceOverdue}
          tone={data.stats.maintenanceOverdue ? "critical" : "good"}
        />
        <Stat label="Avg utilization" value={`${data.stats.avgUtilization}%`} tone="info" />
      </div>

      <div className="flex gap-2">
        {(["inventory", "equipment"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${tab === t ? "bg-accent-soft text-accent ring-1 ring-accent-line" : "text-ink-3 hover:bg-inset"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "inventory" ? (
        <Panel title="Inventory" subtitle="Lot-tracked · expiry monitored · shortage alerts">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-wider text-ink-3">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">On hand</th>
                  <th className="py-2 pr-3">Batch</th>
                  <th className="py-2 pr-3">Expiry</th>
                  <th className="py-2 pr-3">Adjust</th>
                </tr>
              </thead>
              <tbody>
                {data.supplies.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-b border-line ${s.low ? "bg-accent-soft" : ""}`}
                  >
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-ink">{s.name}</span>
                      {s.low && (
                        <Pill tone="warn" className="ml-2">
                          reorder
                        </Pill>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-3">{s.category}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-ink-2">
                      {s.onHand} <span className="text-ink-4">/ min {s.reorderLevel}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-ink-3">{s.batchNo || "—"}</td>
                    <td className="py-2.5 pr-3">
                      {s.daysToExpiry != null ? (
                        <Pill tone={s.daysToExpiry < 90 ? "warn" : "neutral"}>
                          {s.daysToExpiry}d
                        </Pill>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => adjust(s.id, -10)}
                          className="rounded border border-line-2 px-1.5 py-0.5 text-ink-3 hover:bg-inset"
                        >
                          −10
                        </button>
                        <button
                          onClick={() => adjust(s.id, 50)}
                          className="rounded border border-good-line px-1.5 py-0.5 text-good hover:bg-good-soft"
                        >
                          +50
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Panel title="Equipment & assets" subtitle="Location, status, calibration and utilization">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {data.equipment.map((e) => (
              <div
                key={e.id}
                className={`rounded-xl border p-3.5 ${e.status === "fault" ? "border-crit-line bg-crit-soft" : e.maintenanceOverdue ? "border-accent-line" : "border-line bg-panel"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-ink">{e.name}</p>
                    <p className="text-[11px] text-ink-3">
                      {e.assetTag} · {e.location || "—"} · {e.department || "—"}
                    </p>
                  </div>
                  <StatusPill status={e.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Pill tone={e.utilization > 85 ? "warn" : "info"}>util {e.utilization}%</Pill>
                  {e.maintenanceDueDays != null && (
                    <Pill
                      tone={
                        e.maintenanceOverdue
                          ? "critical"
                          : e.maintenanceDueDays < 7
                            ? "warn"
                            : "neutral"
                      }
                    >
                      {e.maintenanceOverdue
                        ? `overdue ${-e.maintenanceDueDays}d`
                        : `maint in ${e.maintenanceDueDays}d`}
                    </Pill>
                  )}
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  {e.status !== "in_service" && (
                    <button
                      onClick={() => setEquipStatus(e.id, "in_service")}
                      className="flex items-center gap-1 rounded-md border border-good-line px-2 py-1 text-[10px] text-good hover:bg-good-soft"
                    >
                      <Brush className="h-3 w-3" /> Return to service
                    </button>
                  )}
                  {e.status === "in_service" && (
                    <button
                      onClick={() => setEquipStatus(e.id, "maintenance")}
                      className="rounded-md border border-accent-line px-2 py-1 text-[10px] text-accent hover:bg-accent-soft"
                    >
                      Send to maintenance
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
