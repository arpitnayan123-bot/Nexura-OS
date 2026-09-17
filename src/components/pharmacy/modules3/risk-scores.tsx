"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  HeartPulse, Loader2, AlertTriangle, Activity, Sparkles,
  TrendingUp, Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Patient = {
  customerId: string;
  customerName: string;
  phone: string | null;
  riskScore: number;
  riskLevel: string;
  riskColor: string;
  detectedDiseases: { disease: string; medicines: string[]; source: string }[];
  diseaseCount: number;
  totalPurchases: number;
  recommendations: string[];
  sources: string[];
};

const RISK_STYLE: Record<string, { bg: string; text: string; border: string; label: string }> = {
  high: { bg: "bg-red-500/5", text: "text-red-400", border: "border-red-500/20", label: "High Risk" },
  moderate: { bg: "bg-yellow-500/5", text: "text-yellow-400", border: "border-yellow-500/20", label: "Moderate Risk" },
  low: { bg: "bg-green-500/5", text: "text-green-400", border: "border-green-500/20", label: "Low Risk" },
  none: { bg: "bg-[#111418]", text: "text-[#828894]", border: "border-[#1E2228]", label: "No Risk Data" },
};

export function RiskScoresModule() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pharmacy/risk-score").then(r => r.json()).then(d => { setPatients(d.patients || []); setSummary(d.summary); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#828894]" /></div>;

  const riskPatients = patients.filter(p => p.riskLevel !== "none");

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-white">Patient Risk Scores</h1>
          <p className="text-sm text-[#828894]">AI risk stratification — ICMR-INDIAB + NFHS-5 + medication profile</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-medium text-[#F59E0B]">
          <Sparkles className="h-3.5 w-3.5" /> AI-powered (PioneerRx inspired)
        </span>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={HeartPulse} label="Total patients" value={summary.total} color="#F59E0B" />
          <Kpi icon={AlertTriangle} label="High risk" value={summary.high} color="#EF4444" />
          <Kpi icon={Activity} label="Moderate" value={summary.moderate} color="#EAB308" />
          <Kpi icon={TrendingUp} label="Low risk" value={summary.low} color="#22C55E" />
        </div>
      )}

      {/* Risk patients */}
      {riskPatients.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-[#1E2228] bg-[#111418] py-16 text-center">
          <HeartPulse className="mb-2 h-10 w-10 text-[#1E2228]" />
          <p className="text-sm text-[#828894]">No at-risk patients detected.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {riskPatients.map((p, i) => {
            const style = RISK_STYLE[p.riskLevel] || RISK_STYLE.none;
            return (
              <motion.div
                key={p.customerId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn("rounded-2xl border p-4", style.bg, style.border)}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#F59E0B]/20 to-[#D97706]/20 text-xs font-bold text-[#F59E0B]">
                      {p.customerName.split(" ").map(x => x[0]).join("").slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{p.customerName}</p>
                      <p className="text-[0.65rem] text-[#828894]">{p.phone || "No phone"} · {p.totalPurchases} purchases · {p.diseaseCount} diseases</p>
                    </div>
                  </div>
                  {/* Risk score gauge */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-serif text-3xl font-bold" style={{ color: p.riskColor }}>{p.riskScore}</p>
                      <p className="text-[0.55rem] uppercase tracking-wider text-[#828894]">risk score</p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-[0.65rem] font-bold", style.bg, style.text)}>
                      {style.label}
                    </span>
                  </div>
                </div>

                {/* Risk meter bar */}
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#0D0F12]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: p.riskColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.riskScore}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                {/* Detected diseases */}
                <div className="mt-3">
                  <p className="mb-1.5 text-[0.6rem] font-semibold uppercase tracking-wider text-[#828894]">Detected conditions (from purchase history)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.detectedDiseases.map((dd, j) => (
                      <span key={j} className="flex items-center gap-1 rounded-lg bg-[#0D0F12] px-2 py-1 text-xs">
                        <Stethoscope className="h-3 w-3 text-[#F59E0B]" />
                        <span className="font-medium text-white">{dd.disease}</span>
                        <span className="text-[0.55rem] text-[#828894]">({dd.source})</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI recommendations */}
                {p.recommendations.length > 0 && (
                  <div className="mt-3 rounded-lg bg-[#0D0F12] p-3">
                    <p className="mb-1 flex items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-wider text-[#F59E0B]">
                      <Sparkles className="h-3 w-3" /> AI Recommendations
                    </p>
                    <div className="space-y-1">
                      {p.recommendations.map((r, j) => (
                        <p key={j} className="text-xs text-[#828894]">→ {r}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data sources */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.sources.map((s, j) => (
                    <span key={j} className="rounded bg-[#1E2228] px-1.5 py-0.5 text-[0.5rem] text-[#828894]">{s}</span>
                  ))}
                </div>
              </motion.div>
            );
          })}
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
      <p className="text-[0.6rem] text-[#828894]">{label}</p>
    </div>
  );
}
