"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "./os/toast";

/* ============================================================
   HOSPITAL OS — client data layer
   Tiny fetch hook with loading / error / refresh. No external
   state lib needed; keeps modules self-contained.

   Guarantees:
   - Stale-response guard: only the latest request may commit state
     (rapid filter changes / refresh storms can never interleave).
   - AbortController per fetch: in-flight requests are aborted on
     path change and unmount; no setState-after-unmount.
   - Visibility-aware polling: background tabs (and minimized OS
     windows' hidden documents) pause polling until visible again.
   ============================================================ */

export async function nx<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string; detail?: string }).detail || (data as { error?: string }).error || `Request failed (${res.status})`);
    (err as Error & { status?: number; data?: unknown }).status = res.status;
    (err as Error & { data?: unknown }).data = data;
    throw err;
  }
  return data as T;
}

export function useNx<T>(path: string | null, opts?: { pollMs?: number }) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const pathRef = useRef(path);
  pathRef.current = path;
  // Monotonic request token — newer fetches invalidate older in-flight ones.
  const tokenRef = useRef(0);
  const aliveRef = useRef(true);
  const acRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const p = pathRef.current;
    if (!p) return;
    const token = ++tokenRef.current;
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    try {
      const d = await nx<T>(p, { signal: ac.signal });
      if (!aliveRef.current || token !== tokenRef.current) return;
      setData(d);
      setError(null);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      if (!aliveRef.current || token !== tokenRef.current) return;
      setError(e as Error);
    } finally {
      if (aliveRef.current && token === tokenRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      acRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    refresh();
    if (!opts?.pollMs) return;
    // Pause polling while the tab is hidden or the browser is offline;
    // refresh once immediately when it becomes visible again.
    const tick = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      refresh();
    }, opts.pollMs);
    const onVisible = () => {
      if (!document.hidden && navigator.onLine !== false) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [path, opts?.pollMs, refresh]);

  return { data, error, loading, refresh, setData };
}

/** Debounce a fast-changing value (search inputs, palette filters). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Shared mutation helper: one busy flag + toast + refresh, replacing the
 * near-identical copy-pasted "busyId → PATCH → toast → refresh" blocks that
 * existed in a dozen modules.
 *
 *   const act = useNxMutation();
 *   await act.run("task-1", () => nx("/api/nx/tasks", { method: "PATCH", … }), {
 *     success: "Task updated", onDone: refresh,
 *   });
 *   act.busyId === "task-1"  // → disable that row's buttons
 */
export function useNxMutation() {
  const [busyId, setBusyId] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const run = useCallback(async (
    id: string | null,
    fn: () => Promise<unknown>,
    opts?: { success?: string; error?: string; onDone?: () => void | Promise<void>; onFail?: () => void | Promise<void> }
  ) => {
    if (alive.current) setBusyId(id ?? "__global");
    try {
      await fn();
      if (opts?.success) toast.success(opts.success);
      await opts?.onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (opts?.error ?? "Action failed"));
      await opts?.onFail?.();
    } finally {
      if (alive.current) setBusyId(null);
    }
  }, []);

  const isBusy = useCallback((id?: string | null) => busyId !== null && (id == null || busyId === id), [busyId]);
  return { busyId, isBusy, run };
}

export function timeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function minsUntil(iso: string | Date | null | undefined): number | null {
  if (!iso) return null;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return Math.round((d.getTime() - Date.now()) / 60000);
}

export function fmtClock(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

/* ============================================================
   REAL-TIME — Server-Sent Events hook with reconnect + dedupe.
   Emits the last sync time so modules can reconcile missed
   events after reconnect (offline → lastSyncedAt shown in bar).
   ============================================================ */

export interface NxStreamEvent {
  event: string;
  hospitalId: string;
  data: Record<string, unknown>;
  at: string;
  seq?: number;
}

export function useNxStream(opts?: { onEvent?: (ev: NxStreamEvent) => void; enabled?: boolean }) {
  const [connected, setConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const seen = useRef<Set<number>>(new Set());
  const handler = useRef(opts?.onEvent);
  useEffect(() => {
    // keep the latest callback in a ref without mutating during render
    handler.current = opts?.onEvent;
  });
  const enabled = opts?.enabled !== false;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      es = new EventSource("/api/nx/stream");
      es.addEventListener("hello", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          if (data.lastSyncedAt) setLastSyncedAt(data.lastSyncedAt);
        } catch { /* noop */ }
        setConnected(true);
      });
      es.addEventListener("nx", (e) => {
        try {
          const ev = JSON.parse((e as MessageEvent).data) as NxStreamEvent;
          // duplicate suppression: server seq per connection cycle
          if (typeof ev.seq === "number") {
            if (seen.current.has(ev.seq)) return;
            seen.current.add(ev.seq);
            if (seen.current.size > 500) seen.current = new Set(Array.from(seen.current).slice(-200));
          }
          setLastSyncedAt(ev.at ?? new Date().toISOString());
          handler.current?.(ev);
          window.dispatchEvent(new CustomEvent("nx-live-event", { detail: ev }));
        } catch { /* noop */ }
      });
      es.onerror = () => {
        setConnected(false);
        es?.close();
        // reconnect with backoff
        retry = setTimeout(connect, 2500 + Math.random() * 2000);
      };
    };
    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      es?.close();
      setConnected(false);
    };
  }, [enabled]);

  return { connected, lastSyncedAt };
}
