import { EventEmitter } from "events";

/* ============================================================
   NEXURA HOSPITAL OS — REAL-TIME EVENT BUS
   In-process pub/sub feeding the SSE endpoint (/api/nx/stream).
   - Tenant isolation: every subscriber carries its own auth scope;
     publish() filters per-subscriber before emitting.
   - Channel privacy: channel-scoped events (care communication,
     e.g. `care-team:<patientId>`) only reach subscribers who are
     channel members or hold `patient.clinical.view` — message
     previews never leak to staff without clinical access.
   - Ordering: monotonic per-process sequence numbers, prefixed
     with a boot epoch so a server restart can never make stale
     client-side seq values swallow fresh events.
   - Connection hygiene: per-user connection cap prevents leaked
     SSE handles from accumulating.
   - Production note: swap the emitter for Redis pub/sub behind
     the same interface when scaling beyond one node (see docs).
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

const g = globalThis as unknown as { __nxBus?: EventEmitter; __nxConns?: Map<string, Conn> };
const bus = g.__nxBus ?? new EventEmitter();
const conns = g.__nxConns ?? new Map<string, Conn>();
bus.setMaxListeners(0);
g.__nxBus = bus;
g.__nxConns = conns;

/** Boot-epoch base keeps seq monotonic across restarts (client-side dedupe). */
const EPOCH_BASE = Date.now() * 1000;
let seqCounter = 0;

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

export function publish(ev: Omit<NxEvent, "at" | "seq">): NxEvent {
  const full: NxEvent = { ...ev, at: new Date().toISOString(), seq: EPOCH_BASE + ++seqCounter };
  for (const conn of conns.values()) {
    if (matches(conn, full)) {
      try {
        conn.send(full);
      } catch {
        conns.delete(conn.id);
      }
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
  return () => conns.delete(id);
}

export function connectionCount(): number {
  return conns.size;
}

/** Subscribe scoped to a role-key list — used by the SSE route. */
export function subscriberScope(opts: { userId: string; role: string; hospitalId: string; roleKeys: string[]; channels?: string[]; clinicalAll?: boolean }): SubscriberScope {
  return opts;
}
