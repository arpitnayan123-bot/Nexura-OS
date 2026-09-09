"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Bot, HeartPulse, Loader2, Search } from "lucide-react";
import { toast } from "./os/toast";
import { useBackLayer } from "./os/back";
import { nx, useNx, useDebounced, timeAgo, fmtClock } from "./client";
import { AiBanner, Empty, ErrorState, Loading, Panel, Pill, StatusPill } from "./bits";

/* ============================================================
   PATIENT RECORDS — universal patient record + journey
   ============================================================ */

interface PatientRow {
  id: string; uhid: string; fullName: string; age: number | null; gender: string; bloodGroup: string | null;
  phone: string | null; allergy: string | null; chronicConditions: string | null; primaryLanguage: string;
  insuranceProvider: string | null; isAdmitted: boolean; currentLocation: string | null;
}

interface JourneyStage { key: string; stage: string; title: string; status: string; at: string | null; owner: string; detail: string; kind: string }

interface PatientRecord {
  profile: {
    id: string; uhid: string; name: string; age: number | null; gender: string; bloodGroup: string | null;
    phone: string | null; dob: string | null; city: string | null; state: string | null; language: string;
    abhaId: string | null; allergies?: string[]; chronic?: string[];
    emergencyContact: { name: string | null; phone: string | null };
    insurance: { provider: string | null; policyNo: string | null; pmjay: boolean };
  };
  status: { isAdmitted: boolean; location: string | null; attendingDoctor: string | null; admissionDiagnosis: string | null; expectedDischarge: string | null };
  journey?: JourneyStage[];
  openTasks?: Array<{ id: string; title: string; priority: string; status: string; ownerName: string | null; reason: string | null; dueAt: string | null }>;
  pendingResults?: Array<{ id: string; test: string; type: string; priority: string; status: string; at: string }>;
  vitals?: Array<{ id: string; at: string; bp: string; pulse: number | null; temp: number | null; spo2: number | null; news2: number | null; source: string }>;
  orders?: Array<{ id: string; type: string; details: { testName?: string; dose?: string }; priority: string; status: string; at: string; doctor?: string; results?: Array<{ id: string; test: string; value: string | null; unit: string | null; flag: string; ref: string; at: string | null }> }>;
  notes?: Array<{ id: string; type: string; body: string; at: string }>;
  prescriptions?: Array<{ id: string; at: string; meds: Array<{ name?: string; dose?: string; frequency?: string }> }>;
  appointments?: Array<{ id: string; at: string; doctor: string | null; specialty: string | null; type: string; status: string; complaint: string | null }>;
  admissions?: Array<{ id: string; at: string; type: string; diagnosis: string | null; doctor: string | null; dischargeStatus: string | null; dischargeDate: string | null; bed: string | null }>;
  whatChanged?: { orders: number; vitals: number; tasks: number };
}

export function PatientRegistry() {
  const [q, setQ] = useState("");
  // Debounced search — previously every keystroke fired a racing API request
  // and the slowest response won, showing wrong results.
  const dq = useDebounced(q, 300);
  const { data, error, loading, refresh } = useNx<{ patients: PatientRow[] }>("/api/nx/patients?take=24");
  const [openId, setOpenId] = useState<string | null>(null);

  /* the open patient record is one step back — device back, the
     system-bar pill and the window titlebar arrow all close it */
  useBackLayer(Boolean(openId), "patients", "Patient Records", () => setOpenId(null));

  useEffect(() => {
    const handler = (e: Event) => setOpenId((e as CustomEvent).detail as string);
    window.addEventListener("nx-open-patient", handler);
    return () => window.removeEventListener("nx-open-patient", handler);
  }, []);

  const { data: searched } = useNx<{ patients: PatientRow[] }>(dq.trim().length >= 2 ? `/api/nx/patients?q=${encodeURIComponent(dq.trim())}` : null);

  const rows = dq.trim().length >= 2 ? searched?.patients : data?.patients;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, UHID or phone…"
            className="w-full rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-4 focus:border-accent-line"
          />
        </div>
        <p className="text-xs text-ink-3">{rows?.length || 0} patients</p>
      </div>

      {loading ? (
        <Loading rows={6} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refresh} />
      ) : !rows?.length ? (
        <Empty title="No patients match" hint="Try a different name, UHID or phone number." />
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <button key={p.id} onClick={() => setOpenId(p.id)} className="rounded-xl border border-line bg-panel p-4 text-left transition hover:border-line-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-inset text-xs font-semibold text-ink-2">
                    {p.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{p.fullName}</p>
                    <p className="text-[11px] text-ink-3">{p.uhid} · {p.age ?? "?"}y · {p.gender} · {p.bloodGroup || "?"}</p>
                  </div>
                </div>
                {p.allergy ? <Pill tone="critical">allergy</Pill> : p.isAdmitted ? <Pill tone="info">IPD</Pill> : <Pill>OPD</Pill>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.isAdmitted && p.currentLocation && <Pill tone="violet">{p.currentLocation}</Pill>}
                {p.chronicConditions && p.chronicConditions.split(",").slice(0, 2).map((c) => (
                  <Pill key={c} tone="warn">{c.trim()}</Pill>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {openId && <PatientDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function PatientDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, error, loading, refresh } = useNx<PatientRecord>(`/api/nx/patients/${id}`);
  /* the record API is versioned independently — collection fields are
     optional and must never crash the drawer */
  const d = data
    ? {
        ...data,
        journey: data.journey ?? [],
        openTasks: data.openTasks ?? [],
        pendingResults: data.pendingResults ?? [],
        vitals: data.vitals ?? [],
        orders: (data.orders ?? []).map((o) => ({ ...o, results: o.results ?? [] })),
        notes: data.notes ?? [],
        admissions: data.admissions ?? [],
        appointments: data.appointments ?? [],
        allergies: data.profile.allergies ?? [],
        chronic: data.profile.chronic ?? [],
        whatChanged: data.whatChanged ?? { orders: 0, vitals: 0, tasks: 0 },
      }
    : null;
  const [aiBusy, setAiBusy] = useState(false);
  const [ai, setAi] = useState<{ summary: { oneLine: string; currentStatus: string; activeProblems: string[]; medications: string[]; watchItems: string[]; dataGaps: string[]; suggestedNextSteps: string[] }; disclaimer: string } | null>(null);

  async function summarize() {
    setAiBusy(true);
    setAi(null);
    try {
      const res = await nx<{ summary: { oneLine: string; currentStatus: string; activeProblems: string[]; medications: string[]; watchItems: string[]; dataGaps: string[]; suggestedNextSteps: string[] }; disclaimer: string }>("/api/nx/ai", {
        method: "POST",
        body: JSON.stringify({ feature: "patient_summary", patientId: id }),
      });
      setAi(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI summary failed");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="nx-scroll h-full w-full max-w-3xl overflow-y-auto border-l border-line bg-[#0a1120] p-5" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <Loading rows={8} label="Opening universal patient record…" />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refresh} />
        ) : d ? (
          <div className="space-y-4">
            <button
              onClick={onClose}
              className="nx-back-pill"
              aria-label="Back to Patient Records"
              title="Back to Patient Records"
            >
              <span className="nx-back-disc" aria-hidden>
                <ArrowLeft className="h-3 w-3" />
              </span>
              <span>Patient Records</span>
            </button>

            {/* Header */}
            <div className="rounded-xl border border-line bg-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-inset text-sm font-semibold text-ink">
                    {d.profile.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{d.profile.name}</h2>
                    <p className="text-xs text-ink-3">
                      {d.profile.uhid} · {d.profile.age ?? "?"}y {d.profile.gender} · {d.profile.bloodGroup || "?"} · speaks {d.profile.language}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {d.status.isAdmitted ? <Pill tone="info">Admitted · {d.status.location}</Pill> : <Pill>Not admitted</Pill>}
                  {d.allergies.map((a) => <Pill key={a} tone="critical"><AlertTriangle className="h-3 w-3" /> {a}</Pill>)}
                  {d.chronic.map((c) => <Pill key={c} tone="warn">{c}</Pill>)}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-ink-3 sm:grid-cols-4">
                <p>Phone: <span className="text-ink-2">{d.profile.phone || "—"}</span></p>
                <p>Emergency: <span className="text-ink-2">{d.profile.emergencyContact.name || "—"} {d.profile.emergencyContact.phone || ""}</span></p>
                <p>Insurance: <span className="text-ink-2">{d.profile.insurance.provider || "self-pay"}</span></p>
                <p>ABHA: <span className="text-ink-2">{d.profile.abhaId || "not linked"}</span></p>
              </div>
              {d.status.attendingDoctor && (
                <p className="mt-2 text-xs text-ink-3">
                  Under care of <span className="font-medium text-ink">{d.status.attendingDoctor}</span> — {d.status.admissionDiagnosis}
                  {d.status.expectedDischarge && <> · expected discharge {new Date(d.status.expectedDischarge).toLocaleDateString("en-IN")}</>}
                </p>
              )}
            </div>

            {/* Journey timeline */}
            <Panel title="Patient journey" subtitle="Every stage, owner and status in one view">
              {d.journey.length === 0 ? (
                <Empty title="No journey recorded yet" />
              ) : (
                <div className="relative space-y-0 pl-5">
                  <div className="absolute bottom-2 left-[7px] top-2 w-px bg-inset" />
                  {d.journey.map((s) => (
                    <div key={s.key} className="relative pb-4 last:pb-0">
                      <span className={`absolute -left-5 top-1 h-[15px] w-[15px] rounded-full border-2 ${s.status === "active" ? "border-accent-line bg-accent-soft animate-pulse" : s.status === "completed" ? "border-good bg-good-soft" : "border-line-2 bg-panel"}`} />
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-medium text-ink">{s.title}</p>
                        <Pill tone={s.status === "active" ? "warn" : s.status === "completed" ? "good" : "neutral"}>{s.status}</Pill>
                      </div>
                      <p className="text-[11px] text-ink-3">{s.owner} · {s.at ? timeAgo(s.at) : "pending"} · {s.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* What changed + open items */}
            <div className="grid gap-4 md:grid-cols-2">
              <Panel title="Open tasks & pending results" subtitle={`${d.whatChanged.orders} orders · ${d.whatChanged.vitals} vitals in last 48h`}>
                <div className="space-y-2">
                  {d.openTasks.map((t) => (
                    <div key={t.id} className="rounded-lg border border-line bg-panel px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-ink">{t.title}</p>
                        <StatusPill status={t.priority} />
                      </div>
                      <p className="text-[11px] text-ink-3">{t.ownerName} · due {t.dueAt ? timeAgo(t.dueAt) : "—"}</p>
                    </div>
                  ))}
                  {d.pendingResults.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2">
                      <p className="truncate text-xs text-ink-2">{r.test} <span className="text-ink-3">({r.type})</span></p>
                      <StatusPill status={r.priority} />
                    </div>
                  ))}
                  {d.openTasks.length === 0 && d.pendingResults.length === 0 && <Empty title="Nothing pending" />}
                </div>
              </Panel>

              <Panel title="Recent vitals" subtitle="Latest first · NEWS2 where recorded">
                {d.vitals.length === 0 ? (
                  <Empty title="No vitals recorded" />
                ) : (
                  <div className="space-y-1.5">
                    {d.vitals.map((v) => (
                      <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs">
                        <span className="tabular-nums text-ink-2">{v.bp} · P{v.pulse ?? "?"} · SpO₂ {v.spo2 ?? "?"}% · {v.temp ?? "?"}°C</span>
                        <span className="flex items-center gap-2 text-ink-3">
                          {v.news2 != null && <Pill tone={v.news2 >= 5 ? "critical" : v.news2 >= 3 ? "warn" : "good"}>NEWS2 {v.news2}</Pill>}
                          {fmtClock(v.at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            {/* Orders & results */}
            <Panel title="Orders & results" subtitle="Unified lifecycle with attribution">
              {d.orders.length === 0 ? (
                <Empty title="No orders" />
              ) : (
                <div className="space-y-2">
                  {d.orders.slice(0, 8).map((o) => (
                    <div key={o.id} className="rounded-lg border border-line bg-panel px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium text-ink">{o.details?.testName || o.type} <span className="text-ink-3">· {o.type}</span></p>
                        <div className="flex items-center gap-1.5">
                          <StatusPill status={o.priority} />
                          <StatusPill status={o.status} />
                        </div>
                      </div>
                      <p className="text-[11px] text-ink-3">{o.doctor || "—"} · {timeAgo(o.at)}</p>
                      {o.results.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {o.results.map((r) => (
                            <Pill key={r.id} tone={r.flag === "critical" ? "critical" : r.flag === "normal" ? "good" : "warn"}>
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

            {/* AI summary */}
            <Panel
              title="Nexura Intelligence — record summary"
              actions={
                <button onClick={summarize} disabled={aiBusy} className="flex items-center gap-1.5 rounded-lg bg-vio-soft px-3 py-1.5 text-xs font-medium text-vio ring-1 ring-vio-line hover:bg-vio-soft disabled:opacity-50">
                  {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                  Summarize record
                </button>
              }
            >
              {ai ? (
                <div className="space-y-3">
                  <AiBanner disclaimer={ai.disclaimer} />
                  <p className="text-sm font-medium text-ink">{ai.summary.oneLine}</p>
                  <p className="text-xs text-ink-2">{ai.summary.currentStatus}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      ["Active problems", ai.summary.activeProblems, "warn"],
                      ["On record (medications)", ai.summary.medications, "info"],
                      ["Watch items", ai.summary.watchItems, "critical"],
                      ["Data gaps", ai.summary.dataGaps, "neutral"],
                    ].map(([label, items, tone]) => (
                      <div key={label as string}>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label as string}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {(items as string[])?.length ? (items as string[]).map((x, i) => <Pill key={i} tone={tone as "warn"}>{x}</Pill>) : <p className="text-[11px] text-ink-4">none noted</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {ai.summary.suggestedNextSteps?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Suggested coordination steps (not clinical orders)</p>
                      <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-ink-2">
                        {ai.summary.suggestedNextSteps.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <Empty icon={<HeartPulse className="h-8 w-8" />} title={aiBusy ? "Reading the full record…" : "One-click longitudinal summary"} hint="AI condenses the timeline, results and notes into a clinician-friendly brief — clearly labeled, never a diagnosis." />
              )}
            </Panel>

            {/* History grids */}
            <div className="grid gap-4 md:grid-cols-2">
              <Panel title="Notes">
                {d.notes.length === 0 ? <Empty title="No notes" /> : (
                  <div className="space-y-2">
                    {d.notes.map((n) => (
                      <div key={n.id} className="rounded-lg border border-line bg-panel px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{n.type}</p>
                        <p className="mt-0.5 line-clamp-3 text-xs text-ink-2">{n.body}</p>
                        <p className="text-[10px] text-ink-4">{timeAgo(n.at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
              <Panel title="Admissions & appointments">
                <div className="space-y-1.5">
                  {d.admissions.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs">
                      <span className="truncate text-ink-2">{a.diagnosis || a.type} · {a.bed || "—"}</span>
                      <StatusPill status={a.dischargeStatus || "active"} />
                    </div>
                  ))}
                  {d.appointments.slice(0, 4).map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs">
                      <span className="truncate text-ink-2">{a.complaint || a.type} · {a.doctor}</span>
                      <StatusPill status={a.status} />
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
