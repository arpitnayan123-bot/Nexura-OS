import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "child_process";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ipOf, withIdempotency, requireHospitalContext } from "@/lib/nx/api";
import { modelVersion } from "@/lib/nx/ai-governance";
import { activeModelId } from "@/lib/openrouter";
import type { NxSession } from "@/lib/nx/session";

/* ============================================================
   BACKEND HARDENING REGRESSION TESTS (arch-security-1 /
   arch-transactions-1 / arch-ai-1)
   Covers the production-hardening surfaces: spoof-resistant
   rate-limit IP derivation, caller-scoped claim-then-execute
   idempotency, fail-closed hospital context, honest AI model
   versioning, and the demo-seed production guard.
   ============================================================ */

function fakeReq(headers: Record<string, string>, url = "http://localhost:3000/api/test"): NextRequest {
  return new NextRequest(new Request(url, { headers }));
}

afterAll(async () => {
  // Surgical cleanup — only rows this suite created (all keys use the
  // "test-" prefix; production/other-suite keys never match this shape).
  await db.nxIdempotency
    .deleteMany({ where: { key: { contains: ":test-" } } })
    .catch(() => {});
});

describe("ipOf (spoof-resistant client IP)", () => {
  it("takes the RIGHTMOST x-forwarded-for entry (proxy-appended, not client-controlled)", () => {
    const req = fakeReq({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 10.0.0.9" });
    expect(ipOf(req)).toBe("10.0.0.9");
  });

  it("a client cannot rotate fake first-entries to rotate the key", () => {
    const a = ipOf(fakeReq({ "x-forwarded-for": "fake-a, 203.0.113.1" }));
    const b = ipOf(fakeReq({ "x-forwarded-for": "fake-b, 203.0.113.1" }));
    expect(a).toBe(b);
  });

  it("falls back to x-real-ip, then local", () => {
    expect(ipOf(fakeReq({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(ipOf(fakeReq({}))).toBe("local");
  });
});

describe("AI model version honesty", () => {
  it("activeModelId names the real provider path", () => {
    const id = activeModelId();
    expect(id).toContain("z-ai");
    expect(/OpenRouter|z-ai SDK/.test(id)).toBe(true);
  });

  it("modelVersion() respects the explicit env override", () => {
    const prev = process.env.NX_AI_MODEL_VERSION;
    try {
      process.env.NX_AI_MODEL_VERSION = "custom-model-x";
      expect(modelVersion()).toBe("custom-model-x");
      delete process.env.NX_AI_MODEL_VERSION;
      expect(modelVersion()).toBe(activeModelId());
    } finally {
      if (prev === undefined) delete process.env.NX_AI_MODEL_VERSION;
      else process.env.NX_AI_MODEL_VERSION = prev;
    }
  });
});

describe("requireHospitalContext (fail-closed tenant scoping)", () => {
  it("passes the session hospital through untouched", async () => {
    const session = { userId: "u1", role: "doctor", hospitalId: "hosp-1" } as unknown as NxSession;
    const r = await requireHospitalContext(session);
    expect(r).toEqual({ hospitalId: "hosp-1" });
  });

  it("resolves a hospital id for sessions without a claim (documented DEMO_MODE fallback)", async () => {
    const session = { userId: "u2", role: "nurse" } as unknown as NxSession;
    const r = await requireHospitalContext(session);
    if ("hospitalId" in r) {
      const first = await db.hospital.findFirst({ select: { id: true } });
      expect(r.hospitalId).toBe(first?.id);
    } else {
      // In a non-demo environment the helper must fail closed instead.
      expect(r.response.status).toBe(403);
    }
  });
});

describe("withIdempotency claim-then-execute", () => {
  it("replays the stored response for the same key + payload", async () => {
    const req = fakeReq({ "x-idempotency-key": "test-replay-1" });

    let calls = 0;
    const first = await withIdempotency(req, "test", async () => {
      calls += 1;
      return { status: 201, body: { ok: true, n: 1 } };
    }, { callerId: "user-1", ttlHours: 1 });
    const second = await withIdempotency(req, "test", async () => {
      calls += 1;
      return { status: 201, body: { ok: true, n: 2 } };
    }, { callerId: "user-1", ttlHours: 1 });
    expect(calls).toBe(1); // handler executed exactly once
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    const secondBody = await second.json();
    expect(secondBody.ok).toBe(true);
    expect(secondBody.n).toBe(1); // the FIRST execution's payload is replayed
  });

  it("rejects the same key used with a different payload (409)", async () => {
    const req = fakeReq({ "x-idempotency-key": "test-reuse-1" });

    await withIdempotency(req, "test", async () => ({ status: 200, body: { a: 1 } }),
      { callerId: "user-1", bodyForHash: { x: 1 }, ttlHours: 1 });
    const reuse = await withIdempotency(req, "test", async () => ({ status: 200, body: { a: 2 } }),
      { callerId: "user-1", bodyForHash: { x: 2 }, ttlHours: 1 });
    expect(reuse.status).toBe(409);
  });

  it("two CONCURRENT same-key requests execute the handler only once", async () => {
    const req = fakeReq({ "x-idempotency-key": "test-race-1" });

    let executions = 0;
    const call = () =>
      withIdempotency(req, "test", async () => {
        executions += 1;
        await new Promise((r) => setTimeout(r, 50)); // widen the race window
        return { status: 201, body: { winner: true } };
      }, { callerId: "user-1", ttlHours: 1 });
    const [r1, r2] = await Promise.all([call(), call()]);
    expect(executions).toBe(1); // the historical check-then-create double-charged here
    expect([r1.status, r2.status].sort()).toEqual([201, 409].sort()); // one success, one in-progress/refusal
  });

  it("different callers never share an idempotency scope", async () => {
    const reqA = fakeReq({ "x-idempotency-key": "test-scope-1" });
    const reqB = fakeReq({ "x-idempotency-key": "test-scope-1" });

    let calls = 0;
    const fn = () => async () => {
      calls += 1;
      return { status: 200, body: { who: calls } };
    };
    await withIdempotency(reqA, "test", fn(), { callerId: "user-A", ttlHours: 1 });
    const rB = await withIdempotency(reqB, "test", fn(), { callerId: "user-B", ttlHours: 1 });
    expect(calls).toBe(2); // B's identical key did NOT replay A's response
    expect((await rB.json()).who).toBe(2);
  });
});

describe("demo-seed production guard", () => {
  it("refuses to seed demo data under NODE_ENV=production", () => {
    expect(() =>
      execSync("NODE_ENV=production SEED_DEMO_OVERRIDE= bun scripts/seed-nx.ts", {
        cwd: process.cwd(),
        stdio: "pipe",
        timeout: 30_000,
      })
    ).toThrow(/Refusing to seed demo data/);
  });
});

/* Recompute the caller-scoped key exactly as withIdempotency does so the
   cleanup only ever deletes rows this suite created. */
async function scopedKey(_req: NextRequest, key: string): Promise<string> {
  const { createHash } = await import("crypto");
  const callerScope = createHash("sha256").update(`user:user-1`).digest("hex").slice(0, 16);
  return `${callerScope}:${key}`;
}
