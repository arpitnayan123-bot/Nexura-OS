"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================
   HOSPITAL OS — client data layer
   Tiny fetch hook with loading / error / refresh. No external
   state lib needed; keeps modules self-contained.
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

  const refresh = useCallback(async () => {
    if (!pathRef.current) return;
    try {
      const d = await nx<T>(pathRef.current);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    refresh();
    if (opts?.pollMs) {
      const t = setInterval(refresh, opts.pollMs);
      return () => clearInterval(t);
    }
  }, [path, opts?.pollMs, refresh]);

  return { data, error, loading, refresh, setData };
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
