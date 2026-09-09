"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { CalendarDays, ChevronLeft, ChevronRight, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { nx, useNx, fmtClock } from "./client";
import { Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";

/* ============================================================
   SCHEDULING — day board, check-in flow, conflict-aware booking
   ============================================================ */

interface Appt {
  id: string; time: string; token: number; type: string; status: string; complaint: string | null;
  patient: { id: string; fullName: string; uhid: string; phone: string | null };
  doctor: { id: string; name: string; specialty?: string; speciality?: string; department: string | null };
}
interface ScheduleData {
  day: string;
  appointments: Appt[];
  stats: Record<string, number>;
  doctors: Array<{ id: string; name: string; speciality: string; department: string | null; todayCount: number; totalAppointments: number }>;
}

export function ScheduleBoard() {
  const [day, setDay] = useState(0);
  const { data, error, loading, refresh } = useNx<ScheduleData>(`/api/nx/schedule?day=${day}`, { pollMs: 30000 });
  const [bookOpen, setBookOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setBusyId(id);
    try {
      await nx("/api/nx/schedule", { method: "PATCH", body: JSON.stringify({ id, status }) });
      toast.success(status === "waiting" ? "Checked in — added to queue" : `Appointment → ${status.replace(/_/g, " ")}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  const dayLabel = data ? new Date(data.day).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Total" value={data?.stats.total ?? "—"} icon={<CalendarDays className="h-4 w-4" />} />
        <Stat label="Scheduled" value={data?.stats.scheduled ?? "—"} tone="info" />
        <Stat label="Waiting" value={data?.stats.waiting ?? "—"} tone="warn" />
        <Stat label="In consult" value={data?.stats.in_consultation ?? "—"} tone="info" />
        <Stat label="Completed" value={data?.stats.completed ?? "—"} tone="good" />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setDay(day - 1)} className="rounded-md border border-line p-1.5 text-ink-3 hover:bg-inset"><ChevronLeft className="h-4 w-4" /></button>
        <span className="min-w-36 text-center text-sm font-medium text-ink">{dayLabel}</span>
        <button onClick={() => setDay(day + 1)} disabled={day >= 13} className="rounded-md border border-line p-1.5 text-ink-3 hover:bg-inset disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        {day !== 0 && <button onClick={() => setDay(0)} className="rounded-md border border-line-2 px-2.5 py-1 text-[11px] text-ink-2 hover:bg-inset">Today</button>}
        <button onClick={() => setBookOpen(true)} className="ml-auto rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent">Book appointment</button>
      </div>

      {loading ? (
        <Loading rows={5} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refresh} />
      ) : !data?.appointments.length ? (
        <Empty title="No appointments this day" hint="Book one from the button above." />
      ) : (
        <Panel title="Appointment board" subtitle="Token order · status flow: scheduled → waiting → in consultation → completed">
          <div className="space-y-2">
            {data.appointments.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-inset text-xs font-bold text-ink-2">#{a.token}</span>
                  <div>
                    <p className="text-sm font-medium text-ink">{a.patient.fullName} <span className="text-[11px] font-normal text-ink-3">{a.patient.uhid}</span></p>
                    <p className="text-[11px] text-ink-3">{fmtClock(a.time)} · {a.doctor.name} ({a.doctor.speciality || a.doctor.specialty}) · {a.complaint || a.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusPill status={a.status} />
                  {busyId === a.id ? (
                    <span className="text-[11px] text-ink-3">…</span>
                  ) : (
                    <>
                      {a.status === "scheduled" && <button onClick={() => setStatus(a.id, "waiting")} className="flex items-center gap-1 rounded-md border border-good-line px-2 py-1 text-[11px] text-good hover:bg-good-soft"><UserCheck className="h-3 w-3" /> Check in</button>}
                      {a.status === "waiting" && <button onClick={() => setStatus(a.id, "in_consultation")} className="rounded-md border border-vio-line px-2 py-1 text-[11px] text-vio hover:bg-vio-soft">Start consult</button>}
                      {a.status === "in_consultation" && <button onClick={() => setStatus(a.id, "completed")} className="rounded-md border border-line-2 px-2 py-1 text-[11px] text-ink-2 hover:bg-inset">Complete</button>}
                      {a.status === "scheduled" && <button onClick={() => setStatus(a.id, "no_show")} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] text-ink-3 hover:bg-inset"><UserX className="h-3 w-3" /> No-show</button>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Doctor availability">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data?.doctors.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-line bg-panel px-3 py-2">
              <div>
                <p className="text-xs font-medium text-ink">{d.name}</p>
                <p className="text-[11px] text-ink-3">{d.speciality} · {d.department || "—"}</p>
              </div>
              <Pill tone={d.todayCount > 0 ? "info" : "neutral"}>{d.todayCount} today</Pill>
            </div>
          ))}
        </div>
      </Panel>

      {bookOpen && <BookAppointment onClose={() => setBookOpen(false)} onDone={() => { setBookOpen(false); setDay(0); refresh(); }} scheduleData={data} />}
    </div>
  );
}

function BookAppointment({ onClose, onDone, scheduleData }: { onClose: () => void; onDone: () => void; scheduleData: ScheduleData | null }) {
  const { data } = useNx<{ patients: Array<{ id: string; fullName: string; uhid: string }> }>("/api/nx/patients?take=30");
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [when, setWhen] = useState("");
  const [complaint, setComplaint] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  async function submit() {
    if (!patientId || !doctorId || !when) {
      toast.error("Patient, doctor and time are required");
      return;
    }
    setBusy(true);
    setSuggestions([]);
    try {
      await nx("/api/nx/schedule", { method: "POST", body: JSON.stringify({ patientId, doctorId, date: new Date(when).toISOString(), complaint }) });
      toast.success("Booked — reminder & pre-registration automation queued");
      onDone();
    } catch (e) {
      const err = e as Error & { status?: number; data?: { suggestions?: string[]; detail?: string } };
      if (err.status === 409) {
        toast.error(err.data?.detail || "Slot conflict");
        setSuggestions(err.data?.suggestions || []);
      } else {
        toast.error(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-line bg-[#0d1526] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-ink">Book appointment</h3>
        <div className="mt-3 space-y-2.5">
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line">
            <option value="">Select patient…</option>
            {data?.patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} · {p.uhid}</option>)}
          </select>
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="w-full rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line">
            <option value="">Select doctor…</option>
            {scheduleData?.doctors.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.speciality}</option>)}
          </select>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="w-full rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line" />
          <input value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Chief complaint (optional)" className="w-full rounded-lg border border-line-2 bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent-line" />
          {suggestions.length > 0 && (
            <div className="rounded-md border border-accent-line bg-accent-soft px-3 py-2">
              <p className="text-[11px] font-medium text-accent">Conflict — next free slots:</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => setWhen(new Date(s).toISOString().slice(0, 16))} className="rounded border border-accent-line px-1.5 py-0.5 text-[10px] text-accent hover:bg-accent-soft">
                    {new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-line-2 px-3 py-1.5 text-xs text-ink-2 hover:bg-inset">Cancel</button>
          <button onClick={submit} disabled={busy} className={cn("rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent disabled:opacity-50")}>
            {busy ? "Booking…" : "Book"}
          </button>
        </div>
      </div>
    </div>
  );
}
