import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { guard, ok, fail, withRoute } from "@/lib/nx/api";

/* Deterministic wearable insights (never diagnostic — flag + explain). */

export const GET = withRoute("wearables.insights", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) return fail("missing_patient", 400, undefined, requestId);
  const device = await db.nxWearableDevice.findFirst({
    where: { hospitalId, patientId, active: true },
  });
  if (!device) return ok({ insights: [], hasData: false }, { requestId });
  const samples = await db.nxWearableSample.findMany({
    where: { deviceId: device.id, capturedAt: { gte: new Date(Date.now() - 14 * 86400_000) } },
    orderBy: { capturedAt: "asc" },
    take: 500,
  });
  const insights: {
    metric: string;
    trend: string;
    latest: number;
    flag: "info" | "watch" | "alert";
    explanation: string;
  }[] = [];
  const trendOf = (
    metric: string,
    latest: number,
    base: number,
    alertBelow?: number,
    alertAbove?: number,
  ) => {
    const delta = latest - base;
    if (alertBelow !== undefined && latest < alertBelow)
      return { trend: `${delta.toFixed(0)} vs 14d baseline`, flag: "alert" as const };
    if (alertAbove !== undefined && latest > alertAbove)
      return {
        trend: `${delta > 0 ? "+" : ""}${delta.toFixed(0)} vs 14d baseline`,
        flag: "alert" as const,
      };
    return {
      trend: `${delta > 0 ? "+" : ""}${delta.toFixed(0)} vs 14d baseline`,
      flag: (Math.abs(delta) > base * 0.12 ? "watch" : "info") as "watch" | "info",
    };
  };
  const byMetric = (m: string) => samples.filter((s) => s.metric === m);
  const latestOf = (m: string) => byMetric(m)[byMetric(m).length - 1]?.value;
  const baseOf = (m: string) =>
    byMetric(m)
      .slice(0, -1)
      .reduce((a, s, _i, arr) => a + s.value / arr.length, 0);

  const hr = latestOf("resting_hr");
  if (hr !== undefined) {
    const t = trendOf("resting_hr", hr, baseOf("resting_hr") || hr, undefined, 100);
    insights.push({
      metric: "resting_hr",
      latest: hr,
      ...t,
      explanation:
        "Sustained resting HR > 100 bpm warrants clinical correlation with vitals chart.",
    });
  }
  const hrv = latestOf("hrv");
  if (hrv !== undefined) {
    const base = baseOf("hrv") || hrv;
    insights.push({
      metric: "hrv",
      latest: hrv,
      trend: `${hrv - base > 0 ? "+" : ""}${(hrv - base).toFixed(0)} vs 14d baseline`,
      flag: hrv < base * 0.7 ? "watch" : "info",
      explanation: "HRV dips can precede illness or reflect poor sleep/recovery.",
    });
  }
  const spo2 = latestOf("spo2");
  if (spo2 !== undefined) {
    insights.push({
      metric: "spo2",
      latest: spo2,
      trend: "latest reading",
      flag: spo2 < 92 ? "alert" : spo2 < 95 ? "watch" : "info",
      explanation: "SpO2 < 92% at rest matches the early-warning threshold on the vitals chart.",
    });
  }
  const sleep = latestOf("sleep_minutes");
  if (sleep !== undefined) {
    insights.push({
      metric: "sleep_minutes",
      latest: sleep,
      trend: "last night",
      flag: sleep < 240 ? "watch" : "info",
      explanation: "Chronic sleep < 4h affects recovery and glycemic control.",
    });
  }
  return ok(
    {
      insights,
      hasData: samples.length > 0,
      device: { source: device.source, model: device.model },
      disclaimer: "Consumer-device signals are contextual only — not diagnostic.",
    },
    { requestId },
  );
});
