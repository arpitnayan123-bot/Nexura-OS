/* ============================================================
 * PIE Phase 1.5 — Behavioral Adherence
 * Digital interaction proxies for compliance & mental state:
 * med logging, appointment keeping, app engagement, sleep debt.
 * EWMA score 0..1 with recency weighting; feeds twin confidence
 * and the chronic-decay model.
 * ============================================================ */

export type AdherenceKind =
  | "med_logged"
  | "med_missed"
  | "appointment_kept"
  | "appointment_missed"
  | "app_login"
  | "plan_task_done"
  | "plan_task_skipped";

/** Positive events → 1, negative → 0, neutral engagement → 0.6. */
const KIND_SCORES: Record<AdherenceKind, number> = {
  med_logged: 1,
  med_missed: 0,
  appointment_kept: 1,
  appointment_missed: 0,
  app_login: 0.6,
  plan_task_done: 1,
  plan_task_skipped: 0,
};

export interface AdherenceInput {
  kind: AdherenceKind;
  ts: string;
}

/** EWMA adherence — recent behavior matters more (half-life ~14 days). */
export function adherenceScore(
  events: AdherenceInput[],
  now = new Date(),
): { score: number; n: number } {
  if (!events.length) return { score: 0.75, n: 0 }; // neutral-prior default
  const t = now.getTime();
  const sorted = [...events].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  const HALF_LIFE_DAYS = 14;
  const lambda = Math.log(2) / (HALF_LIFE_DAYS * 86_400_000);
  let wSum = 0,
    sSum = 0;
  for (const e of sorted) {
    const age = Math.max(0, t - new Date(e.ts).getTime());
    const w = Math.exp(-lambda * age);
    wSum += w;
    sSum += w * (KIND_SCORES[e.kind] ?? 0.6);
  }
  return { score: Number((sSum / (wSum || 1)).toFixed(3)), n: events.length };
}

/** Mental-state signal: engagement collapse = logins stop while meds logged stop too. */
export function engagementCollapse(
  events: AdherenceInput[],
  now = new Date(),
): { collapsed: boolean; daysSilent: number } {
  const t = now.getTime();
  const lastAny = events.length ? Math.max(...events.map((e) => new Date(e.ts).getTime())) : 0;
  const daysSilent = lastAny ? Math.floor((t - lastAny) / 86_400_000) : 999;
  return { collapsed: daysSilent >= 5 && events.length > 0, daysSilent };
}
