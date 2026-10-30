import { describe, it, expect, beforeEach } from "vitest";
import {
  recordRequest,
  snapshot,
  renderPrometheus,
  statusClass,
  resetMetricsForTests,
} from "@/lib/nx/metrics";

/* Observability — in-process metrics registry + Prometheus rendering. */

describe("statusClass", () => {
  it("maps status codes to classes", () => {
    expect(statusClass(200)).toBe("2xx");
    expect(statusClass(307)).toBe("3xx");
    expect(statusClass(401)).toBe("4xx");
    expect(statusClass(429)).toBe("4xx");
    expect(statusClass(500)).toBe("5xx");
  });
});

describe("recordRequest / snapshot", () => {
  beforeEach(() => resetMetricsForTests());

  it("accumulates count and duration per route+status", () => {
    recordRequest("patients.list", 200, 12);
    recordRequest("patients.list", 200, 30);
    recordRequest("patients.list", 404, 5);

    const snap = snapshot();
    const ok = snap.requests.routes.find((m) => m.route === "patients.list" && m.status === 200);
    const nf = snap.requests.routes.find((m) => m.route === "patients.list" && m.status === 404);
    expect(ok?.count).toBe(2);
    expect(ok?.durationMsTotal).toBe(42);
    expect(ok?.durationMsMax).toBe(30);
    expect(nf?.count).toBe(1);
    expect(snap.requests.total).toBe(3);
    expect(snap.requests.byStatusClass["2xx"]).toBe(2);
    expect(snap.requests.byStatusClass["4xx"]).toBe(1);
  });

  it("tracks 429 and 5xx counters separately", () => {
    recordRequest("auth.login", 429, 3);
    recordRequest("patients.list", 500, 9);
    const snap = snapshot();
    expect(snap.requests.rateLimited429).toBe(1);
    expect(snap.requests.internal500).toBe(1);
  });

  it("bounds cardinality with an overflow bucket", () => {
    for (let i = 0; i < 600; i++) {
      recordRequest(`overflow.route.${i}`, 200, 1);
    }
    const snap = snapshot();
    expect(snap.cardinality.trackedRoutes).toBe(snap.cardinality.maxRoutes);
    expect(snap.requests.overflowRoutes).toBe(600 - snap.cardinality.maxRoutes);
    expect(snap.requests.total).toBe(600); // nothing lost, just aggregated
  });

  it("survives status 0 / weird inputs without throwing", () => {
    expect(() => recordRequest("weird", 0, -5)).not.toThrow();
  });
});

describe("renderPrometheus", () => {
  beforeEach(() => resetMetricsForTests());

  it("emits HELP/TYPE headers and samples", () => {
    recordRequest("patients.list", 200, 10);
    const text = renderPrometheus(snapshot());
    expect(text).toContain("# HELP nexura_http_requests_total");
    expect(text).toContain("# TYPE nexura_http_requests_total counter");
    expect(text).toContain(
      'nexura_http_requests_total{route="patients.list",status="200",class="2xx"} 1',
    );
    expect(text).toContain("nexura_process_uptime_seconds ");
    expect(text).toContain("nexura_build_info{version=");
  });

  it("sanitizes unsafe label characters", () => {
    recordRequest("route with spaces/and-slashes", 200, 1);
    const text = renderPrometheus(snapshot());
    expect(text).toContain('route="route_with_spaces_and_slashes"');
    expect(text).not.toContain('route="route with spaces');
  });

  it("produces parseable key=value lines (no empty names)", () => {
    recordRequest("a.b", 200, 1);
    const text = renderPrometheus(snapshot());
    for (const line of text.split("\n")) {
      if (!line || line.startsWith("#")) continue;
      expect(line).toMatch(/^nexura_[a-z_]+(\{[^}]*\})? \d+(\.\d+)?$/);
    }
  });
});
