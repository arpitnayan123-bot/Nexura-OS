"use client";
/* ============================================================
   NEXURA OS v5 — OFFLINE WRITE BUFFER (PWA companion)
   IndexedDB-backed queue for triage captures / prescription drafts
   made while disconnected. Auto-flushes to /api/nx/offline/sync on
   reconnect. Deterministic receipts prevent double-submission.
   ============================================================ */

const DB_NAME = "nexura-offline";
const STORE = "pending-ops";

interface PendingOp {
  clientId: string;
  type: "triage" | "prescription_draft" | "note_draft";
  capturedAt: string;
  patientUhid?: string;
  payload: Record<string, unknown>;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "clientId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueOp(op: Omit<PendingOp, "clientId" | "capturedAt"> & { clientId?: string }): Promise<string> {
  const clientId = op.clientId ?? `op-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...op, clientId, capturedAt: new Date().toISOString() } satisfies PendingOp);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  window.dispatchEvent(new CustomEvent("nx-offline-queue", { detail: { pending: await pendingCount() } }));
  return clientId;
}

export async function pendingCount(): Promise<number> {
  try {
    const db = await openDb();
    const n = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return n;
  } catch {
    return 0;
  }
}

export interface FlushResult { flushed: number; failed: number; receipts: { clientId: string; status: string }[] }

export async function flushQueue(): Promise<FlushResult> {
  const db = await openDb();
  const all: PendingOp[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as PendingOp[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (!all.length) return { flushed: 0, failed: 0, receipts: [] };
  const res = await fetch("/api/nx/offline/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ops: all }),
  });
  if (!res.ok) return { flushed: 0, failed: all.length, receipts: [] };
  const body = (await res.json()) as { data?: { receipts?: { clientId: string; status: string }[] } };
  const receipts = body.data?.receipts ?? [];
  const okIds = new Set(receipts.filter((r) => r.status === "accepted" || r.status === "duplicate_ignored").map((r) => r.clientId));
  const db2 = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db2.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    all.filter((o) => okIds.has(o.clientId)).forEach((o) => store.delete(o.clientId));
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db2.close();
  window.dispatchEvent(new CustomEvent("nx-offline-queue", { detail: { pending: await pendingCount() } }));
  return { flushed: okIds.size, failed: all.length - okIds.size, receipts };
}

/** Auto-flush on reconnect + periodic retry while online. */
export function installOfflineAutoFlush(): () => void {
  const onOnline = () => void flushQueue();
  window.addEventListener("online", onOnline);
  const timer = setInterval(() => {
    if (navigator.onLine) void pendingCount().then((n) => { if (n > 0) return flushQueue(); });
  }, 60_000);
  return () => {
    window.removeEventListener("online", onOnline);
    clearInterval(timer);
  };
}
