/* ============================================================
 * Next.js instrumentation — background job boot
 * 1. PIE 5-minute Patient Graph sync (must never take the
 *    server down).
 * 2. NxJob durable queue worker (backend-core-1): self-healing
 *    queue-scan chain + daily retention purge. Disabled with
 *    NEXURA_JOBS=off.
 * Both boot exactly once per process (Node runtime only).
 * ============================================================ */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { startGraphSyncJob } = await import("@/modules/pi-engine/sync-job");
    startGraphSyncJob();
  } catch (err) {
    console.error("[pie] instrumentation boot failed:", err instanceof Error ? err.message : err);
  }
  try {
    const { startJobWorker } = await import("@/lib/nx/jobs/runner");
    startJobWorker();
  } catch (err) {
    console.error("[nxjobs] instrumentation boot failed:", err instanceof Error ? err.message : err);
  }
}
