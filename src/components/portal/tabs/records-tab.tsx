"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays, FlaskConical, Receipt, ShieldCheck, Activity,
  Stethoscope, ChevronRight, FileText, IndianRupee, Beaker,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardData, TimelineEvent } from "../portal-types";

const FILTERS = [
  { id: "all", label: "All", icon: FileText },
  { id: "appointment", label: "Appointments", icon: Stethoscope },
  { id: "lab", label: "Labs", icon: Beaker },
  { id: "bill", label: "Bills", icon: Receipt },
  { id: "insurance", label: "Insurance", icon: ShieldCheck },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const TYPE_META: Record<string, { color: string; bg: string; icon: typeof CalendarDays }> = {
  appointment: { color: "text-[#A16207]", bg: "bg-[#A16207]/10", icon: Stethoscope },
  admission: { color: "text-[#B85A3F]", bg: "bg-[#B85A3F]/10", icon: Activity },
  vital: { color: "text-[#5E8A60]", bg: "bg-[#9DB89E]/15", icon: Activity },
  bill: { color: "text-[#A87C45]", bg: "bg-[#C9962E]/15", icon: IndianRupee },
  insurance: { color: "text-[#0284C7]", bg: "bg-[#0EA5E9]/10", icon: ShieldCheck },
  lab: { color: "text-[#A87C45]", bg: "bg-[#C9962E]/15", icon: Beaker },
  blood_booking: { color: "text-[#A16207]", bg: "bg-[#A16207]/10", icon: FlaskConical },
};

export function RecordsTab({ data }: { data: DashboardData }) {
  const [filter, setFilter] = useState<FilterId>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return data.timeline;
    return data.timeline.filter((e) => e.type === filter);
  }, [data.timeline, filter]);

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
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-stone-800">Unified Records</h1>
            <p className="text-sm text-stone-500">All your health records in one place — sorted by date.</p>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                  active
                    ? "bg-[#A16207] text-white shadow-sm"
                    : "border border-[#E7E5E4] bg-white text-stone-500 hover:bg-[#FAF7F2]"
                )}
              >
                <f.icon className="h-3.5 w-3.5" />
                {f.label}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.65rem]",
                  active ? "bg-white/20" : "bg-stone-100"
                )}>
                  {f.id === "all" ? data.timeline.length : data.timeline.filter((e) => e.type === f.id).length}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-[#E7E5E4] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#9DB89E]/15 text-[#9DB89E]">
            <FileText className="h-7 w-7" />
          </div>
          <p className="mt-3 font-display text-lg font-semibold text-stone-800">No records yet</p>
          <p className="mt-1 text-sm text-stone-500">No {filter === "all" ? "" : filter} records found for this patient.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e, i) => (
            <RecordRow key={`${e.id}-${i}`} event={e} delay={i * 0.04} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecordRow({ event, delay }: { event: TimelineEvent; delay: number }) {
  const meta = TYPE_META[event.type] ?? TYPE_META.bill;
  const Icon = meta.icon;
  const date = new Date(event.date);
  const isBill = event.type === "bill";
  const billAmount = isBill ? (event.meta?.total as number) ?? 0 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="group flex items-center gap-3 rounded-2xl border border-[#E7E5E4] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-4px_oklch(0.4_0.05_45/0.1)]"
    >
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", meta.bg)}>
        <Icon className={cn("h-5 w-5", meta.color)} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-stone-800">{event.title}</p>
          <span className="shrink-0 text-[0.7rem] text-stone-400">
            {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-stone-500">{event.subtitle}</p>
        {isBill && billAmount > 0 && (
          <p className="mt-1 font-display text-sm font-semibold text-[#A16207]">
            ₹{billAmount.toLocaleString("en-IN")}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5" />
    </motion.div>
  );
}

void CalendarDays;
