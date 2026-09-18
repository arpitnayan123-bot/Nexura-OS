/** AI cost/token accounting — the measurement half of AI honesty.
 *
 *  Every AI call through the canonical client (src/lib/openrouter.ts) records
 *  what it consumed into the AiUsageLog ledger: capability (feature label),
 *  provider path, token counts and cost in INTEGER micro-USD (never float
 *  money — same discipline as the paise migration).
 *
 *  Honesty rules baked in here:
 *  - tokenSource and costSource are tracked SEPARATELY — a provider may report
 *    exact tokens while cost still comes from our local price table.
 *  - The price table is CONFIGURATION, not a quoted contract rate. Rows are
 *    labelled `estimated` until the provider itself reports usage/cost.
 *  - No prompt or completion content is ever stored — metadata only.
 *  - The ledger write is fire-and-forget and swallows every error: accounting
 *    must never break (or even slow down) a clinical AI call. */

import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { getAiActor } from "@/lib/ai-actor";

/* ---------- Pricing configuration (micro-USD per MILLION tokens) ----------
 * Approximate glm-flash-class reference rates. Tune against the OpenRouter
 * model pricing page as billing actuals arrive; the ledger's costSource
 * column keeps every derived number honestly labelled either way. */
const MODEL_PRICES: Record<string, { prompt: number; completion: number }> = {
  "z-ai/glm-5.3-flash": { prompt: 100_000, completion: 300_000 }, // ≈$0.10 / $0.30 per 1M
};
/** Fallback for unlisted models — slightly conservative so sums never understate. */
const DEFAULT_PRICE = { prompt: 150_000, completion: 450_000 };

export function priceFor(model: string): { prompt: number; completion: number } {
  return MODEL_PRICES[model] ?? DEFAULT_PRICE;
}

/* ---------- Token estimation ----------
 * ~4 chars/token is the standard rough heuristic for English + code; good
 * enough for accounting trends, explicitly NOT for billing reconciliation. */
export function estimateTokensFromChars(chars: number): number {
  return Math.max(1, Math.ceil((chars || 0) / 4));
}

export function estimateTokens(text: string): number {
  return estimateTokensFromChars((text || "").length);
}

/** Integer micro-USD for the given token counts. Token counts are small
 *  (≤ ~8k each) and prices ≤ 1e6, so the product stays far below 2^53 —
 *  exact integer math, no float rounding surprises. */
export function estimateCostMicroUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const p = priceFor(model);
  return Math.round((promptTokens * p.prompt + completionTokens * p.completion) / 1_000_000);
}

/* ---------- Provider usage normalization ----------
 * OpenRouter reports { prompt_tokens, completion_tokens, total_tokens, cost };
 * the z-ai SDK returns `any` — historically { tokens } or nothing at all. */
export interface ProviderUsage {
  prompt: number | null;
  completion: number | null;
  total: number | null;
}

export function normalizeProviderUsage(u: unknown): ProviderUsage | null {
  if (!u || typeof u !== "object") return null;
  const o = u as Record<string, unknown>;
  const int = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
  const prompt = int(o.prompt_tokens);
  const completion = int(o.completion_tokens);
  // OpenRouter-style total first, then the SDK's flat { tokens } shape.
  const total = int(o.total_tokens) ?? int(o.tokens);
  if (prompt === null && completion === null && total === null) return null;
  return { prompt, completion, total };
}

/* ---------- Ledger record ---------- */
export interface AiUsageRecord {
  capability: string;
  provider: "openrouter" | "z-ai";
  model: string;
  tokensPrompt: number | null;
  tokensCompletion: number | null;
  tokensTotal: number | null;
  costMicroUsd: number | null;
  tokenSource: "provider" | "estimated" | "unknown";
  costSource: "provider" | "estimated" | "unknown";
  latencyMs: number;
  success: boolean;
  fallbackUsed: boolean;
  errorCode?: string | null;
  requestId?: string | null;
  /** Explicit identity override — normally captured automatically from
   *  the request's verified session via ai-actor.ts. Tests may pass it
   *  directly; production code should let the context carry it. */
  userId?: string | null;
  userRole?: string | null;
}

/** Fire-and-forget ledger write — never throws, never blocks the caller. */
export function recordAiUsage(rec: AiUsageRecord): void {
  const tokensTotal =
    rec.tokensTotal ??
    (rec.tokensPrompt !== null || rec.tokensCompletion !== null
      ? (rec.tokensPrompt ?? 0) + (rec.tokensCompletion ?? 0)
      : null);
  // Per-request identity: captured from the verified session context when
  // the caller did not pass it explicitly. `undefined` = not specified
  // (fall through to the ambient actor); explicit `null` = force no
  // identity on the row. No session at all → null columns (honestly
  // unattributed — system/cron AI calls, never a guess).
  const actor = getAiActor();
  void db.aiUsageLog
    .create({
      data: {
        capability: rec.capability || "unattributed",
        provider: rec.provider,
        model: rec.model,
        tokensPrompt: rec.tokensPrompt,
        tokensCompletion: rec.tokensCompletion,
        tokensTotal,
        costMicroUsd: rec.costMicroUsd,
        tokenSource: rec.tokenSource,
        costSource: rec.costSource,
        latencyMs: Math.max(0, Math.round(rec.latencyMs)),
        success: rec.success,
        fallbackUsed: rec.fallbackUsed,
        errorCode: rec.errorCode ? String(rec.errorCode).slice(0, 200) : null,
        requestId: rec.requestId ?? null,
        userId: rec.userId !== undefined ? rec.userId : (actor?.userId ?? null),
        userRole: rec.userRole !== undefined ? rec.userRole : (actor?.role ?? null),
      },
    })
    .catch((e: unknown) =>
      log.warn("ai-usage", "ledger write failed (call unaffected)", {
        err: e instanceof Error ? e.message : String(e),
      }),
    );
}

/* ---------- Rollup (admin surface) ---------- */
export interface AiUsageBucket {
  key: string;
  calls: number;
  failures: number;
  tokensTotal: number;
  costMicroUsd: number;
}

export interface AiUsageSummary {
  windowDays: number;
  totals: AiUsageBucket;
  byCapability: AiUsageBucket[];
  byProvider: AiUsageBucket[];
  /** Top identities by cost in the window (verified-session rows only;
   *  system/cron rows carry null identity and are excluded honestly). */
  byUser: (AiUsageBucket & { userRole: string | null })[];
  /** Rows whose cost came from the provider itself (not our price table). */
  providerReportedCostRows: number;
  /** Rows with no token or cost information at all (e.g. failed calls). */
  unknownRows: number;
  /** Rows with no verified-session identity (system/background calls). */
  unattributedRows: number;
}

function sumBuckets(
  map: Map<string, AiUsageBucket>,
  key: string,
  row: { calls: number; failures: number; tokens: number | null; cost: number | null },
): void {
  const b = map.get(key) ?? { key, calls: 0, failures: 0, tokensTotal: 0, costMicroUsd: 0 };
  b.calls += row.calls;
  b.failures += row.failures;
  b.tokensTotal += row.tokens ?? 0;
  b.costMicroUsd += row.cost ?? 0;
  map.set(key, b);
}

export async function aiUsageSummary(windowDays = 30): Promise<AiUsageSummary> {
  const days = Math.min(90, Math.max(1, Math.round(windowDays)));
  const since = new Date(Date.now() - days * 86_400_000);
  const base = { createdAt: { gte: since } };

  // groupBy cannot conditional-count, so failures come from a second pass —
  // both queries are indexed on (capability, createdAt) / (provider, createdAt).
  const [capRows, capFails, provRows, failTotal] = await Promise.all([
    db.aiUsageLog.groupBy({
      by: ["capability"],
      where: base,
      _count: { _all: true },
      _sum: { tokensTotal: true, costMicroUsd: true },
    }),
    db.aiUsageLog.groupBy({
      by: ["capability"],
      where: { ...base, success: false },
      _count: { _all: true },
    }),
    db.aiUsageLog.groupBy({
      by: ["provider"],
      where: base,
      _count: { _all: true },
      _sum: { tokensTotal: true, costMicroUsd: true },
    }),
    db.aiUsageLog.count({ where: { ...base, success: false } }),
  ]);

  // Per-identity rollup — only rows that carry a verified-session userId.
  const [userRows, unattributedRows] = await Promise.all([
    db.aiUsageLog.groupBy({
      by: ["userId", "userRole"],
      where: { ...base, userId: { not: null } },
      _count: { _all: true },
      _sum: { tokensTotal: true, costMicroUsd: true },
    }),
    db.aiUsageLog.count({ where: { ...base, userId: null } }),
  ]);

  // Provider-reported-cost and fully-unknown row counts (single scan each).
  const [provCostRows, unknownRows] = await Promise.all([
    db.aiUsageLog.count({ where: { ...base, costSource: "provider" } }),
    db.aiUsageLog.count({ where: { ...base, tokenSource: "unknown", costSource: "unknown" } }),
  ]);

  const caps = new Map<string, AiUsageBucket>();
  for (const r of capRows)
    sumBuckets(caps, r.capability, {
      calls: r._count._all,
      failures: 0,
      tokens: r._sum.tokensTotal,
      cost: r._sum.costMicroUsd,
    });
  const fails = new Map<string, number>();
  for (const r of capFails) fails.set(r.capability, r._count._all);

  const provs = new Map<string, AiUsageBucket>();
  for (const r of provRows)
    sumBuckets(provs, r.provider, {
      calls: r._count._all,
      failures: 0,
      tokens: r._sum.tokensTotal,
      cost: r._sum.costMicroUsd,
    });

  const byCapability = [...caps.values()].map((b) => ({ ...b, failures: fails.get(b.key) ?? 0 }));
  const totals = [...byCapability.values()].reduce<AiUsageBucket>(
    (acc, b) => ({
      key: "all",
      calls: acc.calls + b.calls,
      failures: acc.failures + b.failures,
      tokensTotal: acc.tokensTotal + b.tokensTotal,
      costMicroUsd: acc.costMicroUsd + b.costMicroUsd,
    }),
    { key: "all", calls: 0, failures: 0, tokensTotal: 0, costMicroUsd: 0 },
  );

  const byUser = userRows
    .map((r) => ({
      key: r.userId ?? "unknown",
      userRole: r.userRole,
      calls: r._count._all,
      failures: 0,
      tokensTotal: r._sum.tokensTotal ?? 0,
      costMicroUsd: r._sum.costMicroUsd ?? 0,
    }))
    .sort((a, b) => b.costMicroUsd - a.costMicroUsd || b.calls - a.calls)
    .slice(0, 10);

  return {
    windowDays: days,
    totals,
    byCapability: byCapability.sort((a, b) => b.costMicroUsd - a.costMicroUsd || b.calls - a.calls),
    byProvider: [...provs.values()].sort((a, b) => b.calls - a.calls),
    byUser,
    providerReportedCostRows: provCostRows,
    unknownRows,
    unattributedRows,
  };
}
