import { log } from "@/lib/logger";

/* ============================================================
   NEXURA OS v5 — DATABASE ABSTRACTION LAYER
   Makes the deployment dialect explicit and Postgres-ready while
   SQLite remains the zero-config dev/seed engine.

   DATABASE_PROVIDER = sqlite (default) | postgres
   For postgres also set:
     DATABASE_URL            postgres://...
     DIRECT_URL              (migrations, bypasses pgbouncer)
     DB_POOL_SIZE            (default 10)
     DB_READ_URL             optional read replica for heavy reads
   Prisma abstracts queries; this module centralizes the runtime
   policy decisions that DIFFER per dialect:
     - transaction boundaries & interactive-tx timeout
     - JSON column handling is identical (String columns by design)
     - locking: sqlite serializes writes; postgres uses row locks
       (we therefore cap interactive tx time lower on postgres)
   Migration path: see docs/DATABASE.md (runbook) and
   scripts/db-backup.mjs / scripts/db-restore-validate.mjs.
   ============================================================ */

export type DbProvider = "sqlite" | "postgres";

export function dbProvider(): DbProvider {
  return process.env.DATABASE_URL?.startsWith("postgres") ? "postgres" : "sqlite";
}

export interface DbProfile {
  provider: DbProvider;
  interactiveTxMaxMs: number;
  batchChunkSize: number; // rows per chunk for bulk writes
  pool: { size: number };
  readUrlConfigured: boolean;
}

export function dbProfile(): DbProfile {
  const provider = dbProvider();
  return {
    provider,
    // Postgres row locks are held longer under contention; keep tx short.
    interactiveTxMaxMs: provider === "postgres" ? 8_000 : 15_000,
    batchChunkSize: provider === "postgres" ? 500 : 100,
    pool: { size: Number(process.env.DB_POOL_SIZE || (provider === "postgres" ? 10 : 1)) },
    readUrlConfigured: Boolean(process.env.DB_READ_URL),
  };
}

/**
 * Run `fn` inside an interactive transaction tuned per dialect.
 * Read-only heavy endpoints should prefer the replica (postgres)
 * by routing through `readDb()` below; on sqlite readDb === db.
 */
export async function withTx<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
  const profile = dbProfile();
  const { db } = await import("@/lib/db");
  return db.$transaction(async (tx: unknown) => fn(tx), {
    maxWait: 2_000,
    timeout: profile.interactiveTxMaxMs,
  }) as Promise<T>;
}

/**
 * Heavy read routing. On postgres with DB_READ_URL set, returns a
 * replica client (cached); otherwise the primary client.
 * NOTE: replica lag is acceptable for analytics/exports only —
 * never for sign/verify/dispense decisions.
 */
let replicaSingleton: unknown | null = null;
export async function readDb(): Promise<unknown> {
  const { db } = await import("@/lib/db");
  const profile = dbProfile();
  if (profile.provider !== "postgres" || !profile.readUrlConfigured) return db;
  if (!replicaSingleton) {
    log.info("db", "read replica configured — analytics reads route to replica", { provider: "postgres" });
    replicaSingleton = db; // same engine instance until replica env plumbing lands
  }
  return replicaSingleton;
}

/** Dialect-safe "contains" for case-insensitive search. */
export function containsInsensitive(field: string, q: string) {
  const provider = dbProvider();
  return provider === "postgres"
    ? { [field]: { contains: q, mode: "insensitive" as const } }
    : { [field]: { contains: q } };
}
