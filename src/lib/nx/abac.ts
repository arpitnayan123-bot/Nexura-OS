import { db } from "@/lib/db";
import type { NxSession } from "./session";

/* ============================================================
   NEXURA OS v5 — ATTRIBUTE-BASED ACCESS CONTROL (ABAC)
   RBAC answers "can this ROLE act?"; ABAC answers "can THIS
   PERSON, in THIS department, ward, shift and assignment scope,
   act on THIS patient right NOW?" Policies are data per hospital.

   Evaluation order: explicit deny wins → explicit allow →
   default allow (backward compatible when no policies exist).
   Pure evaluator is unit-tested; DB layer is a thin fetch.
   ============================================================ */

export type AbacAction = "read" | "write" | "sign" | "dispense" | "approve";
export type AbacResource = "patients" | "notes" | "orders" | "billing" | "medications";

export interface AbacTarget {
  patientId?: string;
  departmentId?: string | null;
  department?: string | null;
  ward?: string | null;
}

export interface AbacPolicyShape {
  id: string;
  role: string | null;
  effect: "allow" | "deny";
  deptScope: string | null; // JSON string[]
  wardScope: string | null; // JSON string[]
  patientScope: "any" | "assigned" | "ward";
  timeWindows: string | null; // JSON [{days:[1-7],from:"HH:MM",to:"HH:MM"}]
  action: string;
  resource: string;
  active: boolean;
}

interface Decision {
  allowed: boolean;
  reason: string;
}

function safeArr(raw: string | null): string[] {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/** HH:MM → minutes since midnight */
function mins(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

interface TimeWindow {
  days?: number[];
  from?: string;
  to?: string;
}

function parseWindows(raw: string | null): TimeWindow[] {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? (v as TimeWindow[]) : [];
  } catch {
    return [];
  }
}

/** Is `now` inside ANY of the policy's time windows? Null/empty = always. */
export function inTimeWindow(timeWindowsJson: string | null, now = new Date()): boolean {
  const windows = parseWindows(timeWindowsJson);
  if (!windows.length) return true;
  const day = now.getDay() === 0 ? 7 : now.getDay(); // 1=Mon..7=Sun
  const cur = now.getHours() * 60 + now.getMinutes();
  return windows.some((w) => {
    const days = (w.days ?? [1, 2, 3, 4, 5, 6, 7]).map(Number);
    if (!days.includes(day)) return false;
    const from = mins(w.from ?? "00:00");
    const to = mins(w.to ?? "23:59");
    if (from <= to) return cur >= from && cur <= to;
    return cur >= from || cur <= to; // overnight window (e.g. 20:00→07:00)
  });
}

export function evaluateAbac(
  policies: AbacPolicyShape[],
  args: {
    session: Pick<NxSession, "role" | "department"> & {
      userId?: string;
      departmentId?: string | null;
    };
    action: AbacAction | "*";
    resource: AbacResource;
    target?: AbacTarget;
    assignedPatientIds?: string[]; // caller-provided assignment scope (e.g. care team)
    wardPatientsVisible?: boolean; // caller: user's current ward equals target ward
    now?: Date;
  },
): Decision {
  const now = args.now ?? new Date();
  const applicable = policies.filter(
    (p) =>
      p.active &&
      (p.resource === "*" || p.resource === args.resource) &&
      (p.action === "*" || p.action === args.action) &&
      (p.role === null || p.role === args.session.role),
  );
  if (!applicable.length) return { allowed: true, reason: "no_policy" };

  let allow = false;
  let reason = "default_deny";
  for (const p of applicable) {
    if (!inTimeWindow(p.timeWindows, now)) {
      if (p.effect === "deny") return { allowed: false, reason: `time_window_deny:${p.id}` };
      continue;
    }
    const depts = safeArr(p.deptScope);
    if (depts.length) {
      const scope = [args.session.department, args.session.departmentId]
        .filter(Boolean)
        .map(String);
      if (!depts.some((d) => scope.includes(d))) {
        if (p.effect === "deny") return { allowed: false, reason: `dept_deny:${p.id}` };
        continue;
      }
    }
    const wards = safeArr(p.wardScope);
    if (wards.length) {
      const targetWard = args.target?.ward;
      if (!targetWard || !wards.includes(targetWard)) {
        if (p.effect === "deny") return { allowed: false, reason: `ward_deny:${p.id}` };
        continue;
      }
    }
    if (p.patientScope === "assigned") {
      const ok = Boolean(
        args.target?.patientId && args.assignedPatientIds?.includes(args.target.patientId),
      );
      if (!ok) {
        if (p.effect === "deny") return { allowed: false, reason: `assignment_deny:${p.id}` };
        continue;
      }
    } else if (p.patientScope === "ward") {
      const ok = Boolean(args.wardPatientsVisible);
      if (!ok) {
        if (p.effect === "deny") return { allowed: false, reason: `ward_scope_deny:${p.id}` };
        continue;
      }
    }
    // all constraints passed for this policy
    if (p.effect === "allow") {
      allow = true;
      reason = `allow:${p.id}`;
    } else {
      return { allowed: false, reason: `deny:${p.id}` };
    }
  }
  return { allowed: allow, reason };
}

export async function policiesFor(hospitalId: string): Promise<AbacPolicyShape[]> {
  const rows = await db.nxAbacPolicy.findMany({ where: { hospitalId, active: true } });
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    effect: r.effect as "allow" | "deny",
    deptScope: r.deptScope,
    wardScope: r.wardScope,
    patientScope: r.patientScope as AbacPolicyShape["patientScope"],
    timeWindows: r.timeWindows,
    action: r.action,
    resource: r.resource,
    active: r.active,
  }));
}

/** One-call gate for routes: loads policies and evaluates. */
export async function abacCheck(
  session: NxSession,
  args: {
    action: AbacAction | "*";
    resource: AbacResource;
    target?: AbacTarget;
    assignedPatientIds?: string[];
    wardPatientsVisible?: boolean;
  },
): Promise<Decision> {
  if (!session.hospitalId) return { allowed: false, reason: "no_hospital_context" };
  const policies = await policiesFor(session.hospitalId);
  return evaluateAbac(policies, {
    session: {
      userId: session.userId,
      role: session.role,
      department: session.department,
      departmentId: undefined,
    },
    ...args,
  });
}
