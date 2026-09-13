"use client";

/* ============================================================
 * NEXURA DIY — TODAY (dashboard)
 * The day's rhythm: time-of-day greeting, progress + streak,
 * today's tasks (done / skip / note / undo), the weekly rhythm,
 * plan position (Day N of M + milestones reached), weekly
 * check-in (prefilled from today's log), conflicts explained
 * honestly. Sources cited.
 * ============================================================ */

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  SkipForward,
  MessageSquarePlus,
  Wind,
  ChevronUp,
  Plus,
  BookOpenCheck,
  RotateCcw,
  Sprout,
} from "lucide-react";
import { Scenery } from "./scenery";
import { ConsentSheet, type ConsentSheetSpec } from "./consent-sheet";
import { diyFetch, type DashboardData, type DashboardTask, type DashboardWeekly } from "./client-types";

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 22) return "Good evening";
  return "Up late";
}

function prettyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}

const statusFor = (action: string) => (action === "done" ? "DONE" : action === "skipped" ? "SKIPPED" : action === "not_feasible" ? "NOT_FEASIBLE" : "PENDING");

export function Dashboard({ onNewGoals }: { onNewGoals: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkin, setCheckin] = useState({ mood: 3, energy: 3, sleep: 3 });
  const [checkinSaved, setCheckinSaved] = useState(false);
  const [sheet, setSheet] = useState<ConsentSheetSpec | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await diyFetch<DashboardData>("/api/diy/dashboard");
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load today.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* CONSENT-AWARE ACTIONS: a fresh guest who lands on Today may not
     have granted PROGRESS_TRACKING yet — the first done/skip/check-in
     would 403 silently. Instead, catch the consent wall, show the
     granular sheet, grant, and run the intended action. */
  const withConsent = useCallback(async (run: () => Promise<unknown>, spec: Omit<ConsentSheetSpec, "onAllow">) => {
    try {
      await run();
    } catch (e) {
      const err = e as { code?: string; payload?: { error?: { missingScopes?: string[] } } };
      if (err?.code !== "DIY_010") {
        load();
        return;
      }
      const missing = err.payload?.error?.missingScopes ?? ["PROGRESS_TRACKING"];
      setSheet({
        title: spec.title,
        body: spec.body,
        scope: missing[0] ?? spec.scope,
        onAllow: async () => {
          try {
            await diyFetch("/api/diy/consent", { method: "POST", body: JSON.stringify({ scopes: missing, policyVersion: "2026-09-diy-1", source: "today" }) });
          } catch {
            /* grant failed — the retried action will surface the wall again */
          }
          try {
            await run();
          } catch {
            /* retried action failed — refetch shows server truth */
          }
          load();
        },
      });
    }
  }, [load]);

  /* ---- task actions (optimistic, then a silent server-truth refetch) ---- */

  const patchTask = (id: string, status: string, note: string | null) => {
    setData((d) => {
      if (!d) return d;
      const inToday = d.todayTasks.some((t) => t.id === id);
      const prev = inToday ? d.todayTasks.find((t) => t.id === id)?.status : undefined;
      let { doneCount, skippedCount } = d;
      if (inToday) {
        if (prev === "DONE" && status !== "DONE") doneCount = Math.max(0, doneCount - 1);
        if (prev !== "DONE" && status === "DONE") doneCount += 1;
        if (prev !== "SKIPPED" && status === "SKIPPED") skippedCount += 1;
        if (prev === "SKIPPED" && status !== "SKIPPED") skippedCount = Math.max(0, skippedCount - 1);
      }
      return {
        ...d,
        doneCount,
        skippedCount,
        todayTasks: d.todayTasks.map((t) => (t.id === id ? { ...t, status, note: note ?? t.note } : t)),
        weekly: d.weekly.map((w) => (w.id === id ? { ...w, status } : w)),
      };
    });
  };

  const act = async (task: DashboardTask | DashboardWeekly, action: "done" | "skipped" | "not_feasible", note?: string) => {
    setBusyTask(task.id);
    patchTask(task.id, statusFor(action), note ?? null);
    await withConsent(
      () => diyFetch(`/api/diy/tasks/${task.id}`, { method: "POST", body: JSON.stringify({ action, note }) }),
      {
        title: "Allow & record my progress",
        body: "What you complete, skip, or note gets recorded for the day — that's how streaks, milestones, and honest reviews work. Never sold, withdrawal anytime.",
        scope: "PROGRESS_TRACKING",
      }
    );
    setBusyTask(null);
    setNoteFor(null);
    setNoteText("");
    load();
  };

  const undo = async (task: DashboardTask | DashboardWeekly) => {
    setBusyTask(task.id);
    patchTask(task.id, "PENDING", null);
    await withConsent(
      () => diyFetch(`/api/diy/tasks/${task.id}`, { method: "DELETE" }),
      {
        title: "Allow & record my progress",
        body: "Undoing an entry also edits today's record. Withdrawal of this scope anytime stops recording.",
        scope: "PROGRESS_TRACKING",
      }
    );
    setBusyTask(null);
    load();
  };

  /* adding a note keeps the task's current state (skipped stays skipped) */
  const saveNote = (task: DashboardTask) => {
    const action = task.status === "SKIPPED" ? "skipped" : task.status === "NOT_FEASIBLE" ? "not_feasible" : "done";
    return act(task, action, noteText);
  };

  const saveCheckin = async () => {
    await withConsent(
      () => diyFetch("/api/diy/checkin", { method: "POST", body: JSON.stringify({ ...checkin }) }),
      {
        title: "Allow & record my check-in",
        body: "Mood, energy, and sleep reflections land in your private progress log — the raw material for honest weekly trends.",
        scope: "PROGRESS_TRACKING",
      }
    );
    setCheckinSaved(true);
    setCheckinOpen(false);
    load();
  };

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 pb-28 pt-20 text-center">
        <p className="text-sm text-[#6B5D4E]">{error}</p>
        <button onClick={load} className="diy-btn-primary mt-4 text-sm">Retry</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pb-28">
        <div className="flex items-center gap-2 text-sm text-[#8A7A66]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#B8860B]" /> Loading today…
        </div>
      </div>
    );
  }

  const total = data.todayTasks.length;
  const pct = total ? Math.round((data.doneCount / total) * 100) : 0;
  const allDone = total > 0 && data.doneCount === total;
  const streak = data.streak ?? 0;
  const logged = data.progressToday;
  const hasLog = !!(logged && (logged.mood != null || logged.energy != null || logged.sleep != null));

  return (
    <div className="pb-28">
      <ConsentSheet sheet={sheet} onClose={() => setSheet(null)} />
      {/* slim scenic band with greeting + rhythm */}
      <section className="relative h-44 overflow-hidden sm:h-52">
        <Scenery className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-x-0 bottom-4 z-10 mx-auto w-[min(94%,680px)]">
          <div className="nx-glass-deep rounded-2xl px-5 py-4">
            <p className="text-xs font-medium text-[#8A7454]">{allDone ? "Day complete" : greeting()}</p>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#2E2A26]">
                {allDone
                  ? `All ${total} done — the valley rests easy tonight.`
                  : `${data.doneCount} of ${total || 0} done today`}
              </span>
              {streak >= 2 && (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-full bg-[#F1E6D4] px-2.5 py-1 text-[11px] font-semibold text-[#7A5C36]"
                  aria-label={`${streak}-day streak`}
                >
                  <Sprout size={12} aria-hidden /> {streak}-day streak
                </span>
              )}
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#EBDCC2]">
              <div className={`h-full rounded-full transition-all ${allDone ? "bg-[#7A9A7B]" : "bg-gradient-to-r from-[#B8860B] to-[#7A9A7B]"}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#6B5D4E]">
              <span>
                {pct}%{data.skippedCount > 0 ? ` · ${data.skippedCount} skipped` : ""}
              </span>
              <span>{prettyDate(data.date)}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-[min(94%,680px)] space-y-6 pt-6">
        {/* today's tasks */}
        {total === 0 ? (
          <div className="nx-glass-deep rounded-3xl p-8 text-center">
            <p className="text-base font-medium text-[#2E2A26]">No plan yet — your day is open.</p>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-[#6B5D4E]">Tell the chat what you want to change and a plan lands here.</p>
            <button onClick={onNewGoals} className="diy-btn-primary mt-5 text-sm"><Plus size={15} aria-hidden /> New goals</button>
          </div>
        ) : (
          <section aria-label="Today's tasks" className="space-y-2.5">
            {data.todayTasks.map((t) => {
              const done = t.status === "DONE";
              const skipped = t.status === "SKIPPED";
              const off = t.status === "NOT_FEASIBLE";
              return (
                <div key={t.id} className={`rounded-2xl border p-4 transition ${done ? "border-[#CBDCc4] bg-[#F2F7EC]" : off ? "border-[#E4D5C2] bg-[#F8F1E4] opacity-80" : "border-[#EADDC7] bg-[#FFFDF8]"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${done ? "text-[#4E6845] line-through decoration-[#A8C096]" : "text-[#2E2A26]"}`}>{t.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#6B5D4E]">{t.detail}</p>
                      <p className="mt-1 text-[10.5px] uppercase tracking-wide text-[#A08D74]">
                        {t.category.replace(/_/g, " ").toLowerCase()} · {t.estMinutes} min
                        {skipped ? " · skipped today" : ""}
                        {off ? " · marked not feasible" : ""}
                        {t.note ? ` · note: ${t.note}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        aria-label={done ? `Undo done: ${t.title}` : `Mark done: ${t.title}`}
                        disabled={busyTask === t.id}
                        onClick={() => (done ? undo(t) : act(t, "done"))}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${done ? "border-[#7A9A7B] bg-[#7A9A7B] text-white" : "border-[#D9C8AC] text-[#6B5D4E] hover:border-[#7A9A7B] hover:text-[#4E6845]"}`}
                      >
                        {done ? <RotateCcw size={15} aria-hidden /> : <Check size={16} aria-hidden />}
                      </button>
                      {!done && (
                        <button aria-label={skipped ? `Undo skip: ${t.title}` : `Skip: ${t.title}`} disabled={busyTask === t.id} onClick={() => (skipped ? undo(t) : act(t, "skipped"))} className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${skipped ? "border-[#B8860B] bg-[#F3E8CF] text-[#A16207]" : "border-[#D9C8AC] text-[#6B5D4E] hover:border-[#B8860B] hover:text-[#A16207]"}`}>
                          {skipped ? <RotateCcw size={15} aria-hidden /> : <SkipForward size={15} aria-hidden />}
                        </button>
                      )}
                      <button aria-label={`Add note: ${t.title}`} onClick={() => { setNoteFor(noteFor === t.id ? null : t.id); setNoteText(t.note ?? ""); }} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9C8AC] text-[#6B5D4E] transition hover:border-[#B8860B] hover:text-[#A16207]">
                        <MessageSquarePlus size={15} aria-hidden />
                      </button>
                    </div>
                  </div>
                  {noteFor === t.id && (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && noteText.trim()) saveNote(t); }}
                        placeholder="How did it go?"
                        aria-label={`Note for ${t.title}`}
                        className="h-10 min-w-0 flex-1 rounded-full border border-[#E0D0B8] bg-white px-4 text-sm outline-none focus:border-[#B8860B]"
                      />
                      <button onClick={() => saveNote(t)} className="diy-btn-primary shrink-0 px-4 text-xs">Save</button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* weekly rhythm */}
        {data.weekly.length > 0 && (
          <section aria-label="Weekly rhythm" className="nx-glass-deep rounded-3xl p-5">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-[#2E2A26]">Weekly rhythm</p>
              {(data.weeklyDone ?? 0) > 0 && (
                <span className="text-[11px] font-medium text-[#4E6845]">{data.weeklyDone} of {data.weekly.length} done</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#6B5D4E]">Once-a-week anchors — slower signals, honest numbers.</p>
            <ul className="mt-3 space-y-2">
              {data.weekly.map((w) => {
                const done = w.status === "DONE";
                return (
                  <li key={w.id} className={`flex items-start justify-between gap-3 rounded-2xl border p-3.5 transition ${done ? "border-[#CBDCc4] bg-[#F2F7EC]" : "border-[#EADDC7] bg-[#FFFDF8]"}`}>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${done ? "text-[#4E6845] line-through decoration-[#A8C096]" : "text-[#2E2A26]"}`}>{w.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#6B5D4E]">{w.detail}</p>
                      <p className="mt-1 text-[10.5px] uppercase tracking-wide text-[#A08D74]">{w.category.replace(/_/g, " ").toLowerCase()}</p>
                    </div>
                    <button
                      aria-label={done ? `Undo done: ${w.title}` : `Mark done: ${w.title}`}
                      disabled={busyTask === w.id}
                      onClick={() => (done ? undo(w) : act(w, "done"))}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${done ? "border-[#7A9A7B] bg-[#7A9A7B] text-white" : "border-[#D9C8AC] text-[#6B5D4E] hover:border-[#7A9A7B] hover:text-[#4E6845]"}`}
                    >
                      {done ? <RotateCcw size={14} aria-hidden /> : <Check size={15} aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* weekly check-in */}
        <section className="nx-glass-deep rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#2E2A26]">Weekly check-in</p>
              <p className="mt-0.5 text-xs text-[#6B5D4E]">Two minutes of honesty — mood, energy, sleep.</p>
            </div>
            <button onClick={() => { setCheckinOpen((o) => { if (!o && hasLog) { setCheckin({ mood: logged?.mood ?? 3, energy: logged?.energy ?? 3, sleep: logged?.sleep ?? 3 }); } return !o; }); }} aria-expanded={checkinOpen} className="diy-btn-icon-terra" aria-label="Toggle weekly check-in">
              {checkinOpen ? <ChevronUp size={17} aria-hidden /> : <Wind size={17} aria-hidden />}
            </button>
          </div>
          {hasLog && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Today's logged check-in">
              <span className="text-[11px] text-[#8A7454]">Logged today:</span>
              {logged?.mood != null && <span className="rounded-full bg-[#F1E6D4] px-2 py-0.5 text-[11px] font-medium text-[#7A5C36]">mood {logged.mood}/5</span>}
              {logged?.energy != null && <span className="rounded-full bg-[#F1E6D4] px-2 py-0.5 text-[11px] font-medium text-[#7A5C36]">energy {logged.energy}/5</span>}
              {logged?.sleep != null && <span className="rounded-full bg-[#F1E6D4] px-2 py-0.5 text-[11px] font-medium text-[#7A5C36]">sleep {logged.sleep}/5</span>}
            </div>
          )}
          {checkinOpen && (
            <div className="mt-4 space-y-3">
              {(["mood", "energy", "sleep"] as const).map((k) => (
                <div key={k}>
                  <label htmlFor={`ci-${k}`} className="text-xs font-medium capitalize text-[#6B5D4E]">{k} (1–5)</label>
                  <input id={`ci-${k}`} type="range" min={1} max={5} value={checkin[k]} onChange={(e) => setCheckin((c) => ({ ...c, [k]: Number(e.target.value) }))} className="w-full accent-[#A16207]" />
                </div>
              ))}
              <button onClick={saveCheckin} className="diy-btn-primary w-full text-sm">{hasLog ? "Update check-in" : "Save check-in"}</button>
            </div>
          )}
          {(checkinSaved || hasLog) && !checkinOpen && <p className="mt-3 text-xs text-[#4E6845]">{checkinSaved ? "Saved — see you next week." : "Saved — you can update it anytime."}</p>}
        </section>

        {/* plans: position + milestones + sources */}
        {data.plans.map((p) => {
          const dayNumber = p.dayNumber ?? 1;
          const totalDays = p.totalDays ?? null;
          const posPct = totalDays ? Math.min(Math.round(((dayNumber - 1) / Math.max(totalDays - 1, 1)) * 100), 100) : 0;
          return (
            <section key={p.id} className="rounded-3xl border border-[#EADDC7] bg-[#FFFDF8] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#2E2A26]">{p.goalText}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#6B5D4E]">{p.summary}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="rounded-full bg-[#F1E6D4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#8A7454]">v{p.version}</span>
                  {totalDays != null && (
                    <span className="rounded-full border border-[#E4D5C2] px-2.5 py-1 text-[10px] font-semibold text-[#7A5C36]">
                      Day {dayNumber} of {totalDays}
                    </span>
                  )}
                </div>
              </div>
              {totalDays != null && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F0E4CE]" aria-hidden>
                  <div className="h-full rounded-full bg-gradient-to-r from-[#B8860B] to-[#7A9A7B]" style={{ width: `${posPct}%` }} />
                </div>
              )}
              <div className="mt-4 space-y-2">
                {p.milestones.map((m) => {
                  const reached = !!m.reached;
                  return (
                    <div key={m.id} className="flex items-start gap-2.5 text-xs">
                      <BookOpenCheck size={13} className={`mt-0.5 shrink-0 ${reached ? "text-[#4E6845]" : "text-[#C9BBA2]"}`} aria-hidden />
                      <p className="leading-relaxed text-[#6B5D4E]">
                        <strong className={reached ? "text-[#4E6845]" : "text-[#4E4237]"}>Day {m.targetDay}:</strong> {m.title}{m.detail ? ` — ${m.detail}` : ""}
                        {reached && <span className="ml-1.5 rounded-full bg-[#EAF1E0] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-[#4E6845]">here</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 border-t border-[#F0E4CE] pt-3 text-[10.5px] leading-relaxed text-[#A08D74]">
                Sources: {p.sourceKeys} · {p.sourcePack} · daily load ≈ {p.burdenMinutes} min
              </p>
            </section>
          );
        })}

        {/* conflicts, explained */}
        {data.conflicts.length > 0 && (
          <section className="rounded-3xl border border-[#EAD9C0] bg-[#FBF3E4] p-5">
            <p className="text-sm font-semibold text-[#7A5C36]">What we adjusted, and why</p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#8A7454]">
              {data.conflicts.map((c) => (
                <li key={c.id}>• {c.explanation} <span className="text-[#A08D74]">({c.resolution.toLowerCase()})</span></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
