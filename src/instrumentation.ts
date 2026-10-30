/* ============================================================
 * Next.js instrumentation — boot gate + background job boot
 * -1. Serverless zero-config demo DB (vercel-deploy-3): on Vercel
 *     with no DATABASE_URL, attach the bundled seeded SQLite demo
 *     database BEFORE the boot gate evaluates env. Must run first.
 * 0. assertProductionEnv(): fail LOUDLY at server start when a
 *    required production variable is missing (env-config-1) —
 *    never runs during `next build`, only on server boot.
 * 1. PIE 5-minute Patient Graph sync (must never take the
 *    server down).
 * 2. NxJob durable queue worker (backend-core-1): self-healing
 *    queue-scan chain + daily retention purge. Disabled with
 *    NEXURA_JOBS=off.
 * All boot exactly once per process (Node runtime only).
 * ============================================================ */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { ensureServerlessDemoDatabase } = await import("@/lib/demo-db");
    ensureServerlessDemoDatabase();
  } catch (err) {
    // Never let demo-DB bootstrap take the server down: worst case the
    // boot gate reports the missing env and routes degrade gracefully.
    console.error("[demo-db] serverless demo database bootstrap failed:", err instanceof Error ? err.message : err);
  }
  try {
    const { assertProductionEnv } = await import("@/lib/env");
    assertProductionEnv();
  } catch (err) {
    // Re-throw to abort the boot: a production server without its
    // required configuration must not come up half-configured.
    console.error("[env] production boot gate FAILED:", err instanceof Error ? err.message : err);
    throw err;
  }
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
    console.error(
      "[nxjobs] instrumentation boot failed:",
      err instanceof Error ? err.message : err,
    );
  }
}
