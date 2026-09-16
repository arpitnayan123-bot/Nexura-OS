import { NextResponse } from "next/server";
import { withRoute } from "@/lib/nx/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simulated live health metrics — in production these would come from
// wearable device streams / time-series DB.
export const GET = withRoute("health-stats.metrics", async () => {
  const now = Date.now();
  const seed = Math.floor(now / 1000);

  const rand = (min: number, max: number, salt = 0) =>
    min + ((Math.sin(seed + salt) + 1) / 2) * (max - min);

  const series = Array.from({ length: 14 }).map((_, i) => {
    const base = 64 + Math.sin((i + (seed % 7)) / 1.7) * 9;
    const jitter = (Math.sin(seed * 0.3 + i) + 1) * 3;
    return {
      t: `${i * 2}:00`,
      v: Math.round(base + jitter),
    };
  });

  return NextResponse.json({
    heart: Math.round(rand(64, 82, 1)),
    steps: Math.round(rand(7200, 11200, 2)),
    sleep: +(rand(6.8, 8.2, 3)).toFixed(1),
    water: +(rand(1.4, 2.4, 4)).toFixed(1),
    calories: Math.round(rand(1650, 2080, 5)),
    mood: Math.round(rand(78, 92, 6)),
    spo2: Math.round(rand(96, 99, 7)),
    stress: Math.round(rand(14, 34, 8)),
    series,
    ts: now,
  });
});
