import { db } from "@/lib/db";
import { createTask } from "@/lib/nx/automations";

/* ============================================================
   NEXURA OS v5 — CLINICAL PATHWAY ENGINE (lightweight rule DSL)
   A pathway = ordered steps; each step may declare:
     withinMin   — max minutes from run start (SLA)
     critical    — cannot be skipped, only completed or escalated
     requires    — step ids that must complete first
   Runs track completed/skipped/evidence. Advancing a step whose
   requirements are unmet returns a structured refusal — this is
   what prevents "skipped workflow steps" (order → report → act).
   ============================================================ */

export interface PathwayStep {
  id: string;
  title: string;
  withinMin: number;
  critical?: boolean;
  requires?: string[];
  ownerRole?: string;
  detail?: string;
}

export interface PathwayState {
  completed: string[]; // step ids with completion time
  skipped: string[];
  evidence: Record<string, string>;
  tasksCreated: string[];
}

export function parseSteps(stepsJson: string): PathwayStep[] {
  try {
    const v = JSON.parse(stepsJson);
    return Array.isArray(v) ? (v as PathwayStep[]) : [];
  } catch {
    return [];
  }
}

function parseState(stateJson: string | null): PathwayState {
  try {
    if (!stateJson) return { completed: [], skipped: [], evidence: {}, tasksCreated: [] };
    const v = JSON.parse(stateJson);
    return { completed: v.completed ?? [], skipped: v.skipped ?? [], evidence: v.evidence ?? {}, tasksCreated: v.tasksCreated ?? [] };
  } catch {
    return { completed: [], skipped: [], evidence: {}, tasksCreated: [] };
  }
}

export function stepOverdue(step: PathwayStep, startedAt: Date, now = new Date()): boolean {
  return now.getTime() - startedAt.getTime() > step.withinMin * 60_000;
}

export interface AdvanceResult {
  ok: boolean;
  reason?: string; // unknown_step | requires_unmet:stepId | critical_skip_blocked | already_done
  status?: "active" | "completed" | "escalated";
  nextSteps?: PathwayStep[];
}

export async function advanceRun(
  runId: string,
  args: { stepId: string; action: "complete" | "skip" | "escalate"; evidence?: string; actorName: string }
): Promise<AdvanceResult> {
  const run = await db.nxPathwayRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "active") return { ok: false, reason: run ? `run_${run.status}` : "unknown_run" };
  const def = await db.nxPathwayDef.findUnique({ where: { id: run.defId } });
  if (!def) return { ok: false, reason: "unknown_definition" };
  const steps = parseSteps(def.stepsJson);
  const step = steps.find((s) => s.id === args.stepId);
  if (!step) return { ok: false, reason: "unknown_step" };
  const state = parseState(run.stateJson);
  if (state.completed.includes(step.id)) return { ok: false, reason: "already_done" };
  if (args.action === "skip" && step.critical) return { ok: false, reason: "critical_skip_blocked" };

  for (const req of step.requires ?? []) {
    if (!state.completed.includes(req) && !state.skipped.includes(req)) {
      return { ok: false, reason: `requires_unmet:${req}` };
    }
  }

  if (args.action === "complete") {
    state.completed.push(step.id);
    if (args.evidence) state.evidence[step.id] = args.evidence;
  } else if (args.action === "skip") {
    state.skipped.push(step.id);
  } else {
    // escalate: create a task so a human owns the blockage
    const task = await createTask({
      hospitalId: run.hospitalId,
      title: `Pathway step escalated — ${step.title}${run.patientName ? ` — ${run.patientName}` : ""}`,
      type: "escalation",
      priority: "high",
      ownerRole: step.ownerRole ?? "nurse",
      patientId: run.patientId ?? undefined,
      patientName: run.patientName ?? undefined,
      dueMinutes: 30,
      reason: `Step "${step.title}" blocked past ${step.withinMin}min SLA on ${def.name}`,
      sourceModule: "pathways",
      relatedId: run.id,
    });
    state.tasksCreated.push(task.id);
  }

  const allDone = steps.every((s) => state.completed.includes(s.id) || state.skipped.includes(s.id));
  const status: "active" | "completed" | "escalated" = allDone ? "completed" : args.action === "escalate" ? "escalated" : "active";
  await db.nxPathwayRun.update({
    where: { id: run.id },
    data: { stateJson: JSON.stringify(state), currentStep: steps.find((s) => !state.completed.includes(s.id) && !state.skipped.includes(s.id))?.id ?? steps[steps.length - 1]?.id ?? "", status },
  });
  return {
    ok: true,
    status,
    nextSteps: steps.filter((s) => !state.completed.includes(s.id) && !state.skipped.includes(s.id)),
  };
}

/** Start a run and pre-create the first step's task when it has an owner. */
export async function startRun(defId: string, args: { hospitalId: string; patientId?: string; patientName?: string; startedBy: string }): Promise<{ runId: string; firstStep?: PathwayStep }> {
  const def = await db.nxPathwayDef.findUnique({ where: { id: defId } });
  if (!def || !def.active) throw new Error("unknown_definition");
  const steps = parseSteps(def.stepsJson);
  const run = await db.nxPathwayRun.create({
    data: {
      hospitalId: args.hospitalId,
      defId,
      patientId: args.patientId,
      patientName: args.patientName,
      currentStep: steps[0]?.id ?? "",
      status: "active",
      startedBy: args.startedBy,
      stateJson: JSON.stringify({ completed: [], skipped: [], evidence: {}, tasksCreated: [] }),
    },
  });
  const first = steps[0];
  if (first?.ownerRole) {
    const task = await createTask({
      hospitalId: args.hospitalId,
      title: `${def.name}: ${first.title}${args.patientName ? ` — ${args.patientName}` : ""}`,
      type: "task",
      priority: first.critical ? "critical" : "high",
      ownerRole: first.ownerRole,
      patientId: args.patientId,
      patientName: args.patientName,
      dueMinutes: first.withinMin,
      reason: `Pathway ${def.code} started — step 1 of ${steps.length}`,
      sourceModule: "pathways",
      relatedId: run.id,
    });
    const state = parseState(null);
    state.tasksCreated.push(task.id);
    await db.nxPathwayRun.update({ where: { id: run.id }, data: { stateJson: JSON.stringify(state) } });
  }
  return { runId: run.id, firstStep: first };
}
