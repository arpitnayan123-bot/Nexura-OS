/* ============================================================
   NEXURA HOSPITAL OS — IN-PROCESS METRICS REGISTRY
   Dependency-free operational counters for the /api/metrics
   endpoint (JSON + Prometheus text exposition).

   Design constraints (healthcare platform):
   - No PHI ever flows through here: only route OPERATION names
     (e.g. "patients.list"), HTTP status classes and durations.
   - Bounded cardinality: a runaway route-name explosion (path
     parameters leaking into names, attacker-chosen labels)
     cannot grow the map without limit — past the cap everything
     aggregates into a single overflow bucket.
   - Lock-free: single-node counters are plain maps; the values
     feed ops dashboards, not billing. Cross-instance aggregation
     is a scrape-time concern (one process = one scrape target).
   ============================================================ */

import pkgJson from "../../../package.json";

export interface RouteMetric {
  /** operation name, e.g. "patients.list" (never a raw URL with ids) */
  route: string;
  status: number;
  count: number;
  durationMsTotal: number;
  durationMsMax: number;
  lastAt: string;
}

export interface MetricsSnapshot {
  process: {
    uptimeSec: number;
    rssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
    pid: number;
    nodeVersion: string;
    platform: string;
  };
  build: {
    name: string;
    version: string;
    startedAt: string;
  };
  requests: {
    total: number;
    byStatusClass: Record<string, number>;
    routes: RouteMetric[];
    overflowRoutes: number;
    rateLimited429: number;
    internal500: number;
  };
  cardinality: { maxRoutes: number; trackedRoutes: number };
}

const MAX_TRACKED_ROUTES = 512;

const g = globalThis as unknown as {
  __nexuraMetrics?: {
    routes: Map<string, RouteMetric>;
    byStatusClass: Map<string, number>;
    rateLimited429: number;
    internal500: number;
    overflowRoutes: number;
    startedAt: string;
  };
};

function registry() {
  if (!g.__nexuraMetrics) {
    g.__nexuraMetrics = {
      routes: new Map(),
      byStatusClass: new Map(),
      rateLimited429: 0,
      internal500: 0,
      overflowRoutes: 0,
      startedAt: new Date().toISOString(),
    };
  }
  return g.__nexuraMetrics;
}

export function statusClass(status: number): string {
  if (status >= 500) return "5xx";
  if (status >= 400) return "4xx";
  if (status >= 300) return "3xx";
  if (status >= 200) return "2xx";
  return "1xx";
}

/** Record one completed HTTP request handled by `withRoute`.
 *  Cheap enough to call on every request: two map operations. */
export function recordRequest(route: string, status: number, durationMs: number) {
  const r = registry();
  const key = `${route}|${status}`;
  const existing = r.routes.get(key);
  const now = new Date().toISOString();
  if (existing) {
    existing.count += 1;
    existing.durationMsTotal += durationMs;
    if (durationMs > existing.durationMsMax) existing.durationMsMax = durationMs;
    existing.lastAt = now;
  } else if (r.routes.size < MAX_TRACKED_ROUTES) {
    r.routes.set(key, {
      route,
      status,
      count: 1,
      durationMsTotal: durationMs,
      durationMsMax: durationMs,
      lastAt: now,
    });
  } else {
    // Cardinality cap reached — aggregate so the number is still counted.
    r.overflowRoutes += 1;
  }
  const cls = statusClass(status);
  r.byStatusClass.set(cls, (r.byStatusClass.get(cls) ?? 0) + 1);
  if (status === 429) r.rateLimited429 += 1;
  if (status >= 500) r.internal500 += 1;
}

/** Snapshot for the JSON view of /api/metrics. */
export function snapshot(): MetricsSnapshot {
  const r = registry();
  const mem = process.memoryUsage();
  let version = "unknown";
  try {
    version = pkgJson.version ?? version;
  } catch {
    /* package.json unreadable in some bundle layouts — keep "unknown" */
  }
  const routes = [...r.routes.values()].sort((a, b) => b.count - a.count);
  return {
    process: {
      uptimeSec: Math.round(process.uptime()),
      rssBytes: mem.rss,
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
    },
    build: { name: pkgJson.name ?? "nexura-os", version, startedAt: r.startedAt },
    requests: {
      total: [...r.byStatusClass.values()].reduce((a, b) => a + b, 0),
      byStatusClass: Object.fromEntries([...r.byStatusClass.entries()].sort()),
      routes,
      overflowRoutes: r.overflowRoutes,
      rateLimited429: r.rateLimited429,
      internal500: r.internal500,
    },
    cardinality: { maxRoutes: MAX_TRACKED_ROUTES, trackedRoutes: r.routes.size },
  };
}

/* ---------- Prometheus text exposition (v0.0.4) ---------- */

const PROM_SAFE = /[^\w.:]/g;

function promLabel(v: string): string {
  return v.replace(PROM_SAFE, "_");
}

function promSamples(
  snapshot: MetricsSnapshot,
): Array<{ name: string; help: string; type: string; lines: string[] }> {
  const lines: Array<{ name: string; help: string; type: string; lines: string[] }> = [];
  const p = snapshot.process;

  lines.push({
    name: "nexura_process_uptime_seconds",
    help: "Process uptime in seconds",
    type: "gauge",
    lines: [`nexura_process_uptime_seconds ${p.uptimeSec}`],
  });
  lines.push({
    name: "nexura_process_memory_rss_bytes",
    help: "Resident set size in bytes",
    type: "gauge",
    lines: [`nexura_process_memory_rss_bytes ${p.rssBytes}`],
  });
  lines.push({
    name: "nexura_process_heap_used_bytes",
    help: "V8 heap used in bytes",
    type: "gauge",
    lines: [`nexura_process_heap_used_bytes ${p.heapUsedBytes}`],
  });
  lines.push({
    name: "nexura_build_info",
    help: "Build metadata (version)",
    type: "gauge",
    lines: [`nexura_build_info{version="${promLabel(snapshot.build.version)}"} 1`],
  });
  lines.push({
    name: "nexura_http_requests_total",
    help: "HTTP requests handled, by operation and status",
    type: "counter",
    lines: snapshot.requests.routes.map(
      (m) =>
        `nexura_http_requests_total{route="${promLabel(m.route)}",status="${m.status}",class="${statusClass(m.status)}"} ${m.count}`,
    ),
  });
  lines.push({
    name: "nexura_http_request_duration_ms_sum",
    help: "Cumulative handler duration by operation and status",
    type: "counter",
    lines: snapshot.requests.routes.map(
      (m) =>
        `nexura_http_request_duration_ms_sum{route="${promLabel(m.route)}",status="${m.status}"} ${m.durationMsTotal}`,
    ),
  });
  lines.push({
    name: "nexura_http_requests_by_class_total",
    help: "HTTP requests by status class",
    type: "counter",
    lines: Object.entries(snapshot.requests.byStatusClass).map(
      ([cls, n]) => `nexura_http_requests_by_class_total{class="${cls}"} ${n}`,
    ),
  });
  lines.push({
    name: "nexura_http_rate_limited_total",
    help: "Requests rejected by rate limiting (429)",
    type: "counter",
    lines: [`nexura_http_rate_limited_total ${snapshot.requests.rateLimited429}`],
  });
  lines.push({
    name: "nexura_http_server_errors_total",
    help: "Requests ending in 5xx",
    type: "counter",
    lines: [`nexura_http_server_errors_total ${snapshot.requests.internal500}`],
  });
  return lines;
}

/** Render the snapshot in Prometheus text exposition format v0.0.4. */
export function renderPrometheus(snap: MetricsSnapshot): string {
  const out: string[] = [];
  for (const family of promSamples(snap)) {
    if (family.lines.length === 0) continue;
    out.push(`# HELP ${family.name} ${family.help}`);
    out.push(`# TYPE ${family.name} ${family.type}`);
    out.push(...family.lines);
  }
  out.push("");
  return out.join("\n");
}

/** Test/ops hook — zeroes every counter. Used by unit tests only. */
export function resetMetricsForTests() {
  g.__nexuraMetrics = undefined;
}
