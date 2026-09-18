"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Empty, ErrorState, Loading, Panel, Pill, Stat } from "./bits";
import { useNx } from "./client";

/* ============================================================
   ANALYTICS — performance center (leadership view)
   ============================================================ */

interface Analytics {
  kpis: {
    alosDays: number;
    readmissionPct: number;
    occupancyPct: number;
    totalAdmissions: number;
    orderTatHours: Record<string, { n: number; avgH: number }>;
    noShowPct: number;
    appointmentCompletionPct: number;
    slaOnTimePct: number;
    openIncidents: number;
    criticalResults: number;
  };
  revenueTrend: Array<{ day: string; revenue: number; collected: number }>;
  admissionTrend: Array<{ day: string; emergency: number; elective: number }>;
  wardOccupancy: Array<{ ward: string; total: number; occupied: number; pct: number }>;
  doctorLoad: Array<{ name: string; speciality: string; opd: number; ipd: number }>;
  safetyByCategory: Record<string, number>;
}

const AXIS = { stroke: "#475569", fontSize: 10 };
const TOOLTIP_STYLE = {
  backgroundColor: "#0d1526",
  border: "1px solid #1e293b",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

export function AnalyticsCenter() {
  const { data, error, loading, refresh } = useNx<Analytics>("/api/nx/analytics");

  if (loading) return <Loading rows={6} label="Crunching operational analytics…" />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;
  if (!data) return <Empty title="No data" />;

  const k = data.kpis;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="ALOS" value={`${k.alosDays}d`} sub="avg length of stay" tone="info" />
        <Stat
          label="Readmission"
          value={`${k.readmissionPct}%`}
          sub="30-day proxy"
          tone={k.readmissionPct > 15 ? "warn" : "good"}
        />
        <Stat
          label="Occupancy"
          value={`${k.occupancyPct}%`}
          tone={k.occupancyPct > 85 ? "warn" : "default"}
        />
        <Stat
          label="SLA on-time"
          value={`${k.slaOnTimePct}%`}
          sub="task completion"
          tone={k.slaOnTimePct >= 90 ? "good" : "warn"}
        />
        <Stat
          label="No-show"
          value={`${k.noShowPct}%`}
          sub={`${k.appointmentCompletionPct}% completed`}
        />
        <Stat
          label="Open incidents"
          value={k.openIncidents}
          tone={k.openIncidents ? "warn" : "good"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Revenue — last 7 days" subtitle="Billed vs collected (₹)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.revenueTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="col" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={AXIS} axisLine={{ stroke: "#1e293b" }} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                fill="url(#rev)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="collected"
                stroke="#10b981"
                fill="url(#col)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Admissions — last 7 days" subtitle="Emergency vs elective">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data.admissionTrend}
              margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
            >
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={AXIS} axisLine={{ stroke: "#1e293b" }} tickLine={false} />
              <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#1e293b55" }} />
              <Bar dataKey="emergency" stackId="a" fill="#f43f5e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="elective" stackId="a" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Ward occupancy" subtitle="Live bed pressure by ward">
          <div className="space-y-2.5">
            {data.wardOccupancy.map((w) => (
              <div key={w.ward} className="flex items-center gap-3">
                <span className="w-28 truncate text-xs text-ink-2">{w.ward}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-inset">
                  <div
                    className={`h-full rounded-full ${w.pct > 90 ? "bg-crit" : w.pct > 70 ? "bg-accent" : "bg-good"}`}
                    style={{ width: `${w.pct}%` }}
                  />
                </div>
                <span className="w-20 text-right text-[11px] tabular-nums text-ink-3">
                  {w.occupied}/{w.total} · {w.pct}%
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Doctor workload" subtitle="OPD + IPD load (top 8)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data.doctorLoad}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 60, bottom: 0 }}
            >
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={AXIS}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ ...AXIS, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#1e293b55" }} />
              <Bar dataKey="opd" stackId="a" fill="#f59e0b" />
              <Bar dataKey="ipd" stackId="a" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Order turnaround by type" subtitle="Hours from order to completion">
          <div className="flex flex-wrap gap-2">
            {Object.entries(k.orderTatHours).length === 0 ? (
              <Empty title="No completed orders yet" />
            ) : (
              Object.entries(k.orderTatHours).map(([type, t]) => (
                <Pill key={type} tone={t.avgH > 6 ? "warn" : "good"}>
                  {type}: {t.avgH}h avg ({t.n})
                </Pill>
              ))
            )}
          </div>
        </Panel>
        <Panel title="Safety events by category" subtitle="Incident mix — drives prevention focus">
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.safetyByCategory).length === 0 ? (
              <Empty title="No incidents recorded" />
            ) : (
              Object.entries(data.safetyByCategory).map(([cat, n]) => (
                <Pill
                  key={cat}
                  tone={cat === "clinical" || cat === "medication" ? "critical" : "warn"}
                >
                  {cat}: {n}
                </Pill>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
