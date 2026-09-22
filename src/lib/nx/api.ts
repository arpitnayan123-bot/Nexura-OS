import { NextRequest, NextResponse } from "next/server";
import { z, ZodSchema } from "zod";
import { db } from "@/lib/db";
import { createHash, randomUUID } from "crypto";
import { log } from "@/lib/logger";
import { isDemoMode } from "@/lib/env";
import type { EffectivePermissions, NxPermission, NxSession } from "./session";
import { requirePermission } from "./session";
import { isRedisConfigured } from "@/lib/redis";
import { consumeRateLimit } from "@/lib/rate-limit";
import { setAiActor } from "@/lib/ai-actor";

/* ============================================================
   NEXURA HOSPITAL OS — API FOUNDATIONS
   Consistent envelopes, validation, pagination, rate limiting,
   idempotency, correlation IDs, structured logging.
   ============================================================ */

export interface ApiMeta {
  requestId: string;
  [k: string]: unknown;
}

export function newRequestId(): string {
  return `req_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

export function ok<T>(
  data: T,
  opts?: { requestId?: string; headers?: Record<string, string>; status?: number },
) {
  return NextResponse.json(
    { data, meta: { requestId: opts?.requestId } },
    { status: opts?.status ?? 200, headers: opts?.headers },
  );
}

export function fail(
  code: string,
  status: number,
  detail?: string,
  requestId?: string,
  headers?: Record<string, string>,
) {
  return NextResponse.json({ error: code, detail, meta: { requestId } }, { status, headers });
}

/** Wrap a route handler: correlation ID, structured logs, uniform 500s, rate limits.
 *  A modest default rate limit applies to every wrapped route (per IP + route);
 *  pass `{ rateLimit }` to tighten it for expensive/sensitive handlers.
 *
 *  Limiting is two-layered: the in-process Map is a cheap per-instance
 *  pre-filter (absorbs bursts, keeps obvious rejects off Redis); when
 *  REDIS_URL is configured the authoritative budget is consumed from the
 *  distributed limiter so horizontally scaled instances share one budget
 *  per IP+route. Without Redis the Map alone is the limit, exactly as
 *  documented for single-node deployments. */
export const DEFAULT_ROUTE_RATE_LIMIT = { max: 300, windowMs: 60_000 } as const;
/** Generic over route params so dynamic segments (e.g. [patientId])
 *  flow through; existing handlers that ignore params are unaffected. */
export function withRoute<P = Record<string, string>>(
  name: string,
  handler: (
    req: NextRequest,
    ctx: { requestId: string; params: Promise<P> },
  ) => Promise<NextResponse>,
  opts?: { rateLimit?: { max: number; windowMs: number } },
) {
  return async (req: NextRequest, routeCtx?: { params?: Promise<P> }) => {
    const requestId = req.headers.get("x-request-id") || newRequestId();
    const started = Date.now();
    try {
      const limit = opts?.rateLimit ?? DEFAULT_ROUTE_RATE_LIMIT;
      const ip = ipOf(req);
      {
        // ipOf() takes the RIGHTMOST X-Forwarded-For entry — the only one a
        // client cannot spoof behind our single trusted proxy. Keying on the
        // first entry let attackers rotate fake IPs to bypass every limit.
        const rl = rateLimit(`${name}:${ip}`, limit.max, limit.windowMs);
        if (!rl.allowed) {
          return fail("rate_limited", 429, "Too many requests — slow down.", requestId, {
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          });
        }
      }
      if (isRedisConfigured()) {
        // Authoritative shared budget (same max/window) — `route:` namespace
        // keeps these keys disjoint from auth/webhook limiter keys in Redis.
        let drl: Awaited<ReturnType<typeof consumeRateLimit>>;
        try {
          drl = await consumeRateLimit(`route:${name}:${ip}`, limit.max, limit.windowMs);
        } catch (err) {
          // Redis configured but unreachable: fail CLOSED with a clean 503 —
          // the policy rate-limit.ts documents. A thrown limiter error must
          // not fall through to the 500 catch below; that masked a dead Redis
          // as "internal error" on EVERY route (observed on a deploy where
          // the platform injected an unreachable REDIS_URL).
          log.error("api", `${name}:rate-limit`, {
            requestId,
            err: err instanceof Error ? err.message : String(err),
          });
          return fail("rate_limited", 503, "Rate limiter unavailable — retry shortly.", requestId, {
            "Retry-After": "5",
          });
        }
        if (!drl.allowed) {
          return fail("rate_limited", 429, "Too many requests — slow down.", requestId, {
            "Retry-After": String(Math.ceil((drl.resetAt - Date.now()) / 1000)),
          });
        }
      }
      const res = await handler(req, {
        requestId,
        params: (routeCtx?.params ?? Promise.resolve({})) as Promise<P>,
      });
      res.headers.set("x-request-id", requestId);
      log.info("api", name, { requestId, ms: Date.now() - started, status: res.status });
      return res;
    } catch (err) {
      log.error("api", name, { requestId, err: err instanceof Error ? err.message : String(err) });
      // Never leak stack traces or internal errors to clients
      return fail(
        "internal",
        500,
        "Something went wrong. The incident has been logged.",
        requestId,
      );
    }
  };
}

/**
 * Resolve the hospital context for a staff session — WITHOUT the historical
 * `session.hospitalId || db.hospital.findFirst()` fallback, which silently
 * granted the first hospital in the database to any session missing its
 * hospital claim (cross-tenant read/write on multi-hospital data).
 *
 * Production fails closed (403); DEMO_MODE keeps the documented single-hospital
 * fallback so synthetic/demo logins keep working. Every hospital-scoped route
 * resolves its hospitalId through this helper — no exceptions.
 */
export async function requireHospitalContext(
  session: NxSession,
): Promise<{ hospitalId: string } | { response: NextResponse }> {
  if (session.hospitalId) return { hospitalId: session.hospitalId };
  // The historical `db.hospital.findFirst()` fallback in DEMO_MODE was a major
  // tenant-isolation vulnerability, allowing synthetic/un-scoped sessions to
  // arbitrarily bind to the first hospital in the database. It has been removed.
  // All demo seeds must now explicitly scope sessions to the correct hospital ID.
  return {
    response: fail(
      "no_hospital_context",
      403,
      "Session has no hospital context — re-authenticate to continue.",
    ),
  };
}

/** Auth + permission guard returning either the session or a ready error response. */
export async function guard(
  req: NextRequest,
  permission: NxPermission,
  ctx?: { departmentId?: string | null; patientId?: string | null },
): Promise<
  | { session: NxSession; perms: EffectivePermissions; requestId: string }
  | { response: NextResponse }
> {
  const requestId = req.headers.get("x-request-id") || newRequestId();
  const result = await requirePermission(req, permission, ctx);
  if ("error" in result) {
    return {
      response: fail(result.error, result.status, result.detail, requestId),
    };
  }
  // Attribute every AI call this request makes to the verified staff
  // identity (AiUsageLog per-request attribution — ai-actor context).
  setAiActor({ userId: result.session.userId, role: result.session.role });
  return { session: result.session, perms: result.perms, requestId };
}

/** Parse + validate JSON body with a zod schema. Returns 400-ready error on failure. */
export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<{ data: T } | { response: NextResponse; requestId: string }> {
  const requestId = req.headers.get("x-request-id") || newRequestId();
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      response: fail("invalid_json", 400, "Request body must be valid JSON.", requestId),
      requestId,
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => ({ path: i.path.join("."), message: i.message }))
      .slice(0, 8);
    return {
      response: fail(
        "invalid_request",
        400,
        issues.map((i) => `${i.path}: ${i.message}`).join("; "),
        requestId,
      ),
      requestId,
    };
  }
  return { data: parsed.data };
}

export interface PageParams {
  page: number;
  perPage: number;
  skip: number;
  take: number;
  sort?: string;
  order: "asc" | "desc";
  q?: string;
}

const DEFAULT_MAX_PER_PAGE = 100;
const DEFAULT_PER_PAGE = 25;

export function paginate(
  req: NextRequest,
  defaults?: { perPage?: number; maxPerPage?: number },
): PageParams {
  const sp = req.nextUrl.searchParams;
  const maxPerPage = defaults?.maxPerPage ?? DEFAULT_MAX_PER_PAGE;
  const page = Math.max(1, Number(sp.get("page") || 1) || 1);
  const perPageRaw = Number(sp.get("perPage") || defaults?.perPage || DEFAULT_PER_PAGE) || DEFAULT_PER_PAGE;
  const perPage = Math.min(maxPerPage, Math.max(1, perPageRaw));
  const order = sp.get("order") === "asc" ? "asc" : "desc";
  return {
    page,
    perPage,
    skip: (page - 1) * perPage,
    take: perPage,
    sort: sp.get("sort") || undefined,
    order,
    q: sp.get("q")?.trim() || undefined,
  };
}

export function pageMeta(p: PageParams, total: number) {
  return {
    page: p.page,
    perPage: p.perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / p.perPage)),
  };
}

/* ---------- Rate limiting (in-memory sliding window) ---------- */
interface RateEntry {
  count: number;
  resetTime: number;
}
interface RateResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}
const buckets = new Map<string, RateEntry>();
let lastSweep = 0;

/** Evict expired buckets so long-lived processes don't grow the map forever
 *  (cheap sweep amortised into call traffic; runs at most once per 60s). */
function sweepBuckets(now: number): void {
  if (now - lastSweep < 60_000 || buckets.size < 512) return;
  lastSweep = now;
  for (const [k, v] of buckets) {
    if (v.resetTime < now) buckets.delete(k);
  }
}

export function rateLimit(identifier: string, max: number, windowMs: number): RateResult {
  const now = Date.now();
  sweepBuckets(now);
  const entry = buckets.get(identifier);
  if (!entry || entry.resetTime < now) {
    buckets.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
  }
  entry.count += 1;
  buckets.set(identifier, entry);
  return {
    allowed: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
    resetAt: entry.resetTime,
  };
}

/** Inspect a rate-limit bucket WITHOUT consuming a slot (used to gate before processing). */
export function peekRateLimit(identifier: string, max: number, windowMs: number): RateResult {
  const now = Date.now();
  const entry = buckets.get(identifier);
  if (!entry || entry.resetTime < now) {
    return { allowed: true, remaining: max, resetAt: now + windowMs };
  }
  return {
    allowed: entry.count <= max,
    remaining: Math.max(0, max - entry.count),
    resetAt: entry.resetTime,
  };
}

/* ---------- Idempotency for important writes ---------- */
export async function withIdempotency<T>(
  req: NextRequest,
  scope: string,
  fn: () => Promise<{ status: number; body: T }>,
  opts?: { ttlHours?: number; bodyForHash?: unknown; callerId?: string },
): Promise<NextResponse> {
  const key = req.headers.get("x-idempotency-key");
  if (!key) {
    const r = await fn();
    return NextResponse.json(r.body, { status: r.status });
  }
  const endpoint = `${req.method} ${req.nextUrl.pathname}`;
  // Hash the already-parsed body (the request stream may be consumed by the handler)
  const requestHash = createHash("sha256")
    .update(JSON.stringify(opts?.bodyForHash ?? ""))
    .digest("hex");
  // Scope the key to the caller so one tenant's replayed key can never return
  // another caller's cached response (or 409-DoS them). Routes with an
  // authenticated identity pass opts.callerId (preferred); the cookie-hint
  // fallback keeps anonymous integrations working but hashes ALL session
  // cookie families so nx and portal callers never share a scope bucket.
  const cookieHint =
    req.headers.get("cookie")?.match(/(?:nx_access|portal_session|nexura_access)=([^;]+)/)?.[1] ??
    "";
  const callerScope = createHash("sha256")
    .update(opts?.callerId ? `user:${opts.callerId}` : `cookie:${cookieHint}`)
    .digest("hex")
    .slice(0, 16);
  const scopedKey = `${callerScope}:${key}`;

  // Claim-then-execute: the idempotency row is inserted BEFORE the handler
  // runs, so two concurrent requests with the same key cannot both execute
  // (the historical check-then-create raced and double-charged payments).
  // The unique constraint on NxIdempotency.key is the serialization point.
  let insertError = null;
  const insert = await db.nxIdempotency
    .create({
      data: {
        key: scopedKey,
        endpoint,
        requestHash,
        userId: opts?.callerId ?? null,
        responseStatus: null,
        responseBody: null,
        expiresAt: new Date(Date.now() + (opts?.ttlHours ?? 24) * 3600_000),
      },
    })
    .catch((err) => {
      insertError = err;
      return null;
    });

  if (!insert) {
    // If it's a database connection/timeout error, surface it instead of pretending it's an idempotency hit.
    // P2002 is Prisma's unique constraint violation code.
    if (insertError) {
       const isConstraintViolation = typeof insertError === "object" && 'code' in insertError && (insertError as Record<string, unknown>).code === 'P2002';
       if (!isConstraintViolation) {
           throw insertError;
       }
    }

    // We lost the insert race (P2002 constraint violation) — this key is already claimed.
    // Replay the winner's response when the payload matches; 409 otherwise.
    const existing = await db.nxIdempotency
      .findUnique({ where: { key: scopedKey } })
      .catch(() => null);
    if (existing && existing.requestHash !== requestHash) {
      return fail(
        "idempotency_key_reuse",
        409,
        "This idempotency key was used with a different payload.",
      );
    }
    if (existing?.responseBody && existing.expiresAt > new Date()) {
      return NextResponse.json(JSON.parse(existing.responseBody), {
        status: existing.responseStatus ?? 200,
      });
    }
    // Claimed but not finished yet (concurrent in-flight request): refuse to
    // double-execute and ask the client to retry.
    return fail(
      "idempotency_in_progress",
      409,
      "A request with this idempotency key is already in progress.",
    );
  }

  const r = await fn();
  await db.nxIdempotency
    .update({
      where: { key: scopedKey },
      data: {
        requestHash,
        responseStatus: r.status,
        responseBody: JSON.stringify(r.body),
      },
    })
    .catch(() => {});
  return NextResponse.json(r.body, { status: r.status });
}

/** Extract the caller IP best-effort (audit metadata only). */
export function ipOf(req: NextRequest): string {
  // Behind exactly one trusted proxy (the platform gateway), the RIGHTMOST
  // X-Forwarded-For entry is the one our proxy appended — the only value a
  // client cannot spoof. Taking the first entry lets attackers rotate fake
  // IPs to bypass every rate limit.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.headers.get("x-real-ip") || "local";
}

/** CSV export helper (reports, billing, inventory). */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return "";
  const cols = columns ?? Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
