"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Bot,
  CircleDot,
  Droplets,
  HeartPulse,
  Loader2,
  Radio,
  Siren,
  Stethoscope,
  Users,
} from "lucide-react";
import { nx, useNx, timeAgo } from "./client";
import {
  AiBanner,
  Empty,
  ErrorState,
  Loading,
  MiniBar,
  Panel,
  Pill,
  Stat,
  StatusPill,
} from "./bits";

/* ============================================================
   COMMAND CENTER — real-time hospital awareness
   ============================================================ */

interface Overview {
  hospital: { name?: string };
  census: {
    admitted: number;
    admittedToday: number;
    icu: number;
    edActive: number;
    delayedDischarges: Array<{
      id: string;
      patient: string;
      uhid: string;
      expected: string;
      diagnosis: string | null;
      daysOver: number;
    }>;
  };
  beds: {
    total: number;
    occupancyPct: number;
    counts: Record<string, number>;
    cleaningQueue: number;
    wards: Array<{ id: string; name: string; total: number; occupied: number }>;
  };
  ed: {
    active: number;
    waiting: number;
    pressure: string;
    cases: Array<{
      id: string;
      patient: string;
      uhid: string;
      diagnosis: string | null;
      since: string;
      bed: string | null;
    }>;
  };
  or: {
    planned: number;
    inProgress: number;
    completed: number;
    upcoming: Array<{
      id: string;
      room: string;
      procedure: string;
      patientUhid: string;
      start: string | null;
      surgeon: string;
      status: string;
    }>;
  };
  staffing: { onDuty: number; byRole: Record<string, number> };
  equipmentOutages: Array<{ id: string; name: string; status: string; location: string | null }>;
  criticalAlerts: Array<{
    id: string;
    title: string;
    dueAt: string | null;
    ownerRole: string | null;
    ownerName: string | null;
    escalationLevel: number;
    reason: string | null;
  }>;
  incidents: Array<{
    id: string;
    severity: string;
    status: string;
    category: string;
    title: string;
    location: string | null;
    createdAt: string;
  }>;
  revenueToday: { collected: number; pending: number };
  activityFeed: Array<{ id: string; actor: string; role: string; action: string; at: string }>;
  bottlenecks: Array<{ area: string; detail: string; severity: string }>;
}

const BED_SEGMENTS: Array<[string, string]> = [
  ["occupied", "bg-info"],
  ["discharge_pending", "bg-accent"],
  ["cleaning_required", "bg-warn"],
  ["cleaning_in_progress", "bg-vio"],
  ["inspection_required", "bg-info"],
  ["ready", "bg-good"],
  ["reserved", "bg-good"],
  ["available", "bg-inset"],
];

export function CommandCenter({ onOpenModule }: { onOpenModule: (m: string) => void }) {
  const { data, error, loading, refresh } = useNx<Overview>("/api/nx/overview", { pollMs: 20000 });
  const [aiBusy, setAiBusy] = useState(false);
  const [ai, setAi] = useState<{
    ops: {
      headline: string;
      actions: Array<{ area: string; recommendation: string; why: string }>;
      watchlist: string[];
    };
    disclaimer: string;
  } | null>(null);

  async function askOps() {
    setAiBusy(true);
    setAi(null);
    try {
      const res = await nx<{
        ops: {
          headline: string;
          actions: Array<{ area: string; recommendation: string; why: string }>;
          watchlist: string[];
        };
        disclaimer: string;
      }>("/api/nx/ai", {
        method: "POST",
        body: JSON.stringify({ feature: "ops_recommend" }),
      });
      setAi(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setAiBusy(false);
    }
  }

  if (loading) return <Loading rows={6} label="Syncing live hospital state…" />;
  if (error)
    return (
      <ErrorState message={`Command center feed failed: ${error.message}`} onRetry={refresh} />
    );
  if (!data) return <Empty title="No data" />;

  const totalBeds = data.beds.total || 1;

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat
          label="Census"
          value={data.census.admitted}
          sub={`${data.census.admittedToday} admitted today`}
          icon={<Users className="h-4 w-4" />}
        />
        <Stat
          label="ICU"
          value={data.census.icu}
          sub="critical care"
          tone="info"
          icon={<HeartPulse className="h-4 w-4" />}
        />
        <Stat
          label="ED Active"
          value={data.ed.active}
          sub={`pressure: ${data.ed.pressure}`}
          tone={
            data.ed.pressure === "high"
              ? "critical"
              : data.ed.pressure === "moderate"
                ? "warn"
                : "good"
          }
          icon={<Siren className="h-4 w-4" />}
        />
        <Stat
          label="Occupancy"
          value={`${data.beds.occupancyPct}%`}
          sub={`${data.beds.counts.ready || 0} ready beds`}
          tone={data.beds.occupancyPct > 85 ? "warn" : "default"}
          icon={<BedDouble className="h-4 w-4" />}
        />
        <Stat
          label="OR Today"
          value={`${data.or.inProgress}/${data.or.planned}`}
          sub={`${data.or.completed} completed`}
          tone="info"
          icon={<Stethoscope className="h-4 w-4" />}
        />
        <Stat
          label="Staff on duty"
          value={data.staffing.onDuty}
          sub={`${Object.keys(data.staffing.byRole).length} roles covered`}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Bed map strip */}
        <Panel
          title="Bed lifecycle map"
          subtitle={`${data.beds.total} beds · ${data.beds.cleaningQueue} in cleaning queue`}
          actions={
            <button
              onClick={() => onOpenModule("beds")}
              className="flex items-center gap-1 text-xs text-accent hover:text-accent"
            >
              Open board <ArrowRight className="h-3 w-3" />
            </button>
          }
          className="xl:col-span-2"
        >
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-inset">
            {BED_SEGMENTS.map(([key, color]) => {
              const n = data.beds.counts[key] || 0;
              return n > 0 ? (
                <div
                  key={key}
                  className={color}
                  style={{ width: `${(n / totalBeds) * 100}%` }}
                  title={`${key}: ${n}`}
                />
              ) : null;
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {BED_SEGMENTS.map(([key, color]) => {
              const n = data.beds.counts[key] || 0;
              if (!n) return null;
              return (
                <span key={key} className="flex items-center gap-1.5 text-[11px] text-ink-3">
                  <CircleDot className={`h-3 w-3 ${color.replace("bg-", "text-")}`} />
                  {key.replace(/_/g, " ")} <span className="font-semibold text-ink">{n}</span>
                </span>
              );
            })}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.beds.wards.map((w) => (
              <div key={w.id} className="rounded-lg border border-line bg-panel px-3 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-2">{w.name}</span>
                  <span className="tabular-nums text-ink-3">
                    {w.occupied}/{w.total}
                  </span>
                </div>
                <div className="mt-2">
                  <MiniBar
                    pct={(w.occupied / (w.total || 1)) * 100}
                    tone={w.occupied / (w.total || 1) > 0.9 ? "critical" : "brand"}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Critical alerts */}
        <Panel
          title="Critical alerts"
          subtitle="Unacknowledged — escalation armed"
          tone={data.criticalAlerts.length > 0 ? "critical" : "default"}
        >
          {data.criticalAlerts.length === 0 ? (
            <Empty
              title="No critical alerts"
              hint="All critical results and escalations are acknowledged."
            />
          ) : (
            <div className="space-y-2">
              {data.criticalAlerts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onOpenModule("tasks")}
                  className="w-full rounded-lg border border-crit-line bg-crit-soft px-3 py-2.5 text-left transition hover:bg-crit-soft"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium leading-snug text-crit">{a.title}</p>
                    {a.escalationLevel > 0 && <Pill tone="critical">L{a.escalationLevel}</Pill>}
                  </div>
                  <p className="mt-1 text-[11px] text-crit">{a.reason}</p>
                  <p className="mt-1 text-[11px] text-ink-3">
                    {a.ownerName || a.ownerRole} · due {a.dueAt ? timeAgo(a.dueAt) : "—"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* ED pressure */}
        <Panel
          title="Emergency department"
          subtitle={`${data.ed.pressure} pressure`}
          actions={
            <button
              onClick={() => onOpenModule("ed")}
              className="text-xs text-accent hover:text-accent"
            >
              Board <ArrowRight className="inline h-3 w-3" />
            </button>
          }
        >
          {data.ed.cases.length === 0 ? (
            <Empty title="No active ED cases" />
          ) : (
            <div className="space-y-2">
              {data.ed.cases.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-ink">
                      {c.patient} <span className="text-ink-3">· {c.uhid}</span>
                    </p>
                    <p className="truncate text-[11px] text-ink-3">
                      {c.diagnosis || "undifferentiated"} · {c.bed || "awaiting space"}
                    </p>
                  </div>
                  <Pill tone="info">{timeAgo(c.since)}</Pill>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* OR board */}
        <Panel
          title="Operating rooms"
          subtitle={`${data.or.planned} planned · ${data.or.inProgress} running`}
          actions={
            <button
              onClick={() => onOpenModule("or")}
              className="text-xs text-accent hover:text-accent"
            >
              Schedule <ArrowRight className="inline h-3 w-3" />
            </button>
          }
        >
          {data.or.upcoming.length === 0 ? (
            <Empty title="No cases scheduled" />
          ) : (
            <div className="space-y-2">
              {data.or.upcoming.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-ink">
                      OT {s.room} · {s.procedure}
                    </p>
                    <p className="truncate text-[11px] text-ink-3">
                      {s.surgeon} ·{" "}
                      {s.start
                        ? new Date(s.start).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "TBD"}
                    </p>
                  </div>
                  <StatusPill status={s.status} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Bottlenecks + equipment */}
        <Panel title="Flow & bottlenecks" subtitle="Detected live from operational state">
          {data.bottlenecks.length === 0 && data.equipmentOutages.length === 0 ? (
            <Empty
              title="No bottlenecks detected"
              hint="Patient flow, beds and equipment are all nominal."
            />
          ) : (
            <div className="space-y-2">
              {data.bottlenecks.map((b, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-line bg-panel px-3 py-2"
                >
                  <AlertTriangle
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${b.severity === "high" ? "text-crit" : b.severity === "medium" ? "text-accent" : "text-ink-3"}`}
                  />
                  <div>
                    <p className="text-xs font-medium text-ink">{b.area}</p>
                    <p className="text-[11px] text-ink-3">{b.detail}</p>
                  </div>
                </div>
              ))}
              {data.equipmentOutages.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2"
                >
                  <p className="truncate text-xs text-ink-2">
                    {e.name} <span className="text-ink-3">· {e.location}</span>
                  </p>
                  <StatusPill status={e.status} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Delayed discharges */}
        <Panel
          title="Delayed discharges"
          subtitle="Past expected discharge date"
          tone={data.census.delayedDischarges.length > 0 ? "attention" : "default"}
        >
          {data.census.delayedDischarges.length === 0 ? (
            <Empty title="All discharges on schedule" />
          ) : (
            <div className="space-y-2">
              {data.census.delayedDischarges.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-accent-line bg-accent-soft px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-ink">
                      {d.patient} <span className="text-ink-3">{d.uhid}</span>
                    </p>
                    <p className="truncate text-[11px] text-ink-3">{d.diagnosis || "—"}</p>
                  </div>
                  <Pill tone="warn">+{d.daysOver}d</Pill>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Incidents */}
        <Panel
          title="Open incidents"
          actions={
            <button
              onClick={() => onOpenModule("incidents")}
              className="text-xs text-accent hover:text-accent"
            >
              Center <ArrowRight className="inline h-3 w-3" />
            </button>
          }
        >
          {data.incidents.length === 0 ? (
            <Empty title="No open incidents" />
          ) : (
            <div className="space-y-2">
              {data.incidents.slice(0, 5).map((i) => (
                <div key={i.id} className="rounded-lg border border-line bg-panel px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-ink">{i.title}</p>
                    <StatusPill status={i.severity} />
                  </div>
                  <p className="text-[11px] text-ink-3">
                    {i.location || i.category} · {timeAgo(i.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Live activity */}
        <Panel
          title="Activity feed"
          subtitle="Audited system-wide actions"
          actions={<Radio className="h-3.5 w-3.5 animate-pulse text-good" />}
        >
          <div className="max-h-56 space-y-1.5 overflow-y-auto nx-scroll pr-1">
            {data.activityFeed.map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-[11px]">
                <Droplets className="h-3 w-3 shrink-0 text-ink-4" />
                <span className="font-medium text-ink-2">{f.actor}</span>
                <span className="truncate text-ink-3">{f.action}</span>
                <span className="ml-auto shrink-0 text-ink-4">{timeAgo(f.at)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Nexura Intelligence */}
      <Panel
        title="Nexura Intelligence — operational recommendations"
        subtitle="AI analysis of live state · coordination advice only, humans decide"
        actions={
          <button
            onClick={askOps}
            disabled={aiBusy}
            className="flex items-center gap-1.5 rounded-lg bg-vio-soft px-3 py-1.5 text-xs font-medium text-vio ring-1 ring-vio-line transition hover:bg-vio-soft disabled:opacity-50"
          >
            {aiBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bot className="h-3.5 w-3.5" />
            )}
            Analyze hospital state
          </button>
        }
      >
        {ai ? (
          <div className="space-y-3">
            <AiBanner disclaimer={ai.disclaimer} />
            <p className="text-sm font-medium text-ink">{ai.ops.headline}</p>
            <div className="grid gap-2 md:grid-cols-2">
              {ai.ops.actions.map((a, i) => (
                <div key={i} className="rounded-lg border border-line bg-panel px-3 py-2.5">
                  <p className="text-xs font-semibold text-vio">{a.area}</p>
                  <p className="mt-0.5 text-xs text-ink-2">{a.recommendation}</p>
                  <p className="mt-1 text-[11px] text-ink-3">Why: {a.why}</p>
                </div>
              ))}
            </div>
            {ai.ops.watchlist?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ai.ops.watchlist.map((w, i) => (
                  <Pill key={i} tone="info">
                    {w}
                  </Pill>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Empty
            icon={<Bot className="h-8 w-8" />}
            title={aiBusy ? "Analyzing live hospital state…" : "Ask Nexura Intelligence"}
            hint="AI reviews census, bed lifecycle, task SLAs, equipment and incidents to suggest the next best coordination actions. It never acts on its own — every action stays human-approved."
          />
        )}
      </Panel>
    </div>
  );
}
