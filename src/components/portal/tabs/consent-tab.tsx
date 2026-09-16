"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Sparkles, Share2, Video, FlaskConical, Loader2,
  CheckCircle2, XCircle, Clock, Undo2, History, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ============================================================
   PRIVACY / CONSENT TAB — patient self-service (DPDP 2023).
   View, grant and withdraw consents YOURSELF. Withdrawal takes
   effect immediately (the AI governance check resolves the latest
   consent event), and every action is appended to the hospital's
   consent ledger with "self-service:portal" attribution.
   ============================================================ */

const TYPE_ICONS: Record<string, typeof Sparkles> = {
  ai_assist: Sparkles,
  data_share: Share2,
  telemedicine: Video,
  research: FlaskConical,
};

type ConsentState = "granted" | "not_granted" | "withdrawn" | "expired";

type ConsentTypeView = {
  type: string;
  label: string;
  purpose: string;
  state: ConsentState;
  lastEventAt: string | null;
  expiresAt: string | null;
};

type HistoryRow = {
  id: string;
  type: string;
  status: string;
  recordedBy: string;
  grantedAt: string;
  withdrawnAt: string | null;
  expiresAt: string | null;
};

type ConsentData = {
  linked: boolean;
  patient?: { uhid: string; fullName: string };
  types: ConsentTypeView[];
  history: HistoryRow[];
  detail?: string;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

const STATE_BADGE: Record<ConsentState, { label: string; cls: string }> = {
  granted: { label: "Granted", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  not_granted: { label: "Not granted", cls: "bg-stone-100 text-stone-500 border-stone-200" },
  withdrawn: { label: "Withdrawn", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  expired: { label: "Expired", cls: "bg-stone-100 text-stone-500 border-stone-200" },
};

export function ConsentTab() {
  const [data, setData] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null); // `${type}:${action}` in flight

  const fetchConsents = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/consent", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || d.error || "Failed to load consents");
      setData(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load consents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsents();
  }, [fetchConsents]);

  const updateConsent = async (type: string, action: "grant" | "withdraw", label: string) => {
    setPending(`${type}:${action}`);
    try {
      const res = await fetch("/api/portal/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, action }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || d.error || "Could not update consent");
      toast.success(
        action === "grant"
          ? `${label} granted — you can withdraw it anytime.`
          : `${label} withdrawn — this takes effect immediately.`
      );
      await fetchConsents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update consent");
    } finally {
      setPending(null);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center rounded-3xl border border-[#E7E5E4] bg-white p-12 shadow-sm">
        <Loader2 className="h-7 w-7 animate-spin text-[#A16207]" />
        <p className="mt-3 text-sm text-stone-500">Loading your consent choices…</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[#E7E5E4] bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#A16207]/10 text-[#A16207]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-stone-800">Privacy &amp; Consents</h1>
            <p className="text-sm text-stone-500">
              You decide how your information is used. Withdrawals take effect immediately.
            </p>
          </div>
        </div>
        {data.linked && data.patient ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-stone-400">
            <Link2 className="h-3.5 w-3.5" />
            Linked hospital record: {data.patient.fullName} · UHID {data.patient.uhid}
          </p>
        ) : null}
      </motion.div>

      {/* Not-linked notice */}
      {!data.linked && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 sm:p-6"
        >
          {data.detail || "Self-service consent needs a linked hospital record."}
        </motion.div>
      )}

      {/* Consent cards */}
      {data.types.map((t, i) => {
        const Icon = TYPE_ICONS[t.type] ?? ShieldCheck;
        const badge = STATE_BADGE[t.state] ?? STATE_BADGE.not_granted;
        const busyGrant = pending === `${t.type}:grant`;
        const busyWithdraw = pending === `${t.type}:withdraw`;
        return (
          <motion.div
            key={t.type}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.04 }}
            className="rounded-3xl border border-[#E7E5E4] bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#A16207]/10 text-[#A16207]">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base font-semibold text-stone-800">{t.label}</h2>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", badge.cls)}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-stone-500">{t.purpose}</p>
                  {t.lastEventAt ? (
                    <p className="mt-1.5 text-xs text-stone-400">
                      Last change: {fmtDate(t.lastEventAt)}
                      {t.expiresAt ? ` · valid until ${fmtDate(t.expiresAt)}` : ""}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {t.state === "granted" ? (
                  <Button
                    variant="outline"
                    disabled={busyWithdraw}
                    onClick={() => updateConsent(t.type, "withdraw", t.label)}
                    className="rounded-full border-amber-300 text-amber-700 hover:bg-amber-50 active:scale-95"
                  >
                    {busyWithdraw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                    Withdraw
                  </Button>
                ) : (
                  <Button
                    disabled={busyGrant}
                    onClick={() => updateConsent(t.type, "grant", t.label)}
                    className="rounded-full bg-[#A16207] text-white hover:bg-[#8A5A04] active:scale-95"
                  >
                    {busyGrant ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Grant
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* History */}
      {data.linked && data.history.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-[#E7E5E4] bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#A16207]" />
            <h2 className="font-display text-base font-semibold text-stone-800">Consent history</h2>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Every change is recorded permanently — including changes made at the hospital front desk.
          </p>
          <ul className="mt-3 divide-y divide-stone-100">
            {data.history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  {h.status === "granted" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-stone-400" />
                  )}
                  <span className="font-medium text-stone-700">{h.type.replace(/_/g, " ")}</span>
                  <span className="text-stone-400">·</span>
                  <span className="text-stone-500">{h.status}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-400">
                  <Clock className="h-3.5 w-3.5" />
                  {fmtDate(h.grantedAt)}
                  <span>· by {h.recordedBy}</span>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      ) : null}
    </div>
  );
}
