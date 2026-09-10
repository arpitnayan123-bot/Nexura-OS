/* ============================================================
 * Next.js instrumentation — PIE background jobs
 * Boots the 5-minute Patient Graph sync exactly once per
 * server process (Node runtime only). Failure-tolerant: PIE
 * must never take the server down.
 * ============================================================ */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { startGraphSyncJob } = await import("@/modules/pi-engine/sync-job");
    startGraphSyncJob();
  } catch (err) {
    console.error("[pie] instrumentation boot failed:", err instanceof Error ? err.message : err);
  }
}
