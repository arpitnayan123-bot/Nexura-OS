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

  it("delivers user-targeted events only to that user", () => {
    const mine: NxEvent[] = [];
    const others: NxEvent[] = [];
    const u1 = subscribe("t4", { userId: "me", role: "nurse", hospitalId: "h1", roleKeys: ["nurse"] }, (e) => mine.push(e));
    const u2 = subscribe("t5", { userId: "other", role: "nurse", hospitalId: "h1", roleKeys: ["nurse"] }, (e) => others.push(e));
    publish({ event: "dm", hospitalId: "h1", toUsers: ["me"], data: { secret: true } });
    expect(mine.length).toBe(1);
    expect(others.length).toBe(0);
    u1();
    u2();
  });

  it("legacy roleKeys receive legacy-targeted events", () => {
    const got: NxEvent[] = [];
    const u1 = subscribe("t6", { userId: "u6", role: "command", hospitalId: "h1", roleKeys: ["command"] }, (e) => got.push(e));
    publish({ event: "cmd", hospitalId: "h1", toRoles: ["command"], data: {} });
    expect(got.length).toBe(1);
    u1();
  });

  it("stamps events with monotonic seq + timestamp", () => {
    const got: NxEvent[] = [];
    const u1 = subscribe("t7", { userId: "u7", role: "admin", hospitalId: "h1", roleKeys: ["admin"] }, (e) => got.push(e));
    publish({ event: "a", hospitalId: "h1", data: {} });
    publish({ event: "b", hospitalId: "h1", data: {} });
    expect(got[0].seq! < got[1].seq!).toBe(true);
    expect(new Date(got[0].at!).getTime()).toBeLessThanOrEqual(Date.now());
    u1();
  });
});
