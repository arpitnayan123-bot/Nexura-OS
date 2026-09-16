import { describe, it, expect, afterAll } from "vitest";
import {
  estimateTokens,
  estimateTokensFromChars,
  estimateCostMicroUsd,
  priceFor,
  normalizeProviderUsage,
  recordAiUsage,
  aiUsageSummary,
} from "@/lib/ai-usage";
import { db } from "@/lib/db";

/* AI cost/token accounting — integer micro-USD math, provider usage
 * normalization, fire-and-forget ledger writes, rollup aggregation. */

const TEST_CAPS = ["test.cap-a", "test.cap-b", "test.cap-c"];

afterAll(async () => {
  await db.aiUsageLog.deleteMany({ where: { capability: { in: TEST_CAPS } } }).catch(() => {});
});

describe("token estimation", () => {
  it("ceil-divides chars by 4", () => {
    expect(estimateTokensFromChars(0)).toBe(1);
    expect(estimateTokensFromChars(1)).toBe(1);
    expect(estimateTokensFromChars(4)).toBe(1);
    expect(estimateTokensFromChars(5)).toBe(2);
    expect(estimateTokensFromChars(400)).toBe(100);
  });

  it("estimateTokens handles empty/nullish text safely", () => {
    expect(estimateTokens("")).toBe(1);
    expect(estimateTokens("abcdefgh")).toBe(2);
  });
});

describe("pricing + integer cost math", () => {
  it("known model uses its configured rates", () => {
    const p = priceFor("z-ai/glm-5.3-flash");
    expect(p).toEqual({ prompt: 100_000, completion: 300_000 });
  });

  it("unknown model falls back to the conservative default", () => {
    expect(priceFor("mystery/model")).toEqual({ prompt: 150_000, completion: 450_000 });
  });

  it("cost is exact integer micro-USD (no float drift)", () => {
    // 1000 prompt @ $0.10/M = 100 micro-USD; 500 completion @ $0.30/M = 150 → 250
    expect(estimateCostMicroUsd("z-ai/glm-5.3-flash", 1000, 500)).toBe(250);
    // 1M tokens @ $0.10/M = $0.10 = 100_000 micro-USD
    expect(estimateCostMicroUsd("z-ai/glm-5.3-flash", 1_000_000, 0)).toBe(100_000);
    expect(estimateCostMicroUsd("z-ai/glm-5.3-flash", 0, 0)).toBe(0);
  });
});

describe("normalizeProviderUsage", () => {
  it("normalizes the OpenRouter shape", () => {
    expect(normalizeProviderUsage({ prompt_tokens: 10.4, completion_tokens: 20, total_tokens: 30 })).toEqual({
      prompt: 10,
      completion: 20,
      total: 30,
    });
  });

  it("normalizes the SDK flat { tokens } shape", () => {
    expect(normalizeProviderUsage({ tokens: 42 })).toEqual({ prompt: null, completion: null, total: 42 });
  });

  it("rejects garbage and negative values", () => {
    expect(normalizeProviderUsage(null)).toBeNull();
    expect(normalizeProviderUsage("nope")).toBeNull();
    expect(normalizeProviderUsage({})).toBeNull();
    expect(normalizeProviderUsage({ prompt_tokens: -5 })).toBeNull();
    expect(normalizeProviderUsage({ prompt_tokens: "12" })).toBeNull();
  });
});

describe("ledger writes (real DB)", () => {
  it("persists a full record with tokensTotal derived when omitted", async () => {
    recordAiUsage({
      capability: "test.cap-a",
      provider: "z-ai",
      model: "z-ai/glm-5.3-flash",
      tokensPrompt: 100,
      tokensCompletion: 40,
      tokensTotal: null,
      costMicroUsd: 22,
      tokenSource: "estimated",
      costSource: "estimated",
      latencyMs: 123.6,
      success: true,
      fallbackUsed: false,
      errorCode: null,
    });
    await new Promise((r) => setTimeout(r, 120)); // allow the fire-and-forget write to land
    const row = await db.aiUsageLog.findFirst({ where: { capability: "test.cap-a" } });
    expect(row).not.toBeNull();
    expect(row!.tokensTotal).toBe(140); // derived from prompt + completion
    expect(row!.latencyMs).toBe(124); // rounded
    expect(row!.success).toBe(true);
    expect(row!.fallbackUsed).toBe(false);
  });

  it("blank capability is attributed as unattributed; errorCode is truncated", async () => {
    recordAiUsage({
      capability: "",
      provider: "openrouter",
      model: "z-ai/glm-5.3-flash",
      tokensPrompt: null,
      tokensCompletion: null,
      tokensTotal: null,
      costMicroUsd: null,
      tokenSource: "unknown",
      costSource: "unknown",
      latencyMs: 5,
      success: false,
      fallbackUsed: true,
      errorCode: "x".repeat(500),
    });
    await new Promise((r) => setTimeout(r, 120));
    const row = await db.aiUsageLog.findFirst({ where: { capability: "unattributed" } });
    expect(row).not.toBeNull();
    expect(row!.success).toBe(false);
    expect(row!.errorCode!.length).toBeLessThanOrEqual(200);
    // Don't pollute the ledger with fake unattributed failures — the
    // truncated error marks exactly the rows this test wrote.
    await db.aiUsageLog.deleteMany({ where: { capability: "unattributed", errorCode: "x".repeat(200) } });
  });

  it("never throws — a record that fails the DB write must not break the caller", async () => {
    // latencyMs: NaN survives Math.max(0, Math.round(NaN)) and makes Prisma reject;
    // the ledger's internal .catch must swallow it (an unhandled rejection fails this run).
    expect(() =>
      recordAiUsage({
        capability: "test.cap-c",
        provider: "z-ai",
        model: "m",
        tokensPrompt: null,
        tokensCompletion: null,
        tokensTotal: null,
        costMicroUsd: null,
        tokenSource: "unknown",
        costSource: "unknown",
        latencyMs: Number.NaN,
        success: false,
        fallbackUsed: false,
      })
    ).not.toThrow();
    await new Promise((r) => setTimeout(r, 150)); // rejection surfaces here if not caught
    const stored = await db.aiUsageLog.count({ where: { capability: "test.cap-c" } });
    expect(stored).toBe(0); // bad row absent, caller unaffected
  });
});

describe("aiUsageSummary rollup", () => {
  it("aggregates calls, tokens and cost per capability over the window", async () => {
    recordAiUsage({
      capability: "test.cap-b",
      provider: "z-ai",
      model: "z-ai/glm-5.3-flash",
      tokensPrompt: 400,
      tokensCompletion: 100,
      tokensTotal: 500,
      costMicroUsd: 70,
      tokenSource: "estimated",
      costSource: "estimated",
      latencyMs: 10,
      success: true,
      fallbackUsed: false,
    });
    recordAiUsage({
      capability: "test.cap-b",
      provider: "z-ai",
      model: "z-ai/glm-5.3-flash",
      tokensPrompt: 200,
      tokensCompletion: 100,
      tokensTotal: 300,
      costMicroUsd: 50,
      tokenSource: "estimated",
      costSource: "estimated",
      latencyMs: 10,
      success: false,
      fallbackUsed: true,
      errorCode: "boom",
    });
    await new Promise((r) => setTimeout(r, 150));

    const summary = await aiUsageSummary(30);
    const b = summary.byCapability.find((x) => x.key === "test.cap-b");
    expect(b).toBeDefined();
    expect(b!.calls).toBe(2);
    expect(b!.failures).toBe(1);
    expect(b!.tokensTotal).toBe(800);
    expect(b!.costMicroUsd).toBe(120);
    // totals must be at least the sum of the test rows written here
    expect(summary.totals.calls).toBeGreaterThanOrEqual(2);
    expect(summary.windowDays).toBe(30);
  });

  it("clamps the window into 1..90 days", async () => {
    expect((await aiUsageSummary(0)).windowDays).toBe(1);
    expect((await aiUsageSummary(500)).windowDays).toBe(90);
  });
});
