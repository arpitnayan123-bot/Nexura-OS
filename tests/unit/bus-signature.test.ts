import { describe, it, expect, afterAll } from "vitest";
import { publish, verifyEventSignature, signingKeyFor, subscribe, connectionCount } from "@/lib/nx/bus";
import { isRedisConfigured } from "@/lib/redis";

/* ============================================================
   EVENT BUS — signature integrity + relay tagging (stateless-1)
   The SSE stream drops unsigned/mismatched frames in the UI, so a
   forged "lab.critical" toast must fail verification. Redis-relayed
   frames are re-verified server-side by the same function.
   (Local delivery/ordering/connection-cap behavior is covered by
   bus.test.ts.)
   ============================================================ */

const unsubscribers: Array<() => void> = [];

afterAll(async () => {
  for (const un of unsubscribers) un();
  if (isRedisConfigured()) {
    const { redisClose } = await import("@/lib/redis");
    await redisClose().catch(() => {});
  }
});

const SCOPE = {
  userId: "sig-test-user",
  role: "admin",
  hospitalId: "sig-test-hospital",
  roleKeys: ["admin"],
};

describe("event signatures", () => {
  it("publish() signs events with the per-hospital key and tags the instance", () => {
    const ev = publish({ event: "sig.test", hospitalId: SCOPE.hospitalId, data: { n: 1 } });
    expect(ev.seq).toBeDefined();
    expect(ev.sig).toBeTruthy();
    expect(ev.from).toBeTruthy(); // relay dedupe tag
    expect(verifyEventSignature(ev)).toBe(true);
  });

  it("verifies across a simulated second instance (relayed frame)", () => {
    const ev = publish({ event: "sig.relay", hospitalId: SCOPE.hospitalId, data: { ok: true } });
    // Another process receives the JSON and re-verifies with the same
    // JWT_SECRET-derived key — must still hold.
    const roundTripped = JSON.parse(JSON.stringify(ev));
    expect(verifyEventSignature(roundTripped)).toBe(true);
  });

  it("rejects tampered payloads, wrong seq, and missing signatures", () => {
    const ev = publish({ event: "sig.tamper", hospitalId: SCOPE.hospitalId, data: { amount: 1 } });
    expect(verifyEventSignature({ ...ev, data: { amount: 1_000_000 } })).toBe(false);
    expect(verifyEventSignature({ ...ev, seq: (ev.seq ?? 0) + 1 })).toBe(false);
    const { sig, ...unsigned } = ev;
    expect(verifyEventSignature(unsigned)).toBe(false);
  });

  it("signing keys differ per hospital and are deterministic", () => {
    const a1 = signingKeyFor("hospital-a");
    const a2 = signingKeyFor("hospital-a");
    const b = signingKeyFor("hospital-b");
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
  });

  it("local delivery still honors tenant + audience isolation while Redis is configured", () => {
    const seen: string[] = [];
    unsubscribers.push(subscribe("sig-conn-1", { ...SCOPE, userId: "u1" }, (ev) => seen.push(ev.event)));
    unsubscribers.push(
      subscribe(
        "sig-conn-2",
        { ...SCOPE, userId: "u2", hospitalId: "other-hospital" },
        (ev) => seen.push(ev.event)
      )
    );
    publish({ event: "sig.isolated", hospitalId: SCOPE.hospitalId, data: null });
    expect(seen).toEqual(["sig.isolated"]); // other-hospital subscriber saw nothing
    expect(connectionCount()).toBeGreaterThanOrEqual(2);
  });
});
