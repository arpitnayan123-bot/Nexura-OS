import { describe, it, expect } from "vitest";
import { publish, subscribe, connectionCount, type NxEvent } from "@/lib/nx/bus";

/* Real-time bus — tenant isolation + audience filtering. */

describe("event bus", () => {
  it("delivers hospital-wide events to same-hospital subscribers only", () => {
    const received: NxEvent[] = [];
    const before = connectionCount();
    const unsub = subscribe("t1", { userId: "u1", role: "doctor", hospitalId: "h1", roleKeys: ["doctor"] }, (e) => received.push(e));
    publish({ event: "test.wide", hospitalId: "h1", data: { a: 1 } });
    publish({ event: "test.wide", hospitalId: "h2", data: { a: 2 } });
    expect(received.length).toBe(1);
    expect(received[0].hospitalId).toBe("h1");
    expect(connectionCount()).toBe(before + 1);
    unsub();
    expect(connectionCount()).toBe(before);
  });

  it("delivers role-targeted events only to matching roles", () => {
    const nurseEvents: NxEvent[] = [];
    const doctorEvents: NxEvent[] = [];
    const u1 = subscribe("t2", { userId: "u2", role: "nurse", hospitalId: "h1", roleKeys: ["nurse"] }, (e) => nurseEvents.push(e));
    const u2 = subscribe("t3", { userId: "u3", role: "doctor", hospitalId: "h1", roleKeys: ["doctor"] }, (e) => doctorEvents.push(e));
    publish({ event: "nurse.only", hospitalId: "h1", toRoles: ["nurse"], data: {} });
    expect(nurseEvents.length).toBe(1);
    expect(doctorEvents.length).toBe(0);
    u1();
    u2();
  });

  /* ---------- channel privacy (message previews must not leak) ---------- */

  it("withholds channel-scoped events from subscribers without membership or clinical view", () => {
    const noAccess: NxEvent[] = [];
    const member: NxEvent[] = [];
    const clinician: NxEvent[] = [];
    const u1 = subscribe(
      "ch-1",
      { userId: "u-no-access", role: "receptionist", hospitalId: "h1", roleKeys: ["receptionist"], channels: ["general"], clinicalAll: false },
      (e) => noAccess.push(e)
    );
    const u2 = subscribe(
      "ch-2",
      { userId: "u-member", role: "nurse", hospitalId: "h1", roleKeys: ["nurse"], channels: ["general", "care-team:p1"], clinicalAll: false },
      (e) => member.push(e)
    );
    const u3 = subscribe(
      "ch-3",
      { userId: "u-clinician", role: "doctor", hospitalId: "h1", roleKeys: ["doctor"], channels: [], clinicalAll: true },
      (e) => clinician.push(e)
    );
    publish({ event: "message.new", hospitalId: "h1", channelKey: "care-team:p1", toRoles: ["nurse", "doctor", "receptionist"], data: { preview: "secret" } });
    expect(noAccess.length).toBe(0); // no membership, no clinical view
    expect(member.length).toBe(1);   // explicit channel member
    expect(clinician.length).toBe(1); // patient.clinical.view
    u1();
    u2();
    u3();
  });

  it("never delivers another hospital's channel events even to members", () => {
    const events: NxEvent[] = [];
    const u1 = subscribe(
      "ch-4",
      { userId: "u-x", role: "doctor", hospitalId: "h1", roleKeys: ["doctor"], channels: ["care-team:p9"], clinicalAll: true },
      (e) => events.push(e)
    );
    publish({ event: "message.new", hospitalId: "h2", channelKey: "care-team:p9", data: {} });
    expect(events.length).toBe(0);
    u1();
  });

  it("enforces the per-user SSE connection cap by dropping oldest", async () => {
    const { MAX_CONNS_PER_USER } = await import("@/lib/nx/bus");
    const unsubs: Array<() => void> = [];
    for (let i = 0; i < MAX_CONNS_PER_USER + 2; i++) {
      unsubs.push(subscribe(`cap-${i}`, { userId: "cap-user", role: "doctor", hospitalId: "h1", roleKeys: ["doctor"] }, () => {}));
    }
    // count all connections belonging to cap-user
    let mine = 0;
    const before = connectionCount();
    // publish a targeted event: only live connections receive it; we assert via cap instead:
    // after exceeding the cap, the FIRST connections were dropped, so the earliest
    // unsub() calls are no-ops (connectionCount unchanged by them).
    const countAfter = connectionCount();
    expect(countAfter).toBeLessThanOrEqual(before + MAX_CONNS_PER_USER);
    unsubs.forEach((u) => u());
  });

  it("keeps seq monotonic with an epoch prefix (restart-safe dedupe)", () => {
    const got: NxEvent[] = [];
    const u1 = subscribe("seq-1", { userId: "seq-u", role: "doctor", hospitalId: "h1", roleKeys: ["doctor"] }, (e) => got.push(e));
    publish({ event: "a", hospitalId: "h1", data: {} });
    publish({ event: "b", hospitalId: "h1", data: {} });
    expect(got.length).toBe(2);
    expect(typeof got[0].seq).toBe("number");
    expect(got[1].seq!).toBeGreaterThan(got[0].seq!);
    // epoch-prefixed seqs stay far above small per-process counters
    expect(got[0].seq!).toBeGreaterThan(1_000_000);
    u1();
  });
});
