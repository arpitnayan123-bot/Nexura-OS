/* Nexura DIY — shared client-side types */

export interface ParsedGoalClient {
  clientKey: string;
  rawGoalText: string;
  category: string;
  confidence: number;
  requestedTimeframeDays: number | null;
  needsClarify: boolean;
  clarifyQuestion?: string;
}

export interface SafetyPayload {
  action: "ALLOW" | "CLARIFY" | "SOFT_LIMIT" | "STOP_AND_REFER" | "EMERGENCY";
  message?: string;
  matched?: { id: string; kind: string; severity: string; message: string }[];
}

export interface ConsentScopeRow {
  scope: string;
  purpose: string;
  granted: boolean;
}

export interface GoalRow {
  id: string;
  text?: string;
  rawGoalText?: string;
  category: string;
  status: string;
  timeframeDays?: number | null;
}

export interface DashboardTask {
  id: string;
  title: string;
  detail: string;
  estMinutes: number;
  category: string;
  goalText: string;
  status: string;
  note?: string | null;
}

export interface DashboardData {
  date: string;
  goals: GoalRow[];
  plans: {
    id: string;
    goalId: string;
    goalText: string;
    version: number;
    summary: string;
    sourcePack: string;
    sourceKeys: string;
    burdenMinutes: number;
    milestones: { id: string; title: string; detail?: string; targetDay: number }[];
  }[];
  todayTasks: DashboardTask[];
  weekly: { id: string; title: string; detail: string; category: string; goalText: string }[];
  doneCount: number;
  skippedCount: number;
  conflicts: { id: string; rule: string; explanation: string; resolution: string }[];
  progressToday: { mood?: number | null; energy?: number | null; sleep?: number | null } | null;
}

/** fetch wrapper: JSON in/out, throws { code, message } */
export async function diyFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { code: string; message: string } };
  if (!res.ok) {
    throw Object.assign(new Error(body?.error?.message ?? `Request failed (${res.status})`), {
      code: body?.error?.code,
      payload: body,
    });
  }
  return body;
}
