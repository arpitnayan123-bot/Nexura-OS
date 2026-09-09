// @ts-nocheck
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Droplet, FileStack, CalendarClock, Users,
  HeartPulse, LogOut, Bell, ChevronDown, Loader2, AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OverviewTab } from "./tabs/overview-tab";
import { BloodCheckupTab } from "./tabs/blood-checkup-tab";
import { RecordsTab } from "./tabs/records-tab";
import { TimelineTab } from "./tabs/timeline-tab";
import { FamilyTab } from "./tabs/family-tab";
import { BookingModal, type TestPanel } from "./booking-modal";
import { ReportModal, type BloodBooking } from "./report-modal";

type TabId = "overview" | "blood" | "records" | "timeline" | "family";

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "blood", label: "Blood Checkup", icon: Droplet },
  { id: "records", label: "Records", icon: FileStack },
  { id: "timeline", label: "Timeline", icon: CalendarClock },
  { id: "family", label: "Family", icon: Users },
];

type PortalUser = {
  id: string;
  phone: string;
  fullName: string;
  bloodGroup?: string | null;
  abhaId?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  hospitalPatientUhid?: string | null;
  dob?: string | null;
  gender?: string | null;
};

type DashboardData = {
  user: PortalUser;
  hospitalPatient: unknown;
  stats: Record<string, number>;
  appointments: unknown[];
  admissions: unknown[];
  vitals: unknown[];
  bills: unknown[];
  insurance: unknown[];
  labReports: unknown[];
  orders: unknown[];
  bloodBookings: BloodBooking[];
  familyMembers: unknown[];
  timeline: TimelineEvent[];
  aiInsights: Array<{ severity: string; title: string; description: string; icon: string }>;
  fetchedAt: string;
};

type TimelineEvent = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  date: string;
  meta?: Record<string, unknown>;
};

export function PortalApp() {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingPanel, setBookingPanel] = useState<TestPanel | null>(null);
  const [reportBooking, setReportBooking] = useState<BloodBooking | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/portal/auth", { method: "DELETE" });
    toast.success("Logged out");
    router.replace("/portal/login");
  };

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch("/api/portal/dashboard", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load dashboard");
      setData(d);
      setUser(d.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Auth check + initial fetch
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/portal/auth", { cache: "no-store" });
        const d = await res.json();
        if (!d?.user) {
          router.replace("/portal/login");
          return;
        }
        setUser(d.user);
        setAuthChecked(true);
        await fetchDashboard();
      } catch {
        router.replace("/portal/login");
      }
    })();
  }, [router, fetchDashboard]);

  // 60s auto-refresh
  useEffect(() => {
    if (!authChecked) return;
    const id = setInterval(() => fetchDashboard(true), 60_000);
    return () => clearInterval(id);
  }, [authChecked, fetchDashboard]);

  if (!authChecked) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#FAF7F2]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#D98B6E]" />
          <p className="text-sm text-stone-500">Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#FAF7F2] px-4">
        <div className="max-w-md rounded-3xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#D98B6E]/15 text-[#D98B6E]">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold text-stone-800">
            Couldn&apos;t load your dashboard
          </h2>
          <p className="mt-1 text-sm text-stone-500">{error}</p>
          <button
            onClick={() => fetchDashboard()}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#D98B6E] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#C97759] active:scale-95"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Ambient warm blobs (subtle) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full"
          style={{ background: "radial-gradient(circle, oklch(0.85 0.10 45 / 0.25), transparent 70%)" }}
          animate={{ x: [0, -20, 10, 0], y: [0, 20, -10, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 -left-40 h-[24rem] w-[24rem] rounded-full"
          style={{ background: "radial-gradient(circle, oklch(0.86 0.07 155 / 0.18), transparent 70%)" }}
          animate={{ x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[#E7E5E4] bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#D98B6E] to-[#9DB89E] text-white shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </span>
            <div className="hidden sm:block">
              <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-stone-400">Nexura</p>
              <p className="font-display text-base font-semibold leading-none text-stone-800">Patient Portal</p>
            </div>
          </div>

          {/* Greeting */}
          <div className="ml-1 flex-1">
            <p className="text-sm text-stone-500">Namaste,</p>
            <p className="font-display text-lg font-semibold leading-none text-stone-800">
              {user?.fullName?.split(" ")[0] ?? "Patient"} 🙏
            </p>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDashboard(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-[#E7E5E4] bg-white text-stone-500 transition-all hover:bg-[#FAF7F2] active:scale-95"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              className="relative grid h-9 w-9 place-items-center rounded-xl border border-[#E7E5E4] bg-white text-stone-500 transition-all hover:bg-[#FAF7F2] active:scale-95"
              aria-label="Notifications"
              onClick={() => toast.info("No new notifications")}
            >
              <Bell className="h-4 w-4" />
              {data?.aiInsights && data.aiInsights.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#D98B6E]" />
              )}
            </button>
            <button
              onClick={logout}
              className="hidden items-center gap-1.5 rounded-xl border border-[#E7E5E4] bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition-all hover:bg-[#FAF7F2] active:scale-95 sm:flex"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Layout: left rail (desktop) + main content */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Left rail — desktop */}
        <nav className="sticky top-[72px] hidden h-fit w-56 shrink-0 md:block">
          <div className="rounded-3xl border border-[#E7E5E4] bg-white p-2 shadow-sm">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-gradient-to-r from-[#D98B6E] to-[#C97759] text-white shadow-[0_6px_20px_-8px_oklch(0.65_0.13_45/0.5)]"
                      : "text-stone-600 hover:bg-[#FAF7F2]"
                  )}
                >
                  <t.icon className={cn("h-4 w-4", active ? "text-white" : "text-stone-400 group-hover:text-[#D98B6E]")} />
                  {t.label}
                  {active && (
                    <motion.span layoutId="tab-indicator" className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </button>
              );
            })}
          </div>

          {/* ABHA / profile mini-card */}
          {user && (
            <div className="mt-3 rounded-3xl border border-[#E7E5E4] bg-white p-3 shadow-sm">
              <p className="text-[0.65rem] font-medium uppercase tracking-wider text-stone-400">ABHA ID</p>
              <p className="mt-0.5 text-sm font-semibold text-stone-800">{user.abhaId ?? "—"}</p>
              <div className="mt-2 flex items-center gap-1.5 text-[0.7rem]">
                <span className="rounded-full bg-[#D98B6E]/10 px-2 py-0.5 font-semibold text-[#D98B6E]">
                  {user.bloodGroup ?? "?"}
                </span>
                <span className="rounded-full bg-[#9DB89E]/15 px-2 py-0.5 font-semibold text-[#5E8A60]">ABDM linked</span>
              </div>
            </div>
          )}
        </nav>

        {/* Main content */}
        <main className="min-w-0 flex-1 pb-24 md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              {loading ? (
                <DashboardSkeleton />
              ) : !data ? (
                <ErrorState message={error ?? "No data"} onRetry={() => fetchDashboard()} />
              ) : tab === "overview" ? (
                <OverviewTab
                  data={data}
                  onBookTest={() => {
                    setBookingPanel(null);
                    setBookingOpen(true);
                  }}
                  onViewReport={(b) => {
                    setReportBooking(b);
                    setReportOpen(true);
                  }}
                  onGoToBlood={() => setTab("blood")}
                />
              ) : tab === "blood" ? (
                <BloodCheckupTab
                  data={data}
                  onBookTest={(panel) => {
                    setBookingPanel(panel ?? null);
                    setBookingOpen(true);
                  }}
                  onViewReport={(b) => {
                    setReportBooking(b);
                    setReportOpen(true);
                  }}
                />
              ) : tab === "records" ? (
                <RecordsTab data={data} />
              ) : tab === "timeline" ? (
                <TimelineTab data={data} />
              ) : (
                <FamilyTab data={data} onChanged={() => fetchDashboard(true)} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E7E5E4] bg-white/85 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-0.5 px-1 py-2 pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.65rem] font-medium transition-all",
                  active ? "text-[#D98B6E]" : "text-stone-400"
                )}
              >
                <t.icon className={cn("h-5 w-5", active && "scale-110")} />
                <span className="hidden xs:block">{t.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals */}
      <BookingModal
        open={bookingOpen}
        panel={bookingPanel}
        defaultAddress={user?.address ?? ""}
        defaultCity={user?.city ?? ""}
        defaultPincode={user?.pincode ?? ""}
        onOpenChange={setBookingOpen}
        onCreated={() => fetchDashboard(true)}
      />
      <ReportModal
        open={reportOpen}
        booking={reportBooking}
        onOpenChange={setReportOpen}
        onChanged={() => fetchDashboard(true)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-48 animate-pulse rounded-3xl bg-stone-100" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-100" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-3xl bg-stone-100 lg:col-span-2" />
        <div className="h-64 animate-pulse rounded-3xl bg-stone-100" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-[#E7E5E4] bg-white p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#D98B6E]/15 text-[#D98B6E]">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-display text-lg font-semibold text-stone-800">Something went wrong</h2>
      <p className="mt-1 text-sm text-stone-500">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#D98B6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C97759]"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}

// avoid unused warnings during refactor
void ChevronDown;
