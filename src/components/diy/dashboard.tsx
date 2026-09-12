"use client";

/* ============================================================
 * NEXURA DIY — TODAY (dashboard)
 * The day's rhythm: progress bar, today's tasks (done / skip /
 * note / not-feasible), milestones, weekly check-in, goal
 * pause/archive, conflicts explained honestly. Sources cited.
 * ============================================================ */

import { useCallback, useEffect, useState } from "react";
import { Check, SkipForward, MessageSquarePlus, Wind, ChevronUp, Plus, BookOpenCheck } from "lucide-react";
import { Scenery } from "./scenery";
import { diyFetch, type DashboardData, type DashboardTask } from "./client-types";

export function Dashboard({ onNewGoals }: { onNewGoals: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkin, setCheckin] = useState({ mood: 3, energy: 3, sleep: 3 });
  const [checkinSaved, setCheckinSaved] = useState(false);

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

  const act = async (task: DashboardTask, action: "done" | "skipped" | "not_feasible", note?: string) => {
    setBusyTask(task.id);
    try {
      await diyFetch(`/api/diy/tasks/${task.id}`, { method: "POST", body: JSON.stringify({ action, note }) });
      setData((d) =>
        d
          ? {
              ...d,
              todayTasks: d.todayTasks.map((t) => (t.id === task.id ? { ...t, status: action === "done" ? "DONE" : action === "skipped" ? "SKIPPED" : "NOT_FEASIBLE", note: note ?? t.note } : t)),
              doneCount: d.doneCount + (action === "done" && t2status(task.status) !== "DONE" ? 1 : 0),
            }
          : d
      );
    } finally {
      setBusyTask(null);
      setNoteFor(null);
      setNoteText("");
    }
  };
  const t2status = (s: string) => s;

  const saveCheckin = async () => {
    await diyFetch("/api/diy/checkin", { method: "POST", body: JSON.stringify({ ...checkin }) });
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
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#C96F45]" /> Loading today…
        </div>
      </div>
    );
  }

  const total = data.todayTasks.length;
  const pct = total ? Math.round((data.doneCount / total) * 100) : 0;

  return (
    <div className="pb-28">
      {/* slim scenic band */}
      <section className="relative h-40 overflow-hidden sm:h-48">
        <Scenery className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-x-0 bottom-4 z-10 mx-auto w-[min(94%,680px)]">
          <div className="nx-glass-deep rounded-2xl px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[#2E2A26]">
                {data.doneCount} of {total || 0} done today
              </span>
              <span className="text-xs text-[#6B5D4E]">{data.date}</span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#EBDCC2]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#C96F45] to-[#7A9A7B] transition-all" style={{ width: `${pct}%` }} />
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
              return (
                <div key={t.id} className={`rounded-2xl border p-4 transition ${done ? "border-[#CBDCc4] bg-[#F2F7EC]" : "border-[#EADDC7] bg-[#FFFDF8]"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${done ? "text-[#4E6845] line-through decoration-[#A8C096]" : "text-[#2E2A26]"}`}>{t.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[#6B5D4E]">{t.detail}</p>
                      <p className="mt-1 text-[10.5px] uppercase tracking-wide text-[#A08D74]">
                        {t.category.replace(/_/g, " ").toLowerCase()} · {t.estMinutes} min
                        {t.note ? ` · note: ${t.note}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        aria-label={`Mark done: ${t.title}`}
                        disabled={busyTask === t.id}
                        onClick={() => act(t, "done")}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${done ? "border-[#7A9A7B] bg-[#7A9A7B] text-white" : "border-[#D9C8AC] text-[#6B5D4E] hover:border-[#7A9A7B] hover:text-[#4E6845]"}`}
                      >
                        <Check size={16} aria-hidden />
                      </button>
                      <button aria-label={`Skip: ${t.title}`} disabled={busyTask === t.id} onClick={() => act(t, "skipped")} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9C8AC] text-[#6B5D4E] transition hover:border-[#C96F45] hover:text-[#B05A34]">
                        <SkipForward size={15} aria-hidden />
                      </button>
                      <button aria-label={`Add note: ${t.title}`} onClick={() => setNoteFor(noteFor === t.id ? null : t.id)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D9C8AC] text-[#6B5D4E] transition hover:border-[#C96F45] hover:text-[#B05A34]">
                        <MessageSquarePlus size={15} aria-hidden />
                      </button>
                    </div>
                  </div>
                  {noteFor === t.id && (
                    <div className="mt-3 flex gap-2">
                      <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="How did it go?" aria-label={`Note for ${t.title}`} className="h-10 flex-1 rounded-full border border-[#E0D0B8] bg-white px-4 text-sm outline-none focus:border-[#C96F45]" />
                      <button onClick={() => act(t, "done", noteText)} className="diy-btn-primary px-4 text-xs">Save</button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* weekly check-in */}
        <section className="nx-glass-deep rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#2E2A26]">Weekly check-in</p>
              <p className="mt-0.5 text-xs text-[#6B5D4E]">Two minutes of honesty — mood, energy, sleep.</p>
            </div>
            <button onClick={() => setCheckinOpen((o) => !o)} aria-expanded={checkinOpen} className="diy-btn-icon-terra" aria-label="Toggle weekly check-in">
              {checkinOpen ? <ChevronUp size={17} aria-hidden /> : <Wind size={17} aria-hidden />}
            </button>
          </div>
          {checkinOpen && (
            <div className="mt-4 space-y-3">
              {(["mood", "energy", "sleep"] as const).map((k) => (
                <div key={k}>
                  <label htmlFor={`ci-${k}`} className="text-xs font-medium capitalize text-[#6B5D4E]">{k} (1–5)</label>
                  <input id={`ci-${k}`} type="range" min={1} max={5} value={checkin[k]} onChange={(e) => setCheckin((c) => ({ ...c, [k]: Number(e.target.value) }))} className="w-full accent-[#B05A34]" />
                </div>
              ))}
              <button onClick={saveCheckin} className="diy-btn-primary w-full text-sm">Save check-in</button>
            </div>
          )}
          {checkinSaved && <p className="mt-3 text-xs text-[#4E6845]">Saved — see you next week.</p>}
        </section>

        {/* milestones + plans */}
        {data.plans.map((p) => (
          <section key={p.id} className="rounded-3xl border border-[#EADDC7] bg-[#FFFDF8] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#2E2A26]">{p.goalText}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#6B5D4E]">{p.summary}</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#F1E6D4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#8A7454]">v{p.version}</span>
            </div>
            <div className="mt-4 space-y-2">
              {p.milestones.map((m) => (
                <div key={m.id} className="flex items-start gap-2.5 text-xs">
                  <BookOpenCheck size={13} className="mt-0.5 shrink-0 text-[#7A9A7B]" aria-hidden />
                  <p className="leading-relaxed text-[#6B5D4E]"><strong className="text-[#4E4237]">Day {m.targetDay}:</strong> {m.title}{m.detail ? ` — ${m.detail}` : ""}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-[#F0E4CE] pt-3 text-[10.5px] leading-relaxed text-[#A08D74]">
              Sources: {p.sourceKeys} · {p.sourcePack} · daily load ≈ {p.burdenMinutes} min
            </p>
          </section>
        ))}

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
