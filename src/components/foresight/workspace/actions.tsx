"use client";

/* ============================================================
 * RECOMMENDED ACTIONS — the decision board.
 * Priority-ranked next steps from the engine's own action
 * items: each with reason, effort, related domain, and honest
 * language ("consider", "monitor" — never guarantees).
 * Done/dismissed tracking persists locally per run.
 * ============================================================ */

import { motion } from "framer-motion";
import { CheckCircle2, Circle, ListChecks, RotateCcw, X } from "lucide-react";
import type { ActionRow } from "@/modules/foresight/workspace";
import { SectionHead, fadeUp } from "../ui";
import { cn } from "@/lib/utils";

const EFFORT_COPY: Record<ActionRow["effort"], string> = {
  easy: "easy swap",
  moderate: "habit to build",
  "with-doctor": "with your doctor",
};

const PRIORITY_COPY: Record<ActionRow["priority"], { label: string; cls: string }> = {
  1: { label: "start here", cls: "border-rose-300/45 bg-rose-300/[0.10] text-rose-200" },
  2: { label: "high value", cls: "border-amber-300/45 bg-amber-300/[0.10] text-amber-200" },
  3: { label: "worth adding", cls: "border-teal-300/40 bg-teal-300/[0.08] text-teal-200" },
};

const STORE_KEY = "nx_fs_action_state_v1";

export type ActionState = Record<string, "done" | "dismissed">;

export function loadActionState(): ActionState {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as ActionState) : {};
  } catch {
    return {};
  }
}

export function ActionsBoard({
  actions,
  state,
  onChange,
}: {
  actions: ActionRow[];
  state: ActionState;
  onChange: (s: ActionState) => void;
}) {
  const active = actions.filter((a) => state[a.key] !== "dismissed");
  const doneCount = active.filter((a) => state[a.key] === "done").length;
  const hasCustom = Object.keys(state).length > 0;

  const update = (key: string, next: "done" | "dismissed" | undefined) => {
    const copy: ActionState = { ...state };
    if (next) copy[key] = next;
    else delete copy[key];
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(copy));
    } catch { /* private mode */ }
    onChange(copy);
  };

  return (
    <motion.section {...fadeUp} aria-labelledby="nxf-actions-title">
      <SectionHead
        eyebrow="Recommended actions"
        title="The shortest path to a better curve"
        sub="Ranked by the burden they answer. Consider, monitor, validate — the engine never promises; it tells you where leverage lives."
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12.5px] nxf-dim" aria-live="polite">
          <ListChecks aria-hidden="true" className="h-4 w-4 nxf-teal" />
          {active.length === 0
            ? "Nothing pending — a clean board."
            : `${doneCount} of ${active.length} action${active.length === 1 ? "" : "s"} marked done`}
        </p>
        {hasCustom && (
          <button
            type="button"
            onClick={() => { try { window.localStorage.removeItem(STORE_KEY); } catch { /* noop */ } onChange({}); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11.5px] font-semibold nxf-body transition hover:border-amber-300/50 hover:text-amber-100"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset tracking
          </button>
        )}
      </div>

      {active.length === 0 ? (
        <div className="nxf-glass rounded-3xl p-8 text-center">
          <p className="text-[15px] font-semibold nxf-hi">No open recommendations on this run</p>
          <p className="mt-1 text-[13px] nxf-dim">Every suggested action has been dismissed or completed. Re-run a check-in after your changes land.</p>
        </div>
      ) : (
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {active.map((a, i) => {
            const done = state[a.key] === "done";
            const prio = PRIORITY_COPY[a.priority];
            return (
              <motion.li
                key={a.key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.06 }}
                className={cn(
                  "nxf-glass nxf-glass-hover flex flex-col rounded-2xl p-4 transition",
                  done && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn("rounded-full border px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em]", prio.cls)}>
                    {prio.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={done}
                      aria-label={done ? `Mark "${a.title}" as not done` : `Mark "${a.title}" as done`}
                      onClick={() => update(a.key, done ? undefined : "done")}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-emerald-300 transition hover:border-emerald-300/50"
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      aria-label={`Dismiss "${a.title}"`}
                      onClick={() => update(a.key, "dismissed")}
                      className="grid h-8 w-8 place-items-center rounded-full border border-white/10 nxf-mute transition hover:border-rose-300/40 hover:text-rose-300"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <p className={cn("mt-2.5 text-[14px] font-semibold leading-snug nxf-hi", done && "line-through decoration-emerald-300/50")}>
                  {a.title}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed nxf-dim">{a.detail}</p>

                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3 text-[10.5px]">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-semibold uppercase tracking-[0.1em] nxf-mute">
                    {EFFORT_COPY[a.effort]}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 nxf-dim">
                    answers {a.domainLabel}
                  </span>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </motion.section>
  );
}
