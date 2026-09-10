"use client";

/* ============================================================
 * PIE — Crisis Radar ("Command Center Overdrive")
 * Live cohort view: every assigned patient sorted by Time-to-Decay,
 * color-banded, with a slide-out deep dive: risk trend sparkline,
 * top contributing factors (SHAP bars), the Pre-Emptive Protocol
 * with one-click Approve, and the What-If simulator.
 * ============================================================ */

import { useState } from "react";
import { Activity, BrainCircuit, ChevronRight, RefreshCw, ShieldQuestion, X } from "lucide-react";
import { nx, useNx } from "./client";
import { AiBanner, Empty, ErrorState, Loading, Panel } from "./bits";
import { RiskBadge, RiskSparkline } from "@/components/pi/risk-badge";
import { ProtocolCard, type ProtocolCardData } from "@/components/pi/protocol-card";
import { TwinSimulator } from "@/components/pi/twin-simulator";

interface RadarRow {
  patientId: string;
  patientName: string;
  uhid: string;
  score: number;
  band: string;
  confidence: number;
  uncertain: boolean;
  domain: string;
  topDriver?: string;
  openProtocolId?: string;
}

interface RiskResponse {
  composite: { id?: string; score: number; band: string; confidence: number; uncertain: boolean; drivers: { feature: string; contribution: number; direction: string; detail: string }[]; domain: string; rationale: string };
  domains: { domain: string; score: number; band: string }[];
  protocol: string;
  protocolId?: string;
}

interface TwinResponse {
  catalog: { id: string; label: string; kind: "medication" | "lifestyle" }[];
}

interface ProtocolsResponse {
  protocols: ProtocolCardData[];
}

/** predict routes reply in the { data, meta } envelope — unwrap safely. */
function unwrap<T>(x: unknown): T {
  return x && typeof x === "object" && "data" in (x as Record<string, unknown>) ? ((x as { data: T }).data) : (x as T);
}

export function CrisisRadarApp() {
  const { data, error, loading, refresh } = useNx<unknown>("/api/nx/predict/radar?limit=50", { pollMs: 30000 });
  const radarRows = unwrap<{ rows: RadarRow[]; generatedAt: string }>(data)?.rows ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RiskResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [catalog, setCatalog] = useState<TwinResponse["catalog"]>([]);
  const [protocols, setProtocols] = useState<ProtocolCardData[]>([]);
  const [showAllProtocols, setShowAllProtocols] = useState(false);
  const [protocolList, setProtocolList] = useState<ProtocolsResponse["protocols"] | null>(null);

  async function openPatient(row: RadarRow) {
    setSelectedId(row.patientId);
    setDetail(null);
    setDetailLoading(true);
    setShowAllProtocols(false);
    try {
      // risk first — its cycle may CREATE a protocol; then fetch twin + queue
      const risk = await nx<unknown>(`/api/nx/predict/risk/${row.patientId}`);
      const [twin, protos] = await Promise.all([
        nx<unknown>(`/api/nx/predict/twin/${row.patientId}`),
        nx<unknown>("/api/nx/predict/protocols?status=pending_approval"),
      ]);
      setDetail(unwrap<RiskResponse>(risk));
      setCatalog(unwrap<TwinResponse>(twin).catalog ?? []);
      const mine = (unwrap<ProtocolsResponse>(protos).protocols ?? []).filter((p) => p.patientId === row.patientId || p.patientUhid === row.uhid);
      setProtocols(mine);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadAllProtocols() {
    setShowAllProtocols((v) => !v);
    if (!protocolList) {
      try {
        const protos = await nx<unknown>("/api/nx/predict/protocols");
        setProtocolList(unwrap<ProtocolsResponse>(protos).protocols ?? []);
      } catch {
        setProtocolList([]);
      }
    }
  }

  const counts = radarRows.reduce(
    (acc, r) => ({ red: acc.red + (r.band === "red" ? 1 : 0), yellow: acc.yellow + (r.band === "yellow" ? 1 : 0), green: acc.green + (r.band === "green" ? 1 : 0) }),
    { red: 0, yellow: 0, green: 0 }
  );

  return (
    <div className="flex h-full flex-col gap-4 p-1">
      <Panel
        title="Crisis Radar"
        subtitle="Predictive Intelligence Engine — patients ranked by Time-to-Decay"
        actions={
          <button onClick={() => refresh()} className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-xs font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      >
        <AiBanner disclaimer="PIE outputs are predictive decision support (Class II SaMD). Every protocol requires clinician approval." />
        {loading && !data ? (
          <Loading rows={6} label="Scanning cohort…" />
        ) : error ? (
          <ErrorState message={String(error)} onRetry={refresh} />
        ) : !radarRows.length ? (
          <Empty icon={<BrainCircuit className="h-8 w-8" />} title="No active patients to scan" hint="Admit or record vitals to populate the radar." />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> {counts.red} critical
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> {counts.yellow} watchlist
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {counts.green} stable
              </span>
              <button onClick={loadAllProtocols} className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:underline dark:text-violet-400">
                <ShieldQuestion className="h-3.5 w-3.5" /> {showAllProtocols ? "Hide" : "Protocol"} approval queue
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-black/8 dark:border-white/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-black/[0.03] text-left dark:bg-white/5">
                    <th className="px-3 py-2 font-semibold">Risk</th>
                    <th className="px-3 py-2 font-semibold">Patient</th>
                    <th className="hidden px-3 py-2 font-semibold sm:table-cell">UHID</th>
                    <th className="px-3 py-2 font-semibold">Top driver</th>
                    <th className="hidden px-3 py-2 font-semibold md:table-cell">Confidence</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {radarRows.map((r) => (
                    <tr
                      key={r.patientId}
                      onClick={() => openPatient(r)}
                      className={`cursor-pointer border-t border-black/5 transition hover:bg-black/[0.02] dark:border-white/5 dark:hover:bg-white/[0.04] ${selectedId === r.patientId ? "bg-violet-50 dark:bg-violet-950/30" : ""}`}
                    >
                      <td className="px-3 py-2">
                        <RiskBadge score={r.score} uncertain={r.uncertain} size="sm" />
                      </td>
                      <td className="px-3 py-2 font-medium">{r.patientName}</td>
                      <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{r.uhid}</td>
                      <td className="max-w-[220px] truncate px-3 py-2 text-muted-foreground">{r.topDriver ?? "—"}</td>
                      <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">{(r.confidence * 100).toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      {showAllProtocols && (
        <Panel title="Protocol approval queue" subtitle="Pre-emptive protocols awaiting clinician decision">
          {protocolList === null ? (
            <Loading rows={3} />
          ) : protocolList.length === 0 ? (
            <Empty title="Queue clear" hint="No protocols await approval." />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {protocolList.map((p) => (
                <ProtocolCard
                  key={p.id}
                  protocol={p}
                  onDecided={() => {
                    setProtocolList((cur) => (cur ?? []).map((x) => (x.id === p.id ? { ...x, status: p.status } : x)));
                    refresh();
                  }}
                />
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* Deep dive slide-out */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px]" onClick={() => setSelectedId(null)}>
          <div
            className="h-full w-full max-w-xl overflow-y-auto border-l border-black/10 bg-background p-5 shadow-2xl dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold">Patient deep dive</h3>
                <p className="text-xs text-muted-foreground">Predictive Intelligence Engine · composite Time-to-Decay</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading ? (
              <Loading rows={8} label="Running twin simulation…" />
            ) : !detail ? (
              <ErrorState message="Could not load the assessment" onRetry={() => selectedId && openPatient({ patientId: selectedId } as RadarRow)} />
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-black/8 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div>
                    <RiskBadge score={detail.composite.score} uncertain={detail.composite.uncertain} />
                    <p className="mt-1.5 text-[11px] text-muted-foreground">{detail.composite.rationale}</p>
                  </div>
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>

                <div>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Top contributing factors</p>
                  <div className="space-y-1.5">
                    {detail.composite.drivers.slice(0, 3).map((d, i) => {
                      const maxAbs = Math.max(...detail.composite.drivers.map((x) => Math.abs(x.contribution)), 0.01);
                      const pct = Math.round((Math.abs(d.contribution) / maxAbs) * 100);
                      return (
                        <div key={i} className="rounded-xl border border-black/8 p-2.5 dark:border-white/10">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium">{d.feature}</span>
                            <span className={d.direction === "up" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                              {d.direction === "up" ? "▲" : "▼"} {d.contribution}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                            <div className={`h-full rounded-full ${d.direction === "up" ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{d.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {protocols.filter((p) => p.status === "pending_approval").map((p) => (
                  <ProtocolCard
                    key={p.id}
                    protocol={p}
                    onDecided={() => {
                      setProtocols((cur) => cur.map((x) => (x.id === p.id ? { ...x, status: p.status } : x)));
                    }}
                  />
                ))}

                <TwinSimulator patientId={selectedId} catalog={catalog} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
