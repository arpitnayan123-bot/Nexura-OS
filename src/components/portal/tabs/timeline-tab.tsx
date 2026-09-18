"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Stethoscope,
  IndianRupee,
  ShieldCheck,
  Activity,
  Beaker,
  Droplet,
  CalendarClock,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardData, TimelineEvent } from "../portal-types";

const TYPE_META: Record<
  string,
  { color: string; bg: string; ring: string; icon: typeof CalendarClock }
> = {
  appointment: {
    color: "text-[#A16207]",
    bg: "bg-[#A16207]/10",
    ring: "ring-[#A16207]/20",
    icon: Stethoscope,
  },
  admission: {
    color: "text-[#B85A3F]",
    bg: "bg-[#B85A3F]/10",
    ring: "ring-[#B85A3F]/20",
    icon: Activity,
  },
  vital: {
    color: "text-[#5E8A60]",
    bg: "bg-[#9DB89E]/15",
    ring: "ring-[#9DB89E]/30",
    icon: Activity,
  },
  bill: {
    color: "text-[#A87C45]",
    bg: "bg-[#C9962E]/15",
    ring: "ring-[#C9962E]/30",
    icon: IndianRupee,
  },
  insurance: {
    color: "text-[#0284C7]",
    bg: "bg-[#0EA5E9]/10",
    ring: "ring-[#0EA5E9]/20",
    icon: ShieldCheck,
  },
  lab: { color: "text-[#A87C45]", bg: "bg-[#C9962E]/15", ring: "ring-[#C9962E]/30", icon: Beaker },
  blood_booking: {
    color: "text-[#A16207]",
    bg: "bg-[#A16207]/10",
    ring: "ring-[#A16207]/20",
    icon: Droplet,
  },
};

export function TimelineTab({ data }: { data: DashboardData }) {
  // Group by month
  const grouped = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {};
    for (const e of data.timeline) {
      const d = new Date(e.date);
      const key = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      (map[key] ||= []).push(e);
    }
    return Object.entries(map);
  }, [data.timeline]);

  // AI summary
  const aiSummary = useMemo(() => buildAISummary(data.timeline), [data.timeline]);

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
            <CalendarClock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold text-stone-800">Care Timeline</h1>
            <p className="text-sm text-stone-500">Chronological view of all your health events.</p>
          </div>
        </div>
      </motion.div>

      {/* AI summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border border-[#9DB89E]/30 bg-gradient-to-br from-[#9DB89E]/8 to-[#A16207]/5 p-5 shadow-sm sm:p-6"
      >
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          <Sparkles className="h-3.5 w-3.5 text-[#9DB89E]" />
          Timeline Summary
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-700">{aiSummary}</p>
        <p className="mt-2 flex items-center gap-1 text-[0.7rem] text-stone-400">
          <AlertCircle className="h-3 w-3" />
          Auto-generated summary · Not a diagnosis · Always consult your physician
        </p>
      </motion.div>

      {/* Timeline grouped by month */}
      {grouped.length === 0 ? (
        <div className="rounded-3xl border border-[#E7E5E4] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#9DB89E]/15 text-[#9DB89E]">
            <CalendarClock className="h-7 w-7" />
          </div>
          <p className="mt-3 font-display text-lg font-semibold text-stone-800">
            No care events yet
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Your appointments, lab reports, and visits will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([month, events]) => (
            <section key={month}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="font-display text-base font-semibold text-stone-700">{month}</h3>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[0.65rem] font-semibold text-stone-500">
                  {events.length} event{events.length > 1 ? "s" : ""}
                </span>
              </div>
              <ol className="relative space-y-3 before:absolute before:left-[19px] before:top-3 before:h-[calc(100%-1.5rem)] before:w-px before:bg-stone-200">
                {events.map((e, i) => (
                  <TimelineItem key={`${e.id}-${i}`} event={e} delay={i * 0.04} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineItem({ event, delay }: { event: TimelineEvent; delay: number }) {
  const meta = TYPE_META[event.type] ?? TYPE_META.bill;
  const Icon = meta.icon;
  const date = new Date(event.date);

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="relative flex gap-3"
    >
      <span
        className={cn(
          "relative z-10 mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full ring-4 ring-white",
          meta.bg,
        )}
      >
        <Icon className={cn("h-5 w-5", meta.color)} />
      </span>
      <div className="flex-1 rounded-2xl border border-[#E7E5E4] bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-stone-800">{event.title}</p>
          <span className="shrink-0 text-[0.7rem] text-stone-400">
            {date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·{" "}
            {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-stone-500">{event.subtitle}</p>
        {event.meta && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(event.meta)
              .slice(0, 4)
              .map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-full bg-[#FAF7F2] px-2 py-0.5 text-[0.65rem] text-stone-500"
                >
                  <span className="font-medium">{k}:</span> {String(v ?? "—")}
                </span>
              ))}
          </div>
        )}
      </div>
    </motion.li>
  );
}

function buildAISummary(events: TimelineEvent[]): string {
  if (events.length === 0)
    return "No care events recorded yet. Once your visits and tests accumulate, this AI summary will provide a calm overview of your journey.";

  const total = events.length;
  const byType: Record<string, number> = {};
  for (const e of events) byType[e.type] = (byType[e.type] ?? 0) + 1;

  const parts: string[] = [];
  parts.push(
    `Over your recorded health journey, we see ${total} care event${total > 1 ? "s" : ""}:`,
  );

  if (byType.appointment)
    parts.push(` ${byType.appointment} appointment${byType.appointment > 1 ? "s" : ""}`);
  if (byType.lab) parts.push(`, ${byType.lab} lab test${byType.lab > 1 ? "s" : ""}`);
  if (byType.bill) parts.push(`, ${byType.bill} bill${byType.bill > 1 ? "s" : ""}`);
  if (byType.insurance)
    parts.push(`, ${byType.insurance} insurance claim${byType.insurance > 1 ? "s" : ""}`);
  if (byType.blood_booking)
    parts.push(
      `, ${byType.blood_booking} at-home blood test${byType.blood_booking > 1 ? "s" : ""}`,
    );
  if (byType.admission)
    parts.push(`, ${byType.admission} hospital admission${byType.admission > 1 ? "s" : ""}`);

  const latest = events[0];
  parts.push(
    `. Your most recent event was "${latest.title}" on ${new Date(latest.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`,
  );

  // recommendation
  if (byType.blood_booking && byType.blood_booking > 0) {
    parts.push(
      " Consider scheduling a follow-up review of your blood test reports with your physician.",
    );
  } else if (total < 3) {
    parts.push(" Schedule your first at-home blood test to establish a baseline.");
  } else {
    parts.push(" Your engagement with preventive care is commendable — keep it up.");
  }

  return parts.join("");
}
