"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Download, Sparkles, Loader2, AlertTriangle, CheckCircle2, XCircle,
  Activity, FileText, Calendar, MapPin, User, Phone, Droplet, Info,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type BloodBooking = {
  id: string;
  bookingRef: string;
  testPanelName: string;
  testPanelCode: string;
  testsIncluded: string;
  price: number;
  scheduledDate: string;
  timeSlot: string;
  address: string;
  city: string;
  pincode: string;
  phlebotomistName: string | null;
  phlebotomistPhone: string | null;
  status: string;
  sampleCollectedAt: string | null;
  reportReadyAt: string | null;
  reportJson: string | null;
  aiInterpretation: string | null;
  paymentMode: string;
  paymentStatus: string;
};

interface LabTest {
  name: string;
  value: string;
  unit: string;
  refRange: string;
  flag: string;
  category: string;
}

const FLAG_STYLES: Record<string, { bg: string; text: string; label: string; icon: typeof CheckCircle2 }> = {
  normal: { bg: "bg-[#9DB89E]/15", text: "text-[#5E8A60]", label: "Normal", icon: CheckCircle2 },
  borderline: { bg: "bg-[#C9962E]/20", text: "text-[#A87C45]", label: "Borderline", icon: AlertTriangle },
  high: { bg: "bg-[#A16207]/15", text: "text-[#B85A3F]", label: "High", icon: AlertTriangle },
  low: { bg: "bg-[#0EA5E9]/15", text: "text-[#0284C7]", label: "Low", icon: AlertTriangle },
  critical: { bg: "bg-red-100", text: "text-red-700", label: "Critical", icon: AlertTriangle },
};

type Props = {
  open: boolean;
  booking: BloodBooking | null;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
};

export function ReportModal({ open, booking, onOpenChange, onChanged }: Props) {
  const [interpretation, setInterpretation] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [source, setSource] = useState<"cache" | "llm" | "rule-based" | null>(null);

  useEffect(() => {
    if (open && booking) {
      setInterpretation(booking.aiInterpretation ?? "");
      setSource(booking.aiInterpretation ? "cache" : null);
    } else {
      setInterpretation("");
      setSource(null);
    }
  }, [open, booking]);

  const report = booking?.reportJson ? (JSON.parse(booking.reportJson) as { tests: LabTest[]; panelName: string; collectedAt?: string; reportedAt?: string; labName?: string }) : null;
  const tests = report?.tests ?? [];

  const abnormals = tests.filter((t) => t.flag !== "normal");
  const grouped: Record<string, LabTest[]> = {};
  for (const t of tests) (grouped[t.category] ||= []).push(t);

  const generateAI = async () => {
    if (!booking) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/portal/ai-interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      setInterpretation(d.interpretation);
      setSource(d.source);
      toast.success("AI interpretation ready", {
        description: d.cached ? "Loaded from cache" : `Generated via ${d.source}`,
      });
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate interpretation");
    } finally {
      setGenerating(false);
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-3xl">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#8F5E06] via-[#A16207] to-[#B8860B] p-6 text-white">
          <div
            aria-hidden
            className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl"
            style={{ animation: "nexura-breathe 6s ease-in-out infinite" }}
          />
          <DialogHeader className="relative space-y-1.5 p-0">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/20 backdrop-blur">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="font-display text-xl">{booking.testPanelName}</DialogTitle>
                <DialogDescription className="text-white/85">
                  {booking.bookingRef} · {report?.labName ?? "Nexura Diagnostics"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <InfoChip icon={Calendar} label="Collected" value={booking.sampleCollectedAt ? new Date(booking.sampleCollectedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"} />
            <InfoChip icon={Activity} label="Reported" value={booking.reportReadyAt ? new Date(booking.reportReadyAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"} />
            <InfoChip icon={User} label="Phlebotomist" value={booking.phlebotomistName ?? "—"} />
            <InfoChip icon={Droplet} label="Tests" value={`${tests.length}`} />
          </div>

          {abnormals.length > 0 && (
            <div className="relative mt-3 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs backdrop-blur">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-100" />
              <span className="font-medium">{abnormals.length} abnormal result{abnormals.length > 1 ? "s" : ""} detected — review below.</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {/* Test groups */}
          <div className="space-y-5">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  <Activity className="h-3.5 w-3.5 text-[#A16207]" />
                  {cat}
                </h3>
                <div className="overflow-hidden rounded-2xl border border-[#E7E5E4]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#FAF7F2] text-[0.7rem] uppercase tracking-wider text-stone-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Test</th>
                        <th className="px-3 py-2 text-right font-semibold">Value</th>
                        <th className="hidden px-3 py-2 sm:table-cell font-semibold">Ref. Range</th>
                        <th className="px-3 py-2 text-right font-semibold">Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((t, i) => {
                        const flag = FLAG_STYLES[t.flag] ?? FLAG_STYLES.normal;
                        const Icon = flag.icon;
                        return (
                          <tr key={t.name} className={cn("border-t border-[#E7E5E4]", i === 0 && "border-t-0")}>
                            <td className="px-3 py-2 font-medium text-stone-800">{t.name}</td>
                            <td className="px-3 py-2 text-right font-semibold text-stone-800">
                              {t.value}<span className="ml-1 text-[0.7rem] font-normal text-stone-400">{t.unit}</span>
                            </td>
                            <td className="hidden px-3 py-2 text-stone-500 sm:table-cell">{t.refRange}</td>
                            <td className="px-3 py-2 text-right">
                              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold", flag.bg, flag.text)}>
                                <Icon className="h-3 w-3" />
                                {flag.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Understanding your report — static reading tips */}
          <div className="mt-6 rounded-2xl border border-[#E7E5E4] bg-white p-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
              <Info className="h-3.5 w-3.5 text-[#A16207]" />
              Understanding your report
            </h3>
            <ul className="mt-2.5 space-y-2 text-xs leading-snug text-stone-600">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A16207]" />
                Read each value against its printed reference range — normal ranges vary slightly between labs.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9962E]" />
                Note whether the test was fasting or non-fasting — sugar and lipid values shift after food.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9DB89E]" />
                One abnormal reading isn&apos;t a verdict — doctors usually repeat the test before drawing conclusions.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0EA5E9]" />
                Share the full report with your doctor — this screen helps you read it, not diagnose it.
              </li>
            </ul>
          </div>

          {/* AI Interpretation */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <Sparkles className="h-3.5 w-3.5 text-[#9DB89E]" />
                Nexa AI Interpretation
                {source && (
                  <span className="rounded-full bg-[#9DB89E]/15 px-2 py-0.5 text-[0.6rem] font-medium uppercase text-[#5E8A60]">
                    {source === "cache" ? "Cached" : source === "llm" ? "GLM-4-Plus" : "Rule-based"}
                  </span>
                )}
              </h3>
              {!interpretation && (
                <button
                  onClick={generateAI}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#A16207] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#8A5A04] active:scale-95 disabled:opacity-60"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {generating ? "Generating…" : "Generate"}
                </button>
              )}
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-[#E7E5E4] bg-[#FAF7F2] p-4">
              <AnimatePresence mode="wait">
                {interpretation ? (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="prose prose-sm prose-stone max-w-none prose-headings:font-display prose-headings:text-stone-800 prose-strong:text-stone-800 prose-li:text-stone-700"
                  >
                    <ReactMarkdown>{interpretation}</ReactMarkdown>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-2 py-6 text-center"
                  >
                    <Sparkles className="h-7 w-7 text-[#9DB89E]" />
                    <p className="text-sm font-medium text-stone-700">AI interpretation not generated yet</p>
                    <p className="max-w-xs text-xs text-stone-500">
                      Click Generate to analyze lab values via GLM-4-Plus. Always consult your physician before acting on AI insights.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer details */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E7E5E4] bg-white p-3 text-xs">
              <div className="flex items-center gap-1.5 text-stone-500">
                <MapPin className="h-3 w-3" /> Collection address
              </div>
              <p className="mt-1 font-medium text-stone-700">{booking.address}</p>
              <p className="text-stone-500">{booking.city} · {booking.pincode}</p>
            </div>
            {booking.phlebotomistPhone && (
              <div className="rounded-2xl border border-[#E7E5E4] bg-white p-3 text-xs">
                <div className="flex items-center gap-1.5 text-stone-500">
                  <Phone className="h-3 w-3" /> Phlebotomist contact
                </div>
                <p className="mt-1 font-medium text-stone-700">{booking.phlebotomistName}</p>
                <p className="text-stone-500">{booking.phlebotomistPhone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 border-t border-[#E7E5E4] bg-[#FAF7F2] p-4">
          <div className="flex items-center gap-2 text-[0.7rem] text-stone-500">
            <XCircle className="h-3 w-3 text-stone-400" />
            AI output is informational only — not a diagnosis
          </div>
          <button
            onClick={() => {
              toast.success("Report downloaded (demo)");
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition-all hover:bg-[#FAF7F2]"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoChip({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 p-2 backdrop-blur">
      <div className="flex items-center gap-1 text-[0.65rem] uppercase tracking-wider text-white/75">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
