import { createHmac, randomBytes } from "crypto";
import { log } from "@/lib/logger";
import { isRedisConfigured, redis, redisSubscriber } from "@/lib/redis";

/* ============================================================
   NEXURA HOSPITAL OS — REAL-TIME EVENT BUS (Redis fan-out)
   Feeds the SSE endpoint (/api/nx/stream) across ALL app
   instances sharing REDIS_URL (stateless-1).

   Topology
   - publish(): sign → deliver to LOCAL connections instantly →
     fire-and-forget PUBLISH on the `nx:bus` channel. Other
     instances receive it via their subscriber connection and
     relay to THEIR local connections. Events carry a boot-random
     `from` instance tag; a relay drops its own events (no loops,
     no double delivery).
   - Ordering / dedupe: seq is monotonic per process (boot-epoch
     base so restarts never let stale client seqs swallow fresh
     events). Each SSE stream is served by exactly one instance,
     so per-process ordering IS per-stream ordering.
   - Tenant isolation: every subscriber carries its own auth scope;
     delivery filters per-subscriber before emitting — on EVERY
     instance, including relayed events.
   - Channel privacy: channel-scoped events (care communication,
     e.g. `care-team:<patientId>`) only reach subscribers who are
     channel members or hold `patient.clinical.view` — message
     previews never leak to staff without clinical access.
   - Integrity: HMAC-SHA256 signature (key derived from
     JWT_SECRET per hospital) proves the event originated from a
     server process — relayed frames are re-verified before local
     delivery, and the UI drops unsigned/mismatched events.
   - What intentionally stays per-process: the live connection
     registry. An SSE handle is a socket on one machine — it is
     state like an OS file descriptor, not shared application
     state; Redis carries the events, never the sockets.
   - Connection hygiene: per-user connection cap prevents leaked
     SSE handles from accumulating.
   ============================================================ */

export interface NxEvent {
  event: string; // e.g. task.created | message.new | bed.updated | notification.new | lab.critical
  hospitalId: string;
  /** Audience selectors — a subscriber receives the event if ANY matches. */
  toRoles?: string[];
  toUsers?: string[];
  channelKey?: string; // for channel-scoped events (care communication)
  patientId?: string;
  data: unknown;
  at?: string;
  seq?: number;
  /** HMAC-SHA256 integrity signature — proves the event originated from
   *  a server process sharing JWT_SECRET, not from injected client code. */
  sig?: string;
  /** Boot-random publisher tag — relays drop their own events. */
  from?: string;
}

export interface SubscriberScope {
  userId: string;
  role: string;
  hospitalId: string;
  roleKeys: string[]; // effective role keys incl. legacy mapping
  /** Channel keys this subscriber may see (membership at connect time). */
  channels?: string[];
  /** True when the subscriber holds patient.clinical.view (or break-glass). */
  clinicalAll?: boolean;
}

interface Conn {
  id: string;
  scope: SubscriberScope;
  send: (event: NxEvent) => void;
  connectedAt: number;
}

/** Live SSE handles on THIS process. Deliberately per-instance (sockets
 *  cannot be shared); Redis carries events across instances. globalThis
 *  keeps the registry stable across dev-HMR route reloads. */
const g = globalThis as unknown as {
  __nxConns?: Map<string, Conn>;
  __nxInstanceTag?: string;
  __nxRelayStarted?: boolean;
};
const conns = (g.__nxConns ??= new Map<string, Conn>());

const INSTANCE = (g.__nxInstanceTag ??= randomBytes(8).toString("hex"));
const BUS_CHANNEL = "nx:bus";

/** Boot-epoch base keeps seq monotonic across restarts (client-side dedupe). */
const EPOCH_BASE = Date.now() * 1000;
let seqCounter = 0;

/** Per-hospital SSE signing key (delivered ONLY in the authenticated hello frame).
 *  Deterministic derivation from JWT_SECRET — no cache to invalidate. */
export function signingKeyFor(hospitalId: string): string {
  const secret = process.env.JWT_SECRET || "nx-dev-sse-secret";
  return createHmac("sha256", secret).update(`sse:${hospitalId}`).digest("hex").slice(0, 32);
}

export function verifyEventSignature(ev: NxEvent): boolean {
  if (!ev.sig) return false;
  const expected = createHmac("sha256", signingKeyFor(ev.hospitalId))
    .update(`${ev.seq}|${ev.event}|${JSON.stringify(ev.data ?? null)}`)
    .digest("hex");
  return ev.sig === expected;
}

/** Max simultaneous SSE connections per user — protects against leaked handles. */
export const MAX_CONNS_PER_USER = 5;

function matches(conn: Conn, ev: NxEvent): boolean {
  if (ev.hospitalId !== conn.scope.hospitalId) return false;
  // Channel privacy: a channel-scoped event requires membership or clinical view.
  if (ev.channelKey && !(conn.scope.clinicalAll || conn.scope.channels?.includes(ev.channelKey))) {
    return false;
  }
  if (ev.toUsers && ev.toUsers.includes(conn.scope.userId)) return true;
  if (ev.toRoles && ev.toRoles.some((r) => conn.scope.roleKeys.includes(r))) return true;
  if (!ev.toUsers && !ev.toRoles) return true; // hospital-wide
  return false;
}

function deliverLocal(full: NxEvent): void {
  for (const conn of conns.values()) {
    if (matches(conn, full)) {
      try {
        conn.send(full);
      } catch {
        conns.delete(conn.id);
      }
    }
  }
}

/** Cross-instance relay: subscribe once per process; every inbound
 *  frame is signature-verified before local delivery. */
function startRelay(): void {
  if (g.__nxRelayStarted || !isRedisConfigured()) return;
  const sub = redisSubscriber();
  if (!sub) return;
  g.__nxRelayStarted = true;
  sub
    .subscribe(BUS_CHANNEL)
    .then(() => log.info("bus", "redis relay subscribed", { channel: BUS_CHANNEL, instance: INSTANCE }))
    .catch((err) => {
      g.__nxRelayStarted = false;
      log.error("bus", "redis relay subscribe failed — running local-only", { err: err instanceof Error ? err.message : String(err) });
    });
  sub.on("message", (_channel: string, payload: string) => {
    try {
      const ev = JSON.parse(payload) as NxEvent;
      if (ev.from === INSTANCE) return; // our own publish — already delivered locally
      if (!verifyEventSignature(ev)) {
        log.warn("bus", "relayed event failed signature check — dropped", { event: ev.event });
        return;
      }
      deliverLocal(ev);
    } catch {
      // malformed frame — never crash the stream on one bad message
    }
  });
}

export function publish(ev: Omit<NxEvent, "at" | "seq" | "sig" | "from">): NxEvent {
  const seq = EPOCH_BASE + ++seqCounter;
  const sig = createHmac("sha256", signingKeyFor(ev.hospitalId))
    .update(`${seq}|${ev.event}|${JSON.stringify(ev.data ?? null)}`)
    .digest("hex");
  const full: NxEvent = { ...ev, at: new Date().toISOString(), seq, sig, from: INSTANCE };
  deliverLocal(full);
  if (isRedisConfigured()) {
    const client = redis();
    if (client) {
      startRelay();
      // Fire-and-forget over the COMMAND connection (a subscribed connection
      // cannot PUBLISH). Local delivery already succeeded; a Redis hiccup
      // degrades other instances' visibility, never this request's latency.
      client.publish(BUS_CHANNEL, JSON.stringify(full)).catch((err) => {
        log.error("bus", "redis publish failed (event delivered locally only)", { err: err instanceof Error ? err.message : String(err) });
      });
    }
  }
  return full;
}

export function subscribe(id: string, scope: SubscriberScope, send: (event: NxEvent) => void): () => void {
  // Enforce the per-user connection cap: drop this user's oldest connections first.
  const mine = [...conns.values()].filter((c) => c.scope.userId === scope.userId);
  if (mine.length >= MAX_CONNS_PER_USER) {
    mine.sort((a, b) => a.connectedAt - b.connectedAt);
    for (const stale of mine.slice(0, mine.length - MAX_CONNS_PER_USER + 1)) {
      conns.delete(stale.id);
    }
  }
  conns.set(id, { id, scope, send, connectedAt: Date.now() });
  startRelay();
  return () => conns.delete(id);
}

export function connectionCount(): number {
  return conns.size;
}

/** Subscribe scoped to a role-key list — used by the SSE route. */
export function subscriberScope(opts: { userId: string; role: string; hospitalId: string; roleKeys: string[]; channels?: string[]; clinicalAll?: boolean }): SubscriberScope {
  return opts;
}
