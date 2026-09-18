"use client";

import { useState } from "react";
import { toast } from "./os/toast";
import { Bot, Lock, Play, Workflow } from "lucide-react";
import { nx, useNx, timeAgo } from "./client";
import { Empty, ErrorState, Loading, Panel, Pill, Stat, StatusPill } from "./bits";

/* ============================================================
   AUTOMATION BUILDER — visual rules + deterministic execution
   ============================================================ */

interface Rule {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  actions: string[];
  enabled: boolean;
  requiresApproval: boolean;
  lastRunAt: string | null;
  runCount: number;
}
interface Run {
  id: string;
  ruleName: string;
  patientUhid: string | null;
  patientId: string | null;
  status: string;
  currentStep: string | null;
  steps: Array<{ name: string; status: string; detail: string; at: string }>;
  startedAt: string;
  completedAt: string | null;
}
interface AutomationData {
  rules: Rule[];
  runs: Run[];
  stats: { activeRules: number; totalRuns: number; runs24h: number };
}

export function AutomationBuilder() {
  const { data, error, loading, refresh } = useNx<AutomationData>("/api/nx/automations", {
    pollMs: 30000,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggle(id: string, enabled: boolean) {
    setBusyId(id);
    try {
      await nx("/api/nx/automations", { method: "PATCH", body: JSON.stringify({ id, enabled }) });
      toast.success(enabled ? "Automation enabled" : "Automation disabled — policy-logged");
      refresh();
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 403) toast.error("Administrator approval required to change automations");
      else toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function testFire(trigger: string) {
    try {
      await nx("/api/nx/automations", { method: "POST", body: JSON.stringify({ trigger }) });
      toast.success(`Test-fired "${trigger}" — check the work queue & incidents`);
      refresh();
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 403) toast.error("Test execution needs admin or command role");
      else toast.error(err.message);
    }
  }

  if (loading) return <Loading rows={5} label="Loading automation engine…" />;
  if (error) return <ErrorState message={error.message} onRetry={refresh} />;
  if (!data) return <Empty title="No data" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Active rules"
          value={data.stats.activeRules}
          tone="good"
          icon={<Workflow className="h-4 w-4" />}
        />
        <Stat label="Total runs" value={data.stats.totalRuns} tone="info" />
        <Stat label="Runs (24h)" value={data.stats.runs24h} tone="default" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          {data.rules.map((r) => (
            <Panel
              key={r.id}
              title={r.name}
              subtitle={r.description || undefined}
              tone={r.enabled ? "default" : "default"}
              actions={
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggle(r.id, !r.enabled)}
                    disabled={busyId === r.id}
                    className={`relative h-5 w-9 rounded-full transition ${r.enabled ? "bg-good" : "bg-inset"} disabled:opacity-50`}
                    title={r.enabled ? "Disable (admin only)" : "Enable (admin only)"}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${r.enabled ? "left-[18px]" : "left-0.5"}`}
                    />
                  </button>
                  <button
                    onClick={() => testFire(r.trigger)}
                    title={`Test-fire ${r.trigger}`}
                    className="rounded-md border border-line-2 p-1 text-ink-3 hover:bg-inset hover:text-ink"
                  >
                    <Play className="h-3 w-3" />
                  </button>
                </div>
              }
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="info">trigger: {r.trigger}</Pill>
                  <Pill>{r.runCount} runs</Pill>
                  {r.lastRunAt && <Pill>last {timeAgo(r.lastRunAt)}</Pill>}
                  {r.requiresApproval && (
                    <Pill tone="warn">
                      <Lock className="h-3 w-3" /> approval gate
                    </Pill>
                  )}
                </div>
                <ol className="space-y-1">
                  {r.actions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-ink-3">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-inset text-[9px] font-bold text-ink-3">
                        {i + 1}
                      </span>
                      {a}
                    </li>
                  ))}
                </ol>
              </div>
            </Panel>
          ))}
        </div>

        <Panel
          title="Run history"
          subtitle="Every execution recorded with step detail"
          className="self-start"
        >
          {data.runs.length === 0 ? (
            <Empty title="No runs yet" hint="Use the play button on a rule to test-fire it." />
          ) : (
            <div className="max-h-[560px] space-y-2 overflow-y-auto nx-scroll pr-1">
              {data.runs.map((run) => (
                <div key={run.id} className="rounded-lg border border-line bg-panel px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-ink">{run.ruleName}</p>
                    <StatusPill status={run.status} />
                  </div>
                  <p className="text-[10px] text-ink-3">
                    {run.patientUhid || "hospital-wide"} · started {timeAgo(run.startedAt)}
                  </p>
                  <div className="mt-1.5 space-y-0.5">
                    {run.steps.map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px]">
                        <span
                          className={
                            s.status === "done"
                              ? "text-good"
                              : s.status === "awaiting_approval"
                                ? "text-accent"
                                : "text-ink-4"
                          }
                        >
                          ●
                        </span>
                        <span className="text-ink-3">{s.name}</span>
                        <span className="ml-auto shrink-0 text-ink-4">{s.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Safety model">
        <div className="grid gap-2 text-xs text-ink-3 md:grid-cols-2">
          <p className="flex items-start gap-2">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-vio" /> Automations are deterministic code
            — never AI. They coordinate (tasks, notifications, state) but never make irreversible
            clinical or financial decisions.
          </p>
          <p className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> Enabling/disabling rules
            requires administrator approval and is audit-logged. High-risk steps carry explicit
            human checkpoints and rollback paths.
          </p>
        </div>
      </Panel>
    </div>
  );
}
