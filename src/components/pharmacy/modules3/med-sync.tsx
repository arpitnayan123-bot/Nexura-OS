"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeartPulse, Loader2, RefreshCw, MessageCircle, Sparkles,
  CheckCircle2, AlertTriangle, Clock, Pill, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ChronicPatient = {
  customerId: string;
  customerName: string;
  phone: string | null;
  totalPurchases: number;
  detectedDiseases: {
    disease: string;
    medicines: string[];
    lastPurchase: string;
    cycleDays: number;
  }[];
  nextRefillDates: { disease: string; nextRefill: string; daysUntil: number }[];
  syncStatus: "synced" | "needs_sync" | "none";
  earliestRefillDays: number | null;
  earliestRefillDate: string | null;
  needsReminder: boolean;
};

export function MedSyncModule() {
  const [patients, setPatients] = useState<ChronicPatient[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pharmacy/med-sync");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPatients(d.patients || []);
      setSummary(d.summary);
    } catch { toast.error("Could not load Med Sync data"); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const sendReminder = async (customerId: string, name: string) => {
    setSending(customerId);
    try {
      const res = await fetch("/api/pharmacy/med-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, message: `Reminder: Your medicines are due for refill at our pharmacy. Please visit us or reply to order. — Nexura Pharmacia` }),
      });
      if (!res.ok) throw new Error();
      toast.success(`WhatsApp reminder sent to ${name}`);
    } catch { toast.error("Could not send reminder"); } finally { setSending(null); }
  };

  if (loading) return <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#6B7280]" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-white">Medication Sync</h1>
          <p className="text-sm text-[#6B7280]">AI-detected chronic patients · aligned monthly refills · auto WhatsApp reminders</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-medium text-[#F59E0B]">
          <Sparkles className="h-3.5 w-3.5" /> AI-powered (PioneerRx inspired)
        </span>
      </div>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={HeartPulse} label="Chronic patients" value={summary.totalChronic} color="#F59E0B" />
          <Kpi icon={CheckCircle2} label="Synced" value={summary.synced} color="#22C55E" />
          <Kpi icon={RefreshCw} label="Needs sync" value={summary.needsSync} color="#EAB308" />
          <Kpi icon={AlertTriangle} label="Needs reminder" value={summary.needsReminder} color="#EF4444" />
        </div>
      )}

      {/* Patient cards */}
      {patients.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-[#1E2228] bg-[#111418] py-16 text-center">
          <HeartPulse className="mb-2 h-10 w-10 text-[#1E2228]" />
          <p className="text-sm text-[#6B7280]">No chronic patients detected yet.</p>
          <p className="text-xs text-[#6B7280]">AI detects chronic patterns from purchase history (e.g. monthly Metformin = diabetic).</p>
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((p, i) => (
            <motion.div
              key={p.customerId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                "rounded-2xl border p-4",
                p.syncStatus === "synced" ? "border-green-500/20 bg-green-500/5" :
                p.syncStatus === "needs_sync" ? "border-yellow-500/20 bg-yellow-500/5" :
                "border-[#1E2228] bg-[#111418]"
              )}
            >
              {/* Patient header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#F59E0B]/20 to-[#D97706]/20 text-xs font-bold text-[#F59E0B]">
                    {p.customerName.split(" ").map(x => x[0]).join("").slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{p.customerName}</p>
                    <p className="text-[0.65rem] text-[#6B7280]">{p.phone || "No phone"} · {p.totalPurchases} purchases</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.syncStatus === "synced" ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-[0.6rem] font-medium text-green-400">
                      <CheckCircle2 className="h-3 w-3" /> Synced
                    </span>
                  ) : p.syncStatus === "needs_sync" ? (
                    <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-1 text-[0.6rem] font-medium text-yellow-400">
                      <RefreshCw className="h-3 w-3" /> Needs sync
                    </span>
                  ) : null}
                  {p.needsReminder && (
                    <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[0.6rem] font-medium text-red-400 animate-pulse">
                      <AlertTriangle className="h-3 w-3" /> Refill due
                    </span>
                  )}
                </div>
              </div>

              {/* Detected diseases */}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {p.detectedDiseases.map((dd, j) => (
                  <div key={j} className="rounded-lg bg-[#0D0F12] p-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#F59E0B]/10 text-[#F59E0B]">
                        <Activity className="h-3 w-3" />
                      </span>
                      <p className="text-xs font-semibold text-white">{dd.disease}</p>
                    </div>
                    <p className="mt-1 text-[0.65rem] text-[#6B7280]">
                      {dd.medicines.join(", ")}
                    </p>
                    <p className="mt-0.5 text-[0.6rem] text-[#6B7280]">
                      Last purchased: {new Date(dd.lastPurchase).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                ))}
              </div>

              {/* Refill timeline */}
              {p.nextRefillDates.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-wider text-[#6B7280]">Refill timeline</p>
                  <div className="flex flex-wrap gap-2">
                    {p.nextRefillDates.map((r, j) => {
                      const urgent = r.daysUntil <= 3;
                      const soon = r.daysUntil <= 7;
                      return (
                        <div key={j} className={cn(
                          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs",
                          urgent ? "bg-red-500/10 text-red-400" : soon ? "bg-yellow-500/10 text-yellow-400" : "bg-[#0D0F12] text-[#6B7280]"
                        )}>
                          <Clock className="h-3 w-3" />
                          <span>{r.disease}</span>
                          <span className="font-semibold">{r.nextRefill}</span>
                          <span>({r.daysUntil}d)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => sendReminder(p.customerId, p.customerName)}
                  disabled={sending === p.customerId}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                    p.needsReminder
                      ? "bg-[#F59E0B] text-black hover:bg-[#D97706]"
                      : "bg-[#1E2228] text-[#6B7280] hover:text-white"
                  )}
                >
                  {sending === p.customerId ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
                  Send WhatsApp reminder
                </button>
                {p.syncStatus === "needs_sync" && (
                  <button
                    onClick={() => toast.info(`Sync request: Align all ${p.customerName}'s medications to one monthly pickup date`)}
                    className="flex items-center gap-1.5 rounded-full bg-[#1E2228] px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-[#2A2E35]"
                  >
                    <RefreshCw className="h-3 w-3" /> Align refills
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-[#1E2228] bg-[#111418] p-4">
      <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2 font-serif text-xl font-bold text-white">{value}</p>
      <p className="text-[0.6rem] text-[#6B7280]">{label}</p>
    </div>
  );
}
