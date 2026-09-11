"use client";

import { motion } from "framer-motion";
import {
  CalendarDays, FlaskConical, Receipt, ShieldCheck, Activity, Droplet,
  ArrowRight, Sparkles, AlertTriangle, Info, Heart, TrendingUp, Clock, Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardData, BloodBooking } from "../portal-types";

const INSIGHT_ICON: Record<string, typeof AlertTriangle> = {
  "alert-triangle": AlertTriangle,
  "flask-conical": FlaskConical,
  drop: Droplet,
  activity: Activity,
  receipt: Receipt,
  "shield-check": ShieldCheck,
};

const INSIGHT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  alert: { bg: "bg-[#D98B6E]/8", text: "text-[#B85A3F]", border: "border-[#D98B6E]/30" },
  warning: { bg: "bg-[#E0B080]/12", text: "text-[#A87C45]", border: "border-[#E0B080]/30" },
  info: { bg: "bg-[#9DB89E]/12", text: "text-[#5E8A60]", border: "border-[#9DB89E]/30" },
};

type Props = {
  data: DashboardData;
  onBookTest: () => void;
  onViewReport: (b: BloodBooking) => void;
  onGoToBlood: () => void;
};

export function OverviewTab({ data, onBookTest, onViewReport, onGoToBlood }: Props) {
  const stats = data.stats ?? {};
  const upcoming = data.appointments.filter((a) => new Date(a.date) >= new Date() && a.status === "scheduled").slice(0, 3);
  const activeBlood = data.bloodBookings.filter((b) => b.status === "booked" || b.status === "assigned" || b.status === "en_route" || b.status === "sample_collected" || b.status === "in_lab");
  const recentTimeline = data.timeline.slice(0, 5);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-[#E7E5E4] bg-gradient-to-br from-[#D98B6E] via-[#C97759] to-[#9DB89E] p-6 text-white shadow-[0_8px_32px_-12px_oklch(0.5_0.10_45/0.4)] sm:p-8"
      >
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/10"
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        </div>
        <div className="relative">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/85">
            <Heart className="h-3.5 w-3.5" />
            {greeting}
          </div>
          <h1 className="mt-1.5 font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {data.user.fullName?.split(" ")[0] ?? "Patient"} 🙏
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/90">
            Your unified health view — hospital visits, blood tests at home, and health insights, all in one calm place.
          </p>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatChip label="Appointments" value={stats.totalAppointments ?? 0} icon={CalendarDays} />
            <StatChip label="Lab reports" value={stats.totalLabReports ?? 0} icon={FlaskConical} />
            <StatChip label="Bills" value={stats.totalBills ?? 0} icon={Receipt} />
            <StatChip label="Blood tests" value={stats.totalBloodTests ?? 0} icon={Droplet} />
          </div>

          {/* CTA */}
          <button
            onClick={onBookTest}
            className="group mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#C97759] shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
          >
            <Droplet className="h-4 w-4" />
            Book Blood Test at Home
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </motion.div>

      {/* AI Insights */}
      {data.aiInsights && data.aiInsights.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <Sparkles className="h-3.5 w-3.5 text-[#9DB89E]" />
            Health Insights
            <span className="rounded-full bg-[#9DB89E]/15 px-1.5 py-0.5 text-[0.6rem] font-medium text-[#5E8A60]">
              {data.aiInsights.length}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.aiInsights.map((ins, i) => {
              const Icon = INSIGHT_ICON[ins.icon] ?? Info;
              const style = INSIGHT_STYLES[ins.severity] ?? INSIGHT_STYLES.info;
              return (
                <motion.div
                  key={ins.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
                  className={cn("rounded-2xl border bg-white p-4", style.border)}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl", style.bg)}>
                      <Icon className={cn("h-4 w-4", style.text)} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-800">{ins.title}</p>
                      <p className="mt-1 text-xs leading-snug text-stone-600">{ins.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Two-column grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Care Timeline */}
        <section className="lg:col-span-2">
          <div className="rounded-3xl border border-[#E7E5E4] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-stone-800">Care Timeline</h2>
              <span className="text-[0.7rem] font-medium uppercase tracking-wider text-stone-400">
                Recent events
              </span>
            </div>

            {recentTimeline.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No care events yet"
                desc="Your appointments, lab reports and visits will appear here chronologically."
              />
            ) : (
              <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-stone-200">
                {recentTimeline.map((e, i) => (
                  <motion.li
                    key={`${e.id}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className="relative flex gap-3 pl-0"
                  >
                    <TimelineDot type={e.type} />
                    <div className="flex-1 rounded-2xl bg-[#FAF7F2] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-stone-800">{e.title}</p>
                        <span className="shrink-0 text-[0.7rem] text-stone-400">
                          {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">{e.subtitle}</p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            )}
          </div>
        </section>

        {/* Right column */}
        <div className="space-y-5">
          {/* Upcoming appointments */}
          <section className="rounded-3xl border border-[#E7E5E4] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                <Stethoscope className="h-4 w-4 text-[#D98B6E]" />
                Upcoming visits
              </h2>
              <span className="rounded-full bg-[#D98B6E]/10 px-2 py-0.5 text-[0.65rem] font-semibold text-[#D98B6E]">
                {stats.upcomingAppointments ?? 0}
              </span>
            </div>
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming visits" desc="Schedule your next check-up via the clinic portal." compact />
            ) : (
              <div className="space-y-2">
                {upcoming.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-[#E7E5E4] bg-[#FAF7F2] p-3">
                    <p className="text-sm font-semibold text-stone-800">Dr. {a.doctor?.name ?? "—"}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(a.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {a.timeSlot}
                    </p>
                    {a.chiefComplaint && (
                      <p className="mt-0.5 text-[0.7rem] text-stone-400">For: {a.chiefComplaint}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active blood tests */}
          <section className="rounded-3xl border border-[#E7E5E4] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                <Droplet className="h-4 w-4 text-[#D98B6E]" />
                Active blood tests
              </h2>
              <button
                onClick={onGoToBlood}
                className="text-[0.65rem] font-semibold uppercase tracking-wider text-[#D98B6E] hover:underline"
              >
                View all →
              </button>
            </div>
            {activeBlood.length === 0 ? (
              <EmptyState icon={Droplet} title="No active bookings" desc="Book a phlebotomist visit at home." compact />
            ) : (
              <div className="space-y-2">
                {activeBlood.slice(0, 2).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onViewReport(b)}
                    className="block w-full rounded-2xl border border-[#E7E5E4] bg-[#FAF7F2] p-3 text-left transition-all hover:bg-[#F2EEE7]"
                  >
                    <p className="text-sm font-semibold text-stone-800">{b.testPanelName}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
                      <Clock className="h-3 w-3" />
                      {new Date(b.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {b.timeSlot}
                    </p>
                    <span className="mt-1.5 inline-block rounded-full bg-[#E0B080]/20 px-2 py-0.5 text-[0.6rem] font-semibold text-[#A87C45] capitalize">
                      {b.status.replace("_", " ")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Health summary */}
      <section className="rounded-3xl border border-[#E7E5E4] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-stone-800">
            <TrendingUp className="h-5 w-5 text-[#9DB89E]" />
            Health Summary
          </h2>
          <span className="rounded-full bg-[#9DB89E]/15 px-2 py-0.5 text-[0.65rem] font-semibold text-[#5E8A60]">
            Snapshot
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Blood Group" value={data.user.bloodGroup ?? "—"} icon={Droplet} />
          <SummaryCard label="Total visits" value={String(stats.totalAppointments ?? 0)} icon={Stethoscope} />
          <SummaryCard label="Active insurance" value={String(stats.activeInsurance ?? 0)} icon={ShieldCheck} />
          <SummaryCard label="Family members" value={String(stats.familyMembers ?? 0)} icon={Activity} />
        </div>
      </section>
    </div>
  );
}

function StatChip({ label, value, icon: Icon }: { label: string; value: number; icon: typeof CalendarDays }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
      <Icon className="h-4 w-4 text-white/85" />
      <p className="mt-1.5 font-display text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[0.7rem] text-white/80">{label}</p>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof CalendarDays }) {
  return (
    <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF7F2] p-4">
      <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-stone-500">
        <Icon className="h-3 w-3 text-[#D98B6E]" />
        {label}
      </div>
      <p className="mt-1.5 font-display text-2xl font-semibold text-stone-800">{value}</p>
    </div>
  );
}

function TimelineDot({ type }: { type: string }) {
  const colors: Record<string, string> = {
    appointment: "bg-[#D98B6E]",
    admission: "bg-[#B85A3F]",
    vital: "bg-[#9DB89E]",
    bill: "bg-[#E0B080]",
    insurance: "bg-[#0EA5E9]",
    lab: "bg-[#A87C45]",
    blood_booking: "bg-[#D98B6E]",
  };
  return (
    <span className="relative z-10 mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-white">
      <span className={cn("h-3 w-3 rounded-full", colors[type] ?? "bg-stone-400")} />
    </span>
  );
}

function EmptyState({
  icon: Icon, title, desc, compact,
}: { icon: typeof Clock; title: string; desc: string; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "py-6" : "py-10")}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#FAF7F2] text-stone-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-2 text-sm font-semibold text-stone-700">{title}</p>
      <p className="mt-0.5 max-w-xs text-xs text-stone-500">{desc}</p>
    </div>
  );
}
