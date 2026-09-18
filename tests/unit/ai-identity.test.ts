import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { recordAiUsage, aiUsageSummary } from "@/lib/ai-usage";
import { setAiActor, getAiActor, resetAiActor } from "@/lib/ai-actor";
import { db } from "@/lib/db";

/* Per-request AI identity attribution:
 *  - actor context set from a VERIFIED session lands on the ledger row;
 *  - no session → null identity columns (honestly unattributed);
 *  - explicit record fields win over the context (test escape hatch);
 *  - the summary rolls up per-user spend from verified rows only.
 *  Every test resets the actor context first (enterWith persists for the
 *  remainder of a chain — exactly the semantics production relies on) and
 *  cleans up the rows it writes. */

const TEST_CAPS = ["test.identity-a", "test.identity-b"];

/**
 * Poll until fire-and-forget ledger writes are visible — a fixed sleep races
 * under CI load (write lands after the sleep → assertion on absent data).
 */
async function waitForLedger<T>(
  probe: () => Promise<T>,
  ok: (v: T) => boolean,
  timeoutMs = 8000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const v = await probe();
    if (ok(v) || Date.now() > deadline) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
}

beforeEach(() => resetAiActor());

afterAll(async () => {
  await db.aiUsageLog.deleteMany({ where: { capability: { in: TEST_CAPS } } }).catch(() => {});
});

function baseRow(capability: string) {
  return {
    capability,
    provider: "z-ai" as const,
    model: "z-ai/glm-5.3-flash",
    tokensPrompt: 10,
    tokensCompletion: 5,
    tokensTotal: 15,
    costMicroUsd: 8,
    tokenSource: "estimated" as const,
    costSource: "estimated" as const,
    latencyMs: 12,
    success: true,
    fallbackUsed: false,
  };
}

describe("ai-actor context", () => {
  it("starts clean — no ambient actor outside a verified session", () => {
    expect(getAiActor()).toBeNull();
  });

  it("the actor set in a request chain is visible to AI calls made on that same chain", () => {
    // Faithful simulation of a route handler: guard() sets the actor,
    // the AI client (recordAiUsage) reads it later in the same chain.
    function requestChain(): string | null {
      setAiActor({ userId: "staff-2", role: "auditor" });
      return getAiActor()?.userId ?? null;
    }
    expect(requestChain()).toBe("staff-2");
    // resetAiActor mirrors the next request not inheriting this one.
    resetAiActor();
    expect(getAiActor()).toBeNull();
  });
});

describe("recordAiUsage identity attribution", () => {
  it("captures the verified-session actor onto the ledger row", async () => {
    setAiActor({ userId: "user-attr-1", role: "doctor" });
    recordAiUsage(baseRow(TEST_CAPS[0]));
    const row = await waitForLedger(
      () => db.aiUsageLog.findFirst({ where: { capability: TEST_CAPS[0], userId: "user-attr-1" } }),
      (r) => r !== null,
    );
    expect(row).not.toBeNull();
    expect(row?.userRole).toBe("doctor");
  });

  it("leaves identity null when no session context exists (system/cron calls)", async () => {
    recordAiUsage(baseRow(TEST_CAPS[0]));
    const row = await waitForLedger(
      () =>
        db.aiUsageLog.findFirst({
          where: { capability: TEST_CAPS[0], userId: null, costMicroUsd: 8, latencyMs: 12 },
        }),
      (r) => r !== null,
    );
    expect(row).not.toBeNull();
    expect(row?.userId).toBeNull();
    expect(row?.userRole).toBeNull();
  });

  it("explicit record identity wins over the ambient context", async () => {
    setAiActor({ userId: "ambient-user", role: "doctor" });
    recordAiUsage({ ...baseRow(TEST_CAPS[0]), userId: "explicit-user", userRole: "auditor" });
    const row = await waitForLedger(
      () =>
        db.aiUsageLog.findFirst({ where: { capability: TEST_CAPS[0], userId: "explicit-user" } }),
      (r) => r !== null,
    );
    expect(row?.userRole).toBe("auditor");
    // the ambient actor must NOT have produced a row of its own
    const ambient = await db.aiUsageLog.findFirst({
      where: { capability: TEST_CAPS[0], userId: "ambient-user" },
    });
    expect(ambient).toBeNull();
  });
});

describe("aiUsageSummary byUser rollup", () => {
  it("aggregates verified rows per user and reports unattributed count", async () => {
    setAiActor({ userId: "user-attr-roll", role: "hospital_admin" });
    recordAiUsage({ ...baseRow(TEST_CAPS[1]), costMicroUsd: 1000, tokensTotal: 500 });
    recordAiUsage({ ...baseRow(TEST_CAPS[1]), costMicroUsd: 500, tokensTotal: 100 });
    recordAiUsage({ ...baseRow(TEST_CAPS[1]), userId: null, userRole: null, costMicroUsd: 777 }); // system row

    // all three writes must be in the rollup before asserting (poll, don't sleep)
    const s = await waitForLedger(
      () => aiUsageSummary(30),
      (sum) => sum.byUser.some((b) => b.key === "user-attr-roll" && b.calls >= 2),
    );
    const bucket = s.byUser.find((b) => b.key === "user-attr-roll");
    expect(bucket).toBeDefined();
    expect(bucket?.calls).toBe(2);
    expect(bucket?.costMicroUsd).toBe(1500);
    expect(bucket?.tokensTotal).toBe(600);
    expect(bucket?.userRole).toBe("hospital_admin");
    expect(s.unattributedRows).toBeGreaterThanOrEqual(1);
  });
});
