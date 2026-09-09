import { EventEmitter } from "events";

/* ============================================================
   NEXURA HOSPITAL OS — REAL-TIME EVENT BUS
   In-process pub/sub feeding the SSE endpoint (/api/nx/stream).
   - Tenant isolation: every subscriber carries its own auth scope;
     publish() filters per-subscriber before emitting.
   - Ordering: monotonic per-connection sequence numbers.
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
}

interface Conn {
  id: string;
  scope: SubscriberScope;
  send: (event: NxEvent) => void;
}

const g = globalThis as unknown as { __nxBus?: EventEmitter; __nxConns?: Map<string, Conn> };
const bus = g.__nxBus ?? new EventEmitter();
const conns = g.__nxConns ?? new Map<string, Conn>();
bus.setMaxListeners(0);
g.__nxBus = bus;
g.__nxConns = conns;

let seqCounter = 0;

function matches(conn: Conn, ev: NxEvent): boolean {
  if (ev.hospitalId !== conn.scope.hospitalId) return false;
  if (ev.toUsers && ev.toUsers.includes(conn.scope.userId)) return true;
  if (ev.toRoles && ev.toRoles.some((r) => conn.scope.roleKeys.includes(r))) return true;
  if (!ev.toUsers && !ev.toRoles) return true; // hospital-wide
  return false;
}

export function publish(ev: Omit<NxEvent, "at" | "seq">): NxEvent {
  const full: NxEvent = { ...ev, at: new Date().toISOString(), seq: ++seqCounter };
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
  conns.set(id, { id, scope, send });
  return () => conns.delete(id);
}

export function connectionCount(): number {
  return conns.size;
}

/** Subscribe scoped to a role-key list — used by the SSE route. */
export function subscriberScope(opts: { userId: string; role: string; hospitalId: string; roleKeys: string[] }): SubscriberScope {
  return opts;
}
