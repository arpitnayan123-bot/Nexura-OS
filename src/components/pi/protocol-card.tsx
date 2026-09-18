"use client";

/* ============================================================
 * PIE UI — ProtocolCard
 * A Pre-Emptive Protocol: alert, primary driver, Immediate /
 * Monitoring / Dispo actions, evidence, and the one-click
 * Approve (human-in-the-loop) / Reject controls.
 * ============================================================ */

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FlaskConical,
  GraduationCap,
  Stethoscope,
  XCircle,
} from "lucide-react";

export interface ProtocolActionItem {
  action: string;
  window: string;
  role: string;
}

export interface ProtocolCardData {
  id: string;
  code: string;
  title: string;
  alert: string;
  primaryDriver: string;
  immediate: ProtocolActionItem[];
  monitoring: ProtocolActionItem[];
  dispo: string | null;
  evidence: string;
  confidence: number;
  status: string;
  patientId?: string;
  patientName?: string;
  patientUhid?: string;
  uncertain?: boolean;
}

const ROLE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  doctor: Stethoscope,
  nurse: Clock3,
  pharmacy: FlaskConical,
  lab: FlaskConical,
};

export function ProtocolCard({
  protocol,
  onDecided,
  compact,
}: {
  protocol: ProtocolCardData;
  onDecided?: (id: string, action: "approve" | "reject") => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [localStatus, setLocalStatus] = useState(protocol.status);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/nx/predict/protocols/${protocol.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (res.ok && json?.data?.ok) {
        setLocalStatus(action === "approve" ? "executed" : "rejected");
        onDecided?.(protocol.id, action);
      } else {
        setError(json?.data?.reason ?? "Could not record decision");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  const decided = localStatus !== "pending_approval";

  return (
    <div className="rounded-2xl border border-black/8 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div
            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${protocol.uncertain ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"}`}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold leading-tight">{protocol.title}</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">{protocol.alert}</p>
            {protocol.patientName && (
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                {protocol.patientName} · {protocol.patientUhid}
              </p>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            localStatus === "pending_approval"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              : localStatus === "executed"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-black/5 text-muted-foreground dark:bg-white/10"
          }`}
        >
          {localStatus.replace("_", " ")}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-black/[0.03] px-3 py-2 text-xs dark:bg-white/5">
        <span className="font-semibold">Primary driver:</span> {protocol.primaryDriver}
      </div>

      {!compact && (
        <>
          {protocol.immediate.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Immediate
              </p>
              <ul className="mt-1 space-y-1">
                {protocol.immediate.map((a, i) => (
                  <ActionRow key={i} item={a} />
                ))}
              </ul>
            </div>
          )}
          {protocol.monitoring.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Monitoring
              </p>
              <ul className="mt-1 space-y-1">
                {protocol.monitoring.map((a, i) => (
                  <ActionRow key={i} item={a} />
                ))}
              </ul>
            </div>
          )}
          {protocol.dispo && (
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Dispo:</span> {protocol.dispo}
            </p>
          )}
          <div className="mt-3 flex items-start gap-1.5 rounded-xl border border-dashed border-black/10 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground dark:border-white/10">
            <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {protocol.evidence}{" "}
              <span className="opacity-70">
                (confidence {(protocol.confidence * 100).toFixed(0)}%)
              </span>
            </span>
          </div>
        </>
      )}

      {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}

      {localStatus === "pending_approval" && !protocol.uncertain && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => decide("approve")}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {busy ? "Recording…" : "Approve & Coordinate"}
          </button>
          <button
            onClick={() => decide("reject")}
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-xs font-semibold transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      )}
      {localStatus === "pending_approval" && protocol.uncertain && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Uncertain — Manual Review Required. PIE did not auto-generate actions below the 80%
          confidence gate.
        </p>
      )}
      {decided && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {localStatus === "executed"
            ? "Approved — tasks routed to nurse / pharmacy / lab queues."
            : "Decision recorded in the audit trail."}
        </p>
      )}
    </div>
  );
}

function ActionRow({ item }: { item: ProtocolActionItem }) {
  const Icon = ROLE_ICON[item.role] ?? Clock3;
  return (
    <li className="flex items-start gap-2 text-xs">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span>
        {item.action} <span className="text-muted-foreground">· {item.window}</span>
      </span>
    </li>
  );
}
