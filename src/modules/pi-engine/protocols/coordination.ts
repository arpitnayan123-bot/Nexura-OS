/* ============================================================
 * PIE Phase 3.2 — Automated Coordination (Human-in-the-Loop)
 * Approved protocol → concrete tasks in the WorkQueue (NxTask),
 * role-routed, with notifications. PIE does the heavy lifting;
 * clinicians hold the approval pen. Persistence via injected
 * adapter so this stays unit-testable.
 * ============================================================ */

import type { PreEmptiveProtocolSpec } from "../types";

export interface CoordinationTask {
  title: string;
  description: string;
  assigneeRole: "doctor" | "nurse" | "pharmacy" | "lab";
  priority: "routine" | "urgent" | "stat";
  dueWindow: string;
  sourceProtocol: string; // protocol code
}

export interface NotificationStub {
  audience: string;
  message: string;
  channel: "in_app" | "sms" | "push";
}

export interface CoordinationResult {
  tasks: CoordinationTask[];
  notifications: NotificationStub[];
}

/** Build the task list + notifications an approved protocol creates. */
export function planCoordination(
  spec: PreEmptiveProtocolSpec,
  patientLabel: string,
): CoordinationResult {
  const tasks: CoordinationTask[] = [];
  for (const a of spec.immediate) {
    tasks.push({
      title: `${a.role === "nurse" ? "Nursing" : a.role === "pharmacy" ? "Pharmacy" : a.role === "lab" ? "Lab" : "Doctor"}: ${shorten(a.action)}`,
      description: `${a.action} — for ${patientLabel}. Protocol: ${spec.title}. Window: ${a.window}.`,
      assigneeRole: a.role,
      priority: a.window.includes("immediate") || a.window.includes("1h") ? "stat" : "urgent",
      dueWindow: a.window,
      sourceProtocol: spec.code,
    });
  }
  for (const a of spec.monitoring) {
    tasks.push({
      title: `Monitor: ${shorten(a.action)}`,
      description: `${a.action} — for ${patientLabel}. Protocol: ${spec.title}. Window: ${a.window}.`,
      assigneeRole: a.role,
      priority: "urgent",
      dueWindow: a.window,
      sourceProtocol: spec.code,
    });
  }
  return {
    tasks,
    notifications: [
      {
        audience: "attending_physician",
        message: `PIE protocol "${spec.title}" needs your approval for ${patientLabel}.`,
        channel: "in_app",
      },
      {
        audience: "charge_nurse",
        message: `Pre-emptive protocol tasks created for ${patientLabel}.`,
        channel: "in_app",
      },
    ],
  };
}

function shorten(s: string, max = 64): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** Adapter surface the API route fulfills with Prisma. */
export interface CoordinationSink {
  createTasks(
    tasks: CoordinationTask[],
    ctx: { patientId: string; protocolId: string },
  ): Promise<number>;
  notify(
    items: NotificationStub[],
    ctx: { patientId: string; protocolId: string },
  ): Promise<number>;
}

/**
 * Execute coordination on approval. Returns counts. Never throws on
 * partial failure — returns what succeeded so the API can report it.
 */
export async function executeCoordination(
  sink: CoordinationSink,
  spec: PreEmptiveProtocolSpec,
  ctx: { patientId: string; patientLabel: string; protocolId: string },
): Promise<{ tasks: number; notifications: number }> {
  const plan = planCoordination(spec, ctx.patientLabel);
  let tasks = 0,
    notifications = 0;
  try {
    tasks = await sink.createTasks(plan.tasks, {
      patientId: ctx.patientId,
      protocolId: ctx.protocolId,
    });
  } catch {
    tasks = 0;
  }
  try {
    notifications = await sink.notify(plan.notifications, {
      patientId: ctx.patientId,
      protocolId: ctx.protocolId,
    });
  } catch {
    notifications = 0;
  }
  return { tasks, notifications };
}
