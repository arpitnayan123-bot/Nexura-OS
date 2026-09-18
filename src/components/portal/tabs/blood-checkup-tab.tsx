"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Droplet,
  Calendar,
  Clock,
  MapPin,
  Star,
  Phone,
  FileText,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Truck,
  FlaskRound,
  Microscope,
  X,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardData, BloodBooking, TestPanel } from "../portal-types";

// Default test-panel catalog (matches API)
const DEFAULT_PANELS: TestPanel[] = [
  {
    code: "FULL_BODY",
    name: "Full Body Checkup",
    price: 2999,
    tests: "CBC, LFT, KFT, Lipid, Thyroid, HbA1c, Vitamins",
    icon: "🩺",
    popular: true,
    estTime: "24 hrs",
  },
  {
    code: "DIABETES",
    name: "Diabetes Panel",
    price: 499,
    tests: "FBS, PPBS, HbA1c, eAG, RBS",
    icon: "🩸",
    popular: true,
    estTime: "12 hrs",
  },
  {
    code: "THYROID",
    name: "Thyroid Profile",
    price: 399,
    tests: "TSH, Free T3, Free T4",
    icon: "🦋",
    popular: false,
    estTime: "12 hrs",
  },
  {
    code: "CBC",
    name: "Complete Blood Count",
    price: 199,
    tests: "Hemogram, RBC, WBC, Platelets",
    icon: "🧫",
    popular: false,
    estTime: "6 hrs",
  },
  {
    code: "LIPID",
    name: "Lipid Profile",
    price: 349,
    tests: "Total Chol, HDL, LDL, Triglycerides, VLDL",
    icon: "❤️",
    popular: true,
    estTime: "12 hrs",
  },
  {
    code: "LIVER",
    name: "Liver Function Test",
    price: 449,
    tests: "Bilirubin, ALT, AST, ALP, Protein",
    icon: "🫀",
    popular: false,
    estTime: "12 hrs",
  },
  {
    code: "KIDNEY",
    name: "Kidney Function Test",
    price: 449,
    tests: "Urea, Creatinine, Uric Acid, eGFR",
    icon: "🫘",
    popular: false,
    estTime: "12 hrs",
  },
  {
    code: "VITAMIN",
    name: "Vitamin Profile",
    price: 899,
    tests: "Vitamin D, B12, Folate, Iron Studies",
    icon: "💊",
    popular: true,
    estTime: "24 hrs",
  },
];

const STATUS_STEPS = [
  { key: "booked", label: "Booked", icon: CheckCircle2 },
  { key: "assigned", label: "Assigned", icon: Star },
  { key: "en_route", label: "En Route", icon: Truck },
  { key: "sample_collected", label: "Collected", icon: FlaskRound },
  { key: "in_lab", label: "At Lab", icon: Microscope },
  { key: "report_ready", label: "Report Ready", icon: FileText },
];

// Map raw booking.status to step index for the tracker
function statusToStepIdx(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  if (idx >= 0) return idx;
  // map aliases
  if (status === "report_ready") return 5;
  if (status === "in_lab") return 4;
  if (status === "sample_collected") return 3;
  if (status === "assigned") return 1;
  if (status === "booked") return 0;
  return 0;
}

type Props = {
  data: DashboardData;
  onBookTest: (panel?: TestPanel) => void;
  onViewReport: (b: BloodBooking) => void;
};

export function BloodCheckupTab({ data, onBookTest, onViewReport }: Props) {
  const [filter, setFilter] = useState<"active" | "completed" | "cancelled">("active");
  const bookings = data.bloodBookings ?? [];

  const grouped = useMemo(() => {
    return {
      active: bookings.filter((b) => b.status !== "report_ready" && b.status !== "cancelled"),
      completed: bookings.filter((b) => b.status === "report_ready"),
      cancelled: bookings.filter((b) => b.status === "cancelled"),
    };
  }, [bookings]);

  const shown = grouped[filter];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-[#E7E5E4] bg-gradient-to-br from-[#8F5E06] via-[#A16207] to-[#B8860B] p-6 text-white sm:p-7"
      >
        <div
          aria-hidden
          className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl"
          style={{ animation: "nexura-breathe 7s ease-in-out infinite" }}
        />
        <div className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur">
            <Droplet className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold leading-none">
              Blood Checkup at Home
            </h1>
            <p className="mt-1 text-sm text-white/85">
              A phlebotomist visits your home · Reports in 6–24 hours by panel
            </p>
          </div>
        </div>
        <button
          onClick={() => onBookTest()}
          className="group relative mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#8A5A04] shadow-lg transition-all hover:-translate-y-0.5 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Book New Test
        </button>
      </motion.div>

      {/* Active bookings + tracker */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-stone-800">Your bookings</h2>
          {/* Filter chips */}
          <div className="flex gap-1.5">
            {(
              [
                { k: "active", label: `Active (${grouped.active.length})` },
                { k: "completed", label: `Done (${grouped.completed.length})` },
                { k: "cancelled", label: `Cancelled (${grouped.cancelled.length})` },
              ] as const
            ).map((f) => (
              <button
                key={f.k}
                onClick={() => setFilter(f.k)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[0.7rem] font-semibold transition-all",
                  filter === f.k
                    ? "bg-[#A16207] text-white"
                    : "border border-[#E7E5E4] bg-white text-stone-500 hover:bg-[#FAF7F2]",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-3xl border border-[#E7E5E4] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#A16207]/10 text-[#A16207]">
              <Droplet className="h-7 w-7" />
            </div>
            <p className="mt-3 font-display text-lg font-semibold text-stone-800">
              No {filter} bookings
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {filter === "active"
                ? "Book your first at-home blood test."
                : `No ${filter} bookings to show.`}
            </p>
            {filter === "active" && (
              <button
                onClick={() => onBookTest()}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#A16207] px-4 py-2 text-sm font-semibold text-white hover:bg-[#8A5A04]"
              >
                <Plus className="h-4 w-4" /> Book now
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {shown.map((b, i) => (
              <BookingCard
                key={b.id}
                booking={b}
                delay={i * 0.05}
                onViewReport={() => onViewReport(b)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Test panel catalog */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-stone-800">
          <Sparkles className="h-5 w-5 text-[#9DB89E]" />
          Available test panels
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DEFAULT_PANELS.map((p, i) => (
            <motion.button
              key={p.code}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onBookTest(p)}
              className="group relative overflow-hidden rounded-3xl border border-[#E7E5E4] bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_oklch(0.4_0.05_45/0.15)] active:scale-[0.98]"
            >
              {p.popular && (
                <span className="absolute right-3 top-3 rounded-full bg-[#9DB89E]/15 px-2 py-0.5 text-[0.6rem] font-semibold text-[#5E8A60]">
                  Popular
                </span>
              )}
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FAF7F2] text-2xl">
                {p.icon}
              </span>
              <p className="mt-3 font-display text-base font-semibold text-stone-800">{p.name}</p>
              <p className="mt-1 line-clamp-2 text-[0.7rem] leading-snug text-stone-500">
                {p.tests}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-display text-xl font-semibold text-[#A16207]">
                  ₹{p.price}
                </span>
                <span className="text-[0.65rem] text-stone-400">~{p.estTime}</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#A16207] opacity-0 transition-opacity group-hover:opacity-100">
                Book now <ChevronRight className="h-3 w-3" />
              </div>
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}

function BookingCard({
  booking,
  delay,
  onViewReport,
}: {
  booking: BloodBooking;
  delay: number;
  onViewReport: () => void;
}) {
  const isCancelled = booking.status === "cancelled";
  const isReportReady = booking.status === "report_ready";
  const stepIdx = isCancelled ? 0 : isReportReady ? 5 : statusToStepIdx(booking.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "overflow-hidden rounded-3xl border bg-white shadow-sm",
        isCancelled ? "border-stone-200 opacity-80" : "border-[#E7E5E4]",
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E7E5E4] p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display text-base font-semibold text-stone-800">
              {booking.testPanelName}
            </p>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-0.5 text-[0.7rem] text-stone-400">{booking.bookingRef}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-[#A16207]" />
              {new Date(booking.scheduledDate).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-[#A16207]" />
              {booking.timeSlot}
            </span>
            <span className="font-semibold text-[#A16207]">₹{booking.price}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[0.7rem] text-stone-400">Phlebotomist</p>
          <p className="text-sm font-semibold text-stone-800">
            {booking.phlebotomistName ?? "Auto-assigned"}
          </p>
          {booking.phlebotomistPhone && (
            <p className="mt-0.5 flex items-center justify-end gap-1 text-[0.7rem] text-stone-500">
              <Phone className="h-3 w-3" />
              {booking.phlebotomistPhone}
            </p>
          )}
        </div>
      </div>

      {/* Status tracker (6 steps) */}
      {!isCancelled && (
        <div className="border-b border-[#E7E5E4] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-1">
            {STATUS_STEPS.map((s, i) => {
              const done = i <= stepIdx;
              const current = i === stepIdx;
              return (
                <div key={s.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full items-center">
                    {i > 0 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1",
                          i <= stepIdx ? "bg-[#A16207]" : "bg-stone-200",
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-all",
                        done
                          ? "border-[#A16207] bg-[#A16207] text-white"
                          : "border-stone-200 bg-white text-stone-300",
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <s.icon className="h-3.5 w-3.5" />
                      )}
                      {current && (
                        <span
                          className="absolute h-7 w-7 rounded-full border-2 border-[#A16207]/40"
                          style={{ animation: "nexura-breathe 2s ease-in-out infinite" }}
                        />
                      )}
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1",
                          i < stepIdx ? "bg-[#A16207]" : "bg-stone-200",
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-center text-[0.55rem] font-medium leading-tight sm:text-[0.65rem]",
                      done ? "text-stone-700" : "text-stone-400",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 sm:p-5">
        <div className="flex items-center gap-1.5 text-[0.7rem] text-stone-500">
          <MapPin className="h-3 w-3 text-[#9DB89E]" />
          {booking.address}, {booking.city}
        </div>
        <div className="flex gap-2">
          {isCancelled && booking.cancellationReason && (
            <span className="rounded-full bg-stone-100 px-3 py-1.5 text-[0.7rem] text-stone-500">
              {booking.cancellationReason}
            </span>
          )}
          {isReportReady && (
            <button
              onClick={onViewReport}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#A16207] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#8A5A04] active:scale-95"
            >
              <FileText className="h-3.5 w-3.5" />
              View Report
            </button>
          )}
          {!isReportReady && !isCancelled && (
            <button
              onClick={() => onViewReport()}
              disabled
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-400"
            >
              <Loader2 className="h-3.5 w-3.5" />
              In progress
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    booked: { bg: "bg-[#9DB89E]/15", text: "text-[#5E8A60]", label: "Booked" },
    assigned: { bg: "bg-[#9DB89E]/15", text: "text-[#5E8A60]", label: "Assigned" },
    en_route: { bg: "bg-[#C9962E]/20", text: "text-[#A87C45]", label: "En route" },
    sample_collected: { bg: "bg-[#C9962E]/20", text: "text-[#A87C45]", label: "Sample collected" },
    in_lab: { bg: "bg-[#0EA5E9]/15", text: "text-[#0284C7]", label: "At lab" },
    report_ready: { bg: "bg-[#9DB89E]/15", text: "text-[#5E8A60]", label: "Report ready" },
    cancelled: { bg: "bg-stone-100", text: "text-stone-500", label: "Cancelled" },
  };
  const s = styles[status] ?? styles.booked;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[0.6rem] font-semibold capitalize",
        s.bg,
        s.text,
      )}
    >
      {s.label}
    </span>
  );
}

// Avoid unused warning
void X;
