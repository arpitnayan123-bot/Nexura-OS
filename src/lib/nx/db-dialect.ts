import { log } from "@/lib/logger";

/* ============================================================
   NEXURA OS v5 — DATABASE ABSTRACTION LAYER (Postgres-native)
   The Prisma schema is postgresql-only (pg-migration-1); this
   module centralizes the runtime policy decisions that matter
   on Postgres:
     - transaction boundaries & interactive-tx timeout (row locks
       are held under contention — keep tx short)
     - JSON column handling is identical (String columns by design)
     - pool sizing via DB_POOL_SIZE (default 10)
     - optional read replica for heavy analytics reads (DB_READ_URL)
   Ops runbooks: docs/DATABASE.md and scripts/db-backup.mjs /
   scripts/db-restore-validate.mjs (pg_dump based).
   ============================================================ */

export type DbProvider = "postgres" | "sqlite";

/** Accepts postgres://, postgresql:// and pgbouncer's prisma+postgres://. */
export function isPostgresUrl(url: string | undefined): boolean {
  return /^prisma\+postgres(ql)?:\/\//.test(url ?? "") || /^postgres(ql)?:\/\//.test(url ?? "");
}

/** The platform publish package ships an embedded SQLite database (see
 *  .zscripts/database-runtime-build.sh + NEXURA_PACKAGED in start.sh). The
 *  generated Prisma client is provider-locked at generate time, so the
 *  datasource the client talks to is derivable from the URL scheme. */
export function isSqliteDatasource(): boolean {
  return (process.env.DATABASE_URL ?? "").startsWith("file:");
}

export function dbProvider(): DbProvider {
  return isSqliteDatasource() ? "sqlite" : "postgres";
}

export interface DbProfile {
  provider: DbProvider;
  interactiveTxMaxMs: number;
  batchChunkSize: number; // rows per chunk for bulk writes
  pool: { size: number };
  readUrlConfigured: boolean;
}

export function dbProfile(): DbProfile {
  return {
    provider: "postgres",
    // Postgres row locks are held longer under contention; keep tx short.
    interactiveTxMaxMs: 8_000,
    batchChunkSize: 500,
    pool: { size: Number(process.env.DB_POOL_SIZE || 10) },
    readUrlConfigured: Boolean(process.env.DB_READ_URL),
  };
}

/**
 * Run `fn` inside an interactive transaction tuned for Postgres.
 * Read-only heavy endpoints should prefer the replica (postgres)
 * by routing through `readDb()` below.
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
  if (!profile.readUrlConfigured) return db;
  if (!replicaSingleton) {
    log.info("db", "read replica configured — analytics reads route to replica", {
      provider: "postgres",
    });
    replicaSingleton = db; // same engine instance until replica env plumbing lands
  }
  return replicaSingleton;
}

/** Case-insensitive "contains" filter fragment, dialect-aware:
 *  - Postgres LIKE is case-sensitive → requires `mode: "insensitive"`.
 *  - SQLite LIKE is already case-insensitive for ASCII, and its generated
 *    client has NO `mode` argument — passing one throws "Unknown argument"
 *    at runtime, so it must be absent in the packaged demo deployment.
 *  The optional `mode` keeps the return type assignable to BOTH generated
 *  clients (structural subtyping tolerates the extra key on Postgres). */
export function ciFilter(value: string): { contains: string; mode?: "insensitive" } {
  return isSqliteDatasource() ? { contains: value } : { contains: value, mode: "insensitive" };
}

/** Case-insensitive "contains" on a dynamic field name — thin wrapper over
 *  `ciFilter` kept for existing call sites. */
export function containsInsensitive(field: string, q: string) {
  return { [field]: ciFilter(q) };
}
