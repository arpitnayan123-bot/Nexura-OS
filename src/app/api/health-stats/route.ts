import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";
import { withRoute } from "@/lib/nx/api";
import {
  buildHourlySeries,
  deriveCalories,
  deriveMood,
  deriveStressFromHrv,
  deriveStressFromRestingHr,
  DEMO_PAYLOAD,
} from "@/lib/site/health-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ============================================================
   NEXURA SITE — HEALTH STATS (backend-core-2)
   Was: a synthetic sine-function generator (comment admitted it).
   Now: REAL aggregates from NxWearableSample (last 24h) with
   HospitalVital as clinical fallback — measured where a device
   recorded it, derived where a fixed formula applies (calories/
   stress/mood), null where no honest source exists (hydration),
   and a deterministic labelled demo payload when the DB is empty.

   The homepage widget polls this every 5s — a 15s in-process
   cache keeps DB load flat under concurrent visitors.
   ============================================================ */

const WINDOW_MS = 24 * 3600_000;
const CACHE_TTL_MS = 15_000;

let cache: { at: number; payload: Record<string, unknown> } | null = null;

async function aggregate(): Promise<Record<string, unknown>> {
  const now = new Date();
  const since = new Date(now.getTime() - WINDOW_MS);

  // one grouped query per metric family — Postgres does the math
  const [wearable, vitals, hrSamples] = await Promise.all([
    db.nxWearableSample.groupBy({
      by: ["metric"],
      where: { capturedAt: { gte: since } },
      _avg: { value: true },
      _sum: { value: true },
      _count: { _all: true },
    }),
    db.hospitalVital.aggregate({
      where: { recordedAt: { gte: since } },
      _avg: { pulseRate: true, spo2: true },
      _count: { _all: true },
    }),
    db.nxWearableSample.findMany({
      where: { metric: "resting_hr", capturedAt: { gte: new Date(now.getTime() - 14 * 3600_000) } },
      select: { capturedAt: true, value: true },
      orderBy: { capturedAt: "asc" },
    }),
  ]);

  const w = new Map(wearable.map((r) => [r.metric, r]));
  const avg = (m: string) => w.get(m)?._avg.value ?? null;
  const sum = (m: string) => w.get(m)?._sum.value ?? null;
  const count = (m: string) => w.get(m)?._count._all ?? 0;

  const restingHr = avg("resting_hr");
  const spo2Wearable = avg("spo2");
  const hrv = avg("hrv");
  const steps = sum("steps");
  const sleepMin = avg("sleep_minutes");

  // HospitalVital fallbacks — clinical nurse-recorded numbers stand in
  // when no wearable captured that metric in the window
  const heart = restingHr ?? vitals._avg.pulseRate ?? null;
  const spo2 = spo2Wearable ?? (vitals._avg.spo2 ? Math.round(vitals._avg.spo2) : null);

  const stress =
    hrv != null
      ? deriveStressFromHrv(hrv)
      : heart != null
        ? deriveStressFromRestingHr(heart)
        : null;

  const series = hrSamples.length > 0 ? buildHourlySeries(hrSamples, 14, now) : [];

  const measuredSources = [
    count("resting_hr") > 0 || vitals._count._all > 0 ? "resting_hr" : null,
    count("spo2") > 0 || vitals._avg.spo2 != null ? "spo2" : null,
    count("steps") > 0 ? "steps" : null,
    count("sleep_minutes") > 0 ? "sleep_minutes" : null,
    count("hrv") > 0 ? "hrv" : null,
  ].filter(Boolean);

  const hasAnyData =
    measuredSources.length > 0 &&
    (heart != null || spo2 != null || steps != null || sleepMin != null || series.length > 0);

  if (!hasAnyData) {
    // empty DB → deterministic demo payload, honestly labelled
    return { ...DEMO_PAYLOAD, source: "demo", generatedAt: now.toISOString(), n: {} };
  }

  return {
    heart: heart != null ? Math.round(heart) : null,
    steps: steps != null ? Math.round(steps) : null,
    sleep: sleepMin != null ? +(sleepMin / 60).toFixed(1) : null,
    water: null, // no honest data source — never invented
    calories: steps != null ? deriveCalories(steps) : null,
    mood: stress != null ? deriveMood(stress) : null,
    spo2,
    stress,
    series: series.length > 0 ? series : DEMO_PAYLOAD.series,
    source: "db",
    derived: ["calories", "stress", "mood"], // fixed-formula estimates, not measurements
    measured: measuredSources,
    generatedAt: now.toISOString(),
    n: {
      wearableSamples: wearable.reduce((a, r) => a + r._count._all, 0),
      vitalReadings: vitals._count._all,
    },
  };
}

export const GET = withRoute("health-stats.metrics", async () => {
  try {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return NextResponse.json(cache.payload);
    }
    const payload = await aggregate();
    cache = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (e) {
    // marketing surface — degrade to the labelled demo payload, never 500 the homepage
    log.warn("site", "health_stats_degraded", { err: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ ...DEMO_PAYLOAD, source: "demo", degraded: true });
  }
});
