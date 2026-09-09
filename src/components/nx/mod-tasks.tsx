"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { ArrowUpRight, Check, Loader2, Lock, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { nx, useNx, timeAgo, minsUntil } from "./client";
import { Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";

/* ============================================================
   INTELLIGENT WORK QUEUE — one prioritized inbox per role.
   Priority is deterministic (severity → SLA deadline) and the
   reason is always shown. Never hidden behind AI.
   ============================================================ */

interface Task {
  id: string; title: string; detail: string | null; type: string; priority: string; status: string;
  ownerRole: string | null; ownerName: string | null; patientName: string | null; patientUhid: string | null;
  location: string | null; dueAt: string | null; escalationLevel: number; reason: string | null;
  sourceModule: string | null; overdue: boolean; dueMins: number | null;
  createdAt: string;
}

const ROLE_FILTERS = [
  ["all", "Everyone"],
  ["doctor", "Doctors"],
  ["nurse", "Nurses"],
  ["lab", "Lab"],
  ["pharmacist", "Pharmacy"],
  ["facilities", "Facilities"],
  ["reception", "Front desk"],
  ["admin", "Admin"],
  ["command", "Command"],
] as const;

export function TaskInbox() {
  const [status, setStatus] = useState("active");
  const [role, setRole] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const qs = new URLSearchParams({ status, ...(role !== "all" && { mine: role }) }).toString();
  const { data, error, loading, refresh } = useNx<{ tasks: Task[]; counts: { open: number; inProgress: number; blocked: number; critical: number; overdue: number; doneToday: number } }>(`/api/nx/tasks?${qs}`, { pollMs: 25000 });

  async function act(id: string, patch: Record<string, unknown>) {
    setBusyId(id);
    try {
      await nx("/api/nx/tasks", { method: "PATCH", body: JSON.stringify({ id, ...patch }) });
      toast.success(patch.escalate ? "Escalated to the next level" : patch.status === "done" ? "Task completed — audited" : "Task updated");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Open" value={data?.counts.open ?? "—"} tone="info" />
        <Stat label="In progress" value={data?.counts.inProgress ?? "—"} tone="default" />
        <Stat label="Blocked" value={data?.counts.blocked ?? "—"} tone="warn" />
        <Stat label="Critical" value={data?.counts.critical ?? "—"} tone="critical" />
        <Stat label="Overdue" value={data?.counts.overdue ?? "—"} tone="critical" />
        <Stat label="Done today" value={data?.counts.doneToday ?? "—"} tone="good" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["active", "done"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition", status === s ? "bg-accent-soft text-accent ring-1 ring-accent-line" : "text-ink-3 hover:bg-inset")}>
            {s === "active" ? "Active" : "Completed"}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-inset" />
        {ROLE_FILTERS.map(([v, label]) => (
          <button key={v} onClick={() => setRole(v)} className={cn("rounded-lg px-2.5 py-1.5 text-xs transition", role === v ? "bg-inset text-ink" : "text-ink-3 hover:bg-inset")}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading rows={6} label="Loading prioritized queue…" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refresh} />
      ) : !data?.tasks.length ? (
        <Empty title="Queue is clear" hint="New tasks appear here as orders, results, escalations and automations create them." />
      ) : (
        <div className="space-y-2">
          {data.tasks.map((t) => {
            const due = minsUntil(t.dueAt);
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-xl border bg-panel p-4",
                  t.priority === "critical" ? "border-crit-line shadow-[0_0_20px_-10px_rgba(244,63,94,0.5)]" : t.overdue ? "border-accent-line" : "border-line"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-ink">{t.title}</p>
                      <StatusPill status={t.priority} />
                      <Pill>{t.type}</Pill>
                      {t.escalationLevel > 0 && <Pill tone="critical">escalated L{t.escalationLevel}</Pill>}
                      {t.overdue && status === "active" && <Pill tone="critical">overdue</Pill>}
                    </div>
                    <p className="mt-1 text-[11px] text-ink-3">
                      {t.ownerName || t.ownerRole || "unassigned"} · {t.location || t.patientName || "hospital-wide"} · source: {t.sourceModule || "manual"}
                      {t.dueAt && ` · due in ${due != null && due < 0 ? `${-due}m overdue` : `${due}m`}`}
                    </p>
                    {t.reason && (
                      <p className="mt-1.5 rounded-md bg-inset px-2 py-1 text-[11px] text-ink-3">
                        <span className="font-semibold text-ink-2">Why prioritized:</span> {t.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {busyId === t.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-ink-3" />
                    ) : status === "active" ? (
                      <>
                        {t.status === "open" && (
                          <button onClick={() => act(t.id, { status: "in_progress" })} className="flex items-center gap-1 rounded-md border border-line-2 px-2 py-1 text-[11px] text-ink-2 hover:bg-inset">
                            <Play className="h-3 w-3" /> Start
                          </button>
                        )}
                        <button onClick={() => act(t.id, { status: "done" })} className="flex items-center gap-1 rounded-md border border-good-line px-2 py-1 text-[11px] text-good hover:bg-good-soft">
                          <Check className="h-3 w-3" /> Complete
                        </button>
                        <button onClick={() => act(t.id, { escalate: true })} className="flex items-center gap-1 rounded-md border border-crit-line px-2 py-1 text-[11px] text-crit hover:bg-crit-soft">
                          <ArrowUpRight className="h-3 w-3" /> Escalate
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-ink-4">completed {timeAgo(t.createdAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Panel title="How prioritization works">
        <p className="text-xs leading-relaxed text-ink-3">
          The queue is ordered deterministically: <Pill tone="critical">critical</Pill> safety items first, then by SLA deadline. Every item carries a
          human-readable <span className="text-ink">reason</span> explaining why it sits where it does. Nexura Intelligence may surface items,
          but it can never hide, reorder silently, or suppress a critical alert — escalation rules are code, not suggestions.
        </p>
      </Panel>
    </div>
  );
}
