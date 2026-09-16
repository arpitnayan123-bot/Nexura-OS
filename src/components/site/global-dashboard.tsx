"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import { toast, Toaster } from "sonner";
import {
  Globe2, Lock, Mail, Eye, EyeOff, Loader2, ArrowRight, Sparkles,
  LayoutGrid, Calculator, Users, BarChart3, LogOut,
  X, Send, Calendar, ArrowRightCircle, MessageCircle,
  FileText, Download, Plane, Stethoscope, Activity, TrendingUp,
  DollarSign, MapPin, Clock, CheckCircle2, AlertCircle, ShieldCheck,
  HeartPulse, FlaskConical, Receipt,
  PlusCircle, BedDouble,
} from "lucide-react";

/* ============================================================
   Nexura Global — Coordinator Dashboard
   Premium navy + gold design with glassmorphism
   ============================================================ */

const NAVY = "#0F172A";
const NAVY_2 = "#1E293B";
const NAVY_3 = "#334155";
const NAVY_4 = "#475569";
const GOLD = "#A16207";
const GOLD_DARK = "#8A5A04";
const GOLD_LIGHT = "#FCD34D";
const SLATE = "#64748B";
const SLATE_LIGHT = "#94A3B8";
const BORDER = "#E2E8F0";
const GREEN = "#16A34A";
const RED = "#EF4444";

const STORAGE_KEY = "nexura-global-coordinator-auth";

/* ---------- Types ---------- */

type Procedure = {
  id: string;
  name: string;
  category: string;
  priceUSD: number;
  description?: string | null;
  avgStayDays: number;
  active: boolean;
};

type Inquiry = {
  id: string;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  patientCountry: string;
  countryCode: string | null;
  procedureInterest: string | null;
  conditionDesc: string | null;
  status: string;
  assignedCoordinatorId: string | null;
  coordinatorName: string | null;
  estimatedCostUSD: number | null;
  estimatedCostINR: number | null;
  appointmentDate: string | null;
  visaStatus: string | null;
  arrivalDate: string | null;
  admissionId: string | null;
  dischargeDate: string | null;
  outcome: string | null;
  totalBilledUSD: number | null;
  messages: string | null;
  recordsUrl: string | null;
  estimateUrl: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type Coordinator = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  languages: string | null;
  active: boolean;
};

type EstimateResult = {
  procedure: string;
  procedureFee: number;
  surgeonFee: number;
  roomCharges: number;
  nursingMed: number;
  extras: number;
  totalUSD: number;
  totalINR: number;
  stayDays: number;
  inrRate: number;
  extrasList: { name: string; cost: number }[];
};

type TourismData = {
  settings: any;
  procedures: Procedure[];
  coordinators: Coordinator[];
  inquiries: Inquiry[];
  kanban: Record<string, Inquiry[]>;
  testimonials: any[];
  stats: {
    totalInquiries: number;
    newInquiries: number;
    activePatients: number;
    discharged: number;
    totalRevenue: number;
    conversionRate: number;
    topCountries: { country: string; count: number }[];
    topProcedures: { procedure: string; count: number }[];
  };
};

/* ---------- Status config ---------- */

const STATUS_FLOW = [
  "new",
  "estimate_sent",
  "appointment_booked",
  "visa_processing",
  "arrived",
  "treatment_ongoing",
  "discharged",
  "post_care",
];

const STATUSES = [
  { id: "new", label: "New", icon: Sparkles, color: "#3B82F6" },
  { id: "estimate_sent", label: "Estimate Sent", icon: FileText, color: "#8B5CF6" },
  { id: "appointment_booked", label: "Consultation Booked", icon: Calendar, color: "#06B6D4" },
  { id: "visa_processing", label: "Visa Stage", icon: Plane, color: "#A16207" },
  { id: "arrived", label: "Arrived", icon: MapPin, color: "#10B981" },
  { id: "treatment_ongoing", label: "Treatment", icon: Activity, color: "#EF4444" },
  { id: "discharged", label: "Discharged", icon: CheckCircle2, color: "#22C55E" },
  { id: "post_care", label: "Follow-up", icon: HeartPulse, color: "#EC4899" },
];

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  STATUSES.map((s) => [s.id, s.label]),
);

const nextStatus = (s: string): string | null => {
  const i = STATUS_FLOW.indexOf(s);
  if (i === -1 || i === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[i + 1];
};

/* ---------- Helpers ---------- */

function countryCodeToFlag(code?: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  const cc = code.toUpperCase();
  const A = 0x1f1e6;
  const base = "A".charCodeAt(0);
  try {
    return (
      String.fromCodePoint(A + (cc.charCodeAt(0) - base)) +
      String.fromCodePoint(A + (cc.charCodeAt(1) - base))
    );
  } catch {
    return "🌐";
  }
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function daysSince(iso?: string | null): number {
  if (!iso) return 0;
  try {
    return Math.max(
      0,
      Math.floor((Date.now() - new Date(iso).getTime()) / 86400000),
    );
  } catch {
    return 0;
  }
}

function usd(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function inr(n: number | null | undefined): string {
  if (n == null) return "—";
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function sanitizePhone(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/[^\d]/g, "");
}

function parseMessages(raw?: string | null): { from: string; text: string; timestamp?: string }[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

const EXTRA_PACKAGES = [
  { id: "physio", name: "Physiotherapy", cost: 200, icon: HeartPulse },
  { id: "dietary", name: "Dietary Plan", cost: 150, icon: FlaskConical },
  { id: "translator", name: "Translator", cost: 100, icon: MessageCircle },
  { id: "pickup", name: "Airport Pickup", cost: 50, icon: Plane },
];

/* ---------- Auth hook (sessionStorage, mirrors hospital pattern) ---------- */

function useCoordinatorAuth() {
  // Lazy initial state — read sessionStorage synchronously on first render
  // coordinator auth pattern
  const [coordinator, setCoordinator] = useState<Coordinator | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback((c: Coordinator) => {
    setCoordinator(c);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    } catch {}
  }, []);

  const logout = useCallback(() => {
    setCoordinator(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { coordinator, login, logout };
}

/* ============================================================
   Root export
   ============================================================ */

export function GlobalDashboard() {
  const { coordinator, login, logout } = useCoordinatorAuth();

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100">
      <Toaster theme="dark" position="top-right" richColors closeButton />
      <AnimatePresence mode="wait">
        {!coordinator ? (
          <LoginScreen key="login" onLogin={login} />
        ) : (
          <DashboardShell
            key="dash"
            coordinator={coordinator}
            onLogout={logout}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   Login screen
   ============================================================ */

const DEMO_COORD: Coordinator = {
  id: "demo-coordinator",
  name: "Priya Sharma",
  email: "coordinator@nexura.global",
  phone: "+91 98200 12345",
  languages: '["English","Hindi","Arabic"]',
  active: true,
};

function LoginScreen({ onLogin }: { onLogin: (c: Coordinator) => void }) {
  const [email, setEmail] = useState("coordinator@nexura.global");
  const [password, setPassword] = useState("nexura123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your coordinator credentials");
      return;
    }
    setLoading(true);
    setError("");
    setTimeout(() => {
      // Honest demo gate: only the demo coordinator identity signs in.
      // Any other email/password combination is rejected so the desk
      // behaves like a real sign-in instead of accepting everything.
      const emailOk =
        email.trim().toLowerCase() === (DEMO_COORD.email ?? "").toLowerCase();
      const passwordOk = password === "nexura123";
      if (!emailOk || !passwordOk) {
        setLoading(false);
        setError(
          "This is a simulated demo sign-in — only the demo coordinator identity is accepted. Real operations are gated server-side.",
        );
        return;
      }
      onLogin(DEMO_COORD);
      setLoading(false);
    }, 700);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Mesh background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#3B82F6]/15 blur-3xl anim-aurora" />
        <div
          className="absolute top-1/3 -right-32 h-80 w-80 rounded-full bg-[#A16207]/20 blur-3xl anim-aurora"
          style={{ animationDelay: "-8s" }}
        />
        <div
          className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-[#EC4899]/10 blur-3xl anim-aurora"
          style={{ animationDelay: "-16s" }}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo / brand */}
          <div className="mb-8 text-center">
            <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#A16207] to-[#8A5A04] shadow-lg shadow-[#A16207]/30">
              <Globe2 className="h-8 w-8 text-white" strokeWidth={2.2} />
            </span>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-white">
              Nexura Global
            </h1>
            <p className="mt-1 text-xs text-white/50">
              International Patient Coordinator Desk
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-dark rounded-2xl border border-white/10 p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#A16207]/15 text-[#A16207]">
                <Lock className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Coordinator Sign In</p>
                <p className="text-[0.65rem] text-white/40">
                  Manage international patient inquiries
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-medium text-white/50">
                Coordinator Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="coordinator@nexura.global"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#A16207]/50 focus:bg-white/10"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-white/50">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-11 pr-12 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-[#A16207]/50 focus:bg-white/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-white/30 hover:text-white/60"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <div className="mb-4 rounded-lg border border-[#A16207]/20 bg-[#A16207]/5 px-3 py-2">
              <p className="flex items-center gap-1.5 text-[0.65rem] text-[#A16207]">
                <Sparkles className="h-3 w-3" />
                Demo credentials pre-filled — just click Sign In
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading || !email.trim() || !password.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#A16207] to-[#8A5A04] py-3 text-sm font-semibold text-white shadow-lg shadow-[#A16207]/30 transition-all hover:scale-[1.02] hover:shadow-[#A16207]/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Authenticating…
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 flex items-center justify-center gap-4 text-[0.6rem] text-white/30"
          >
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> DPDP Act 2023
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> NABH Accredited
            </span>
            <span className="flex items-center gap-1">
              <Globe2 className="h-3 w-3" /> 24×7 Desk
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

/* ============================================================
   Dashboard Shell — holds tab state, fetches data
   ============================================================ */

type TabId = "inquiries" | "estimate" | "patients" | "analytics";

const TABS: {
  id: TabId;
  label: string;
  icon: any;
  desc: string;
}[] = [
  { id: "inquiries", label: "My Inquiries", icon: LayoutGrid, desc: "Kanban board" },
  { id: "estimate", label: "Cost Estimate", icon: Calculator, desc: "Generate quote" },
  { id: "patients", label: "Patients", icon: Users, desc: "International desk" },
  { id: "analytics", label: "Analytics", icon: BarChart3, desc: "Insights" },
];

function DashboardShell({
  coordinator,
  onLogout,
}: {
  coordinator: Coordinator;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<TabId>("inquiries");
  const [data, setData] = useState<TourismData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  // Async load — setState happens after await, mirroring hospital dashboard pattern
  const load = async () => {
    try {
      const res = await fetch("/api/global?scope=desk", { cache: "no-store" });
      const d = await res.json();
      if (d && !d.error) setData(d);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const updateInquiry = (inq: Inquiry) => {
    setData((prev) => {
      if (!prev) return prev;
      const inquiries = prev.inquiries.map((i) =>
        i.id === inq.id ? inq : i,
      );
      const kanban: Record<string, Inquiry[]> = {};
      for (const s of STATUS_FLOW) kanban[s] = [];
      for (const i of inquiries) {
        if (kanban[i.status]) kanban[i.status].push(i);
      }
      return { ...prev, inquiries, kanban };
    });
    setSelectedInquiry(inq);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0F172A]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#A16207] to-[#8A5A04] shadow-lg shadow-[#A16207]/20">
              <Globe2 className="h-5 w-5 text-white" strokeWidth={2.2} />
            </span>
            <div className="hidden sm:block">
              <p className="font-serif text-sm font-semibold tracking-tight text-white">
                Nexura Global
              </p>
              <p className="text-[0.6rem] text-white/40">
                International Patient Coordinator Desk
              </p>
            </div>
          </div>

          {/* Tabs */}
          <nav className="ml-2 hidden items-center gap-1 rounded-xl bg-white/5 p-1 md:flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? "bg-[#A16207] text-white shadow-sm"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-[0.65rem] text-white/60">Live</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/5 py-1 pl-1 pr-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#A16207] to-[#8A5A04] text-[0.65rem] font-bold text-white">
                {coordinator.name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div className="hidden sm:block">
                <p className="text-xs font-medium leading-none text-white">
                  {coordinator.name}
                </p>
                <p className="text-[0.55rem] text-white/40">Coordinator</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-white/60 transition-colors hover:bg-red-500/15 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile tab bar */}
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-[#A16207] text-white"
                  : "bg-white/5 text-white/60"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-[1600px] px-4 py-6 lg:px-6">
        {loading || !data ? (
          <DashboardSkeleton />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tab === "inquiries" && (
                <KanbanSection
                  data={data}
                  onOpen={setSelectedInquiry}
                  onUpdate={updateInquiry}
                  reload={load}
                />
              )}
              {tab === "estimate" && <EstimateSection procedures={data.procedures} />}
              {tab === "patients" && <PatientsSection inquiries={data.inquiries} />}
              {tab === "analytics" && <AnalyticsSection data={data} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Inquiry detail slide-over */}
      <AnimatePresence>
        {selectedInquiry && (
          <InquiryDetail
            key="detail"
            inquiry={selectedInquiry}
            procedures={data?.procedures ?? []}
            onClose={() => setSelectedInquiry(null)}
            onUpdate={updateInquiry}
            reload={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Dashboard skeleton ---------- */

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl bg-slate-100 shadow-depth"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-slate-100 shadow-depth" />
    </div>
  );
}

/* ============================================================
   Section 1 — Kanban Inquiries
   ============================================================ */

function KanbanSection({
  data,
  onOpen,
  onUpdate,
  reload,
}: {
  data: TourismData;
  onOpen: (i: Inquiry) => void;
  onUpdate: (i: Inquiry) => void;
  reload: () => Promise<void>;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const moveToNext = async (inq: Inquiry) => {
    const next = nextStatus(inq.status);
    if (!next) {
      toast.info("Already at final stage");
      return;
    }
    setActionLoading(inq.id);
    try {
      const res = await fetch("/api/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          inquiryId: inq.id,
          status: next,
        }),
      });
      const d = await res.json();
      if (d.inquiry) {
        onUpdate(d.inquiry);
        toast.success(`Moved to ${STATUS_LABELS[next]}`);
        await reload();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Network error");
    }
    setActionLoading(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#1E293B]">
            My Inquiries
          </h1>
          <p className="text-sm text-[#64748B]">
            {data.stats.totalInquiries} total · {data.stats.newInquiries} new ·{" "}
            {data.stats.activePatients} active patients
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full glass-chip px-3 py-1.5 text-xs font-medium text-[#475569]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          Auto-refresh 30s
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STATUSES.map((col) => {
          const items = data.kanban[col.id] || [];
          return (
            <div
              key={col.id}
              className="flex w-[280px] shrink-0 flex-col rounded-2xl bg-slate-100/70 shadow-depth"
            >
              <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: col.color }}
                  />
                  <span className="text-xs font-semibold text-[#1E293B]">
                    {col.label}
                  </span>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold text-white"
                  style={{ background: col.color }}
                >
                  {items.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: "70vh" }}>
                {items.length === 0 ? (
                  <div className="grid h-20 place-items-center rounded-lg border border-dashed border-slate-200 text-[0.65rem] text-slate-400">
                    No inquiries
                  </div>
                ) : (
                  items.map((inq) => (
                    <InquiryCard
                      key={inq.id}
                      inquiry={inq}
                      onClick={() => onOpen(inq)}
                      onMoveNext={() => moveToNext(inq)}
                      loading={actionLoading === inq.id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InquiryCard({
  inquiry,
  onClick,
  onMoveNext,
  loading,
}: {
  inquiry: Inquiry;
  onClick: () => void;
  onMoveNext: () => void;
  loading: boolean;
}) {
  const days = daysSince(inquiry.updatedAt);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-[#A16207]/40 hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">
            {countryCodeToFlag(inquiry.countryCode)}
          </span>
          <p className="text-sm font-semibold text-[#1E293B]">
            {inquiry.patientName}
          </p>
        </div>
        {days === 0 ? (
          <span className="rounded-full bg-green-50 px-1.5 py-0.5 text-[0.55rem] font-medium text-green-600">
            Today
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.55rem] font-medium text-amber-600">
            {days}d ago
          </span>
        )}
      </div>
      <p className="mt-1 line-clamp-1 text-xs text-[#64748B]">
        {inquiry.procedureInterest || "General inquiry"}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[0.6rem] text-slate-400">
          {fmtDate(inquiry.createdAt)}
        </span>
        {inquiry.estimatedCostUSD != null && (
          <span className="text-[0.6rem] font-semibold text-[#A16207]">
            {usd(inquiry.estimatedCostUSD)}
          </span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMoveNext();
        }}
        disabled={loading || nextStatus(inquiry.status) === null}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-slate-50 py-1 text-[0.6rem] font-medium text-slate-600 transition-colors hover:bg-[#A16207]/10 hover:text-[#8A5A04] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <ArrowRightCircle className="h-3 w-3" />
            {nextStatus(inquiry.status)
              ? `→ ${STATUS_LABELS[nextStatus(inquiry.status) as string]}`
              : "Final stage"}
          </>
        )}
      </button>
    </motion.div>
  );
}

/* ============================================================
   Inquiry Detail — slide-over panel
   ============================================================ */

function InquiryDetail({
  inquiry,
  procedures,
  onClose,
  onUpdate,
  reload,
}: {
  inquiry: Inquiry;
  procedures: Procedure[];
  onClose: () => void;
  onUpdate: (i: Inquiry) => void;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const messages = parseMessages(inquiry.messages);

  const moveToNext = async () => {
    const next = nextStatus(inquiry.status);
    if (!next) {
      toast.info("Already at final stage");
      return;
    }
    setBusy("next");
    try {
      const res = await fetch("/api/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          inquiryId: inquiry.id,
          status: next,
        }),
      });
      const d = await res.json();
      if (d.inquiry) {
        onUpdate(d.inquiry);
        toast.success(`Moved to ${STATUS_LABELS[next]}`);
        await reload();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Network error");
    }
    setBusy(null);
  };

  const sendEstimate = async () => {
    const proc = procedures.find(
      (p) => p.name === inquiry.procedureInterest,
    );
    if (!proc) {
      toast.error("Procedure not found. Add estimate manually.");
      return;
    }
    setBusy("estimate");
    try {
      const res = await fetch("/api/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_estimate",
          procedureId: proc.id,
          stayDays: proc.avgStayDays,
          extras: [],
        }),
      });
      const d = await res.json();
      if (d.totalUSD != null) {
        // Update inquiry status to estimate_sent
        const upd = await fetch("/api/global", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_status",
            inquiryId: inquiry.id,
            status: "estimate_sent",
          }),
        });
        const ud = await upd.json();
        if (ud.inquiry) {
          onUpdate({
            ...ud.inquiry,
            estimatedCostUSD: d.totalUSD,
            estimatedCostINR: d.totalINR,
          });
        }
        toast.success(
          `Estimate sent — ${usd(d.totalUSD)} / ${inr(d.totalINR)}`,
          { description: `Procedure: ${proc.name}` },
        );
        await reload();
      } else {
        toast.error("Failed to generate estimate");
      }
    } catch {
      toast.error("Network error");
    }
    setBusy(null);
  };

  const bookConsultation = async () => {
    setBusy("book");
    try {
      // Simulate consultation booking with a generated link
      const link = `https://meet.nexura.global/c/${inquiry.id.slice(-8)}`;
      const upd = await fetch("/api/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          inquiryId: inquiry.id,
          status: "appointment_booked",
        }),
      });
      const ud = await upd.json();
      if (ud.inquiry) {
        onUpdate({
          ...ud.inquiry,
          appointmentDate: new Date(Date.now() + 3 * 86400000).toISOString(),
        });
        toast.success("Consultation booked", {
          description: `Link: ${link}`,
        });
        await reload();
      } else {
        toast.error("Failed to book consultation");
      }
    } catch {
      toast.error("Network error");
    }
    setBusy(null);
  };

  const whatsapp = () => {
    const phone = sanitizePhone(inquiry.patientPhone);
    if (!phone) {
      toast.error("No phone number on file");
      return;
    }
    const text = encodeURIComponent(
      `Hello ${inquiry.patientName}, this is Priya from Nexura Global — International Patient Desk. How can I assist with your ${inquiry.procedureInterest || "treatment"} today?`,
    );
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  const downloadSummary = () => {
    const summary = [
      "NEXURA GLOBAL — PATIENT SUMMARY",
      "================================",
      `Patient: ${inquiry.patientName}`,
      `Country: ${countryCodeToFlag(inquiry.countryCode)} ${inquiry.patientCountry} (${inquiry.countryCode || "—"})`,
      `Email: ${inquiry.patientEmail || "—"}`,
      `Phone: ${inquiry.patientPhone || "—"}`,
      `Procedure: ${inquiry.procedureInterest || "—"}`,
      `Status: ${STATUS_LABELS[inquiry.status] || inquiry.status}`,
      `Estimated Cost: ${usd(inquiry.estimatedCostUSD)} (${inr(inquiry.estimatedCostINR)})`,
      `Inquiry Date: ${fmtDate(inquiry.createdAt)}`,
      `Last Updated: ${fmtDate(inquiry.updatedAt)}`,
      "",
      "CONDITION:",
      inquiry.conditionDesc || "—",
      "",
      `Coordinator: ${inquiry.coordinatorName || "—"}`,
      "",
      "Generated: " + new Date().toLocaleString("en-IN"),
    ].join("\n");
    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `patient-${inquiry.id.slice(-6)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Patient summary downloaded");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[#0F172A]/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-[#0F172A] p-5 text-white">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#A16207] to-[#8A5A04] text-lg font-bold text-white">
              {inquiry.patientName[0]}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-semibold">{inquiry.patientName}</p>
                <span className="text-lg leading-none">
                  {countryCodeToFlag(inquiry.countryCode)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-white/50">
                {inquiry.patientCountry} ·{" "}
                {STATUS_LABELS[inquiry.status] || inquiry.status}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Contact info */}
          <Section title="Patient Information" icon={Users}>
            <DetailRow label="Email" value={inquiry.patientEmail || "—"} />
            <DetailRow label="Phone" value={inquiry.patientPhone || "—"} />
            <DetailRow
              label="Procedure"
              value={inquiry.procedureInterest || "General"}
            />
            <DetailRow
              label="Inquiry Date"
              value={fmtDate(inquiry.createdAt)}
            />
            <DetailRow
              label="Last Updated"
              value={`${fmtDate(inquiry.updatedAt)} (${daysSince(inquiry.updatedAt)}d ago)`}
            />
            <DetailRow
              label="Coordinator"
              value={inquiry.coordinatorName || "Unassigned"}
            />
          </Section>

          {/* Condition */}
          <Section title="Condition Description" icon={Stethoscope}>
            <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-[#475569]">
              {inquiry.conditionDesc || "No condition description provided."}
            </p>
          </Section>

          {/* Estimate info */}
          {(inquiry.estimatedCostUSD != null ||
            inquiry.appointmentDate != null ||
            inquiry.arrivalDate != null) && (
            <Section title="Journey Status" icon={Activity}>
              {inquiry.estimatedCostUSD != null && (
                <DetailRow
                  label="Estimate"
                  value={`${usd(inquiry.estimatedCostUSD)} · ${inr(inquiry.estimatedCostINR)}`}
                />
              )}
              {inquiry.appointmentDate != null && (
                <DetailRow
                  label="Consultation"
                  value={fmtDate(inquiry.appointmentDate)}
                />
              )}
              {inquiry.arrivalDate != null && (
                <DetailRow
                  label="Arrival"
                  value={fmtDate(inquiry.arrivalDate)}
                />
              )}
              {inquiry.dischargeDate != null && (
                <DetailRow
                  label="Discharge"
                  value={fmtDate(inquiry.dischargeDate)}
                />
              )}
              {inquiry.totalBilledUSD != null && (
                <DetailRow
                  label="Billed"
                  value={usd(inquiry.totalBilledUSD)}
                />
              )}
            </Section>
          )}

          {/* Medical documents */}
          <Section title="Medical Documents" icon={FileText}>
            <div className="grid grid-cols-2 gap-2">
              {["Angiography Report", "Blood Test Results", "Previous Records", "Insurance Card"].map(
                (doc, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[0.65rem] text-[#64748B]"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{doc}</span>
                  </div>
                ),
              )}
            </div>
            <p className="mt-2 text-[0.6rem] text-slate-400">
              No records uploaded yet — the coordinator requests them over WhatsApp or Connect before the visa stage.
            </p>
          </Section>

          {/* Conversation log */}
          <Section title="Conversation Log" icon={MessageCircle}>
            {messages.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-400">
                No messages yet
              </p>
            ) : (
              <div className="space-y-2">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.from === "patient" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                        m.from === "patient"
                          ? "bg-slate-100 text-[#1E293B]"
                          : "bg-[#A16207] text-white"
                      }`}
                    >
                      <p>{m.text}</p>
                      {m.timestamp && (
                        <p className="mt-1 text-[0.55rem] opacity-60">
                          {new Date(m.timestamp).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Action footer */}
        <div className="border-t border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-2 gap-2">
            <ActionButton
              icon={Send}
              label="Send Estimate"
              loading={busy === "estimate"}
              disabled={!!busy}
              onClick={sendEstimate}
              variant="primary"
            />
            <ActionButton
              icon={Calendar}
              label="Book Consultation"
              loading={busy === "book"}
              disabled={!!busy}
              onClick={bookConsultation}
            />
            <ActionButton
              icon={ArrowRightCircle}
              label="Move to Next Stage"
              loading={busy === "next"}
              disabled={!!busy || nextStatus(inquiry.status) === null}
              onClick={moveToNext}
            />
            <ActionButton
              icon={MessageCircle}
              label="WhatsApp Patient"
              loading={false}
              disabled={!!busy}
              onClick={whatsapp}
              variant="whatsapp"
            />
          </div>
          <button
            onClick={downloadSummary}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-[#64748B] transition-colors hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download Patient Summary
          </button>
        </div>
      </motion.div>
    </>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-[#A16207]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
          {title}
        </h3>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-[#1E293B]">{value}</span>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  loading,
  disabled,
  variant = "default",
}: {
  icon: any;
  label: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  variant?: "default" | "primary" | "whatsapp";
}) {
  const styles = {
    default: "border-slate-200 bg-white text-[#1E293B] hover:bg-slate-50",
    primary: "bg-gradient-to-r from-[#A16207] to-[#8A5A04] text-white shadow-md shadow-[#A16207]/20 hover:scale-[1.02]",
    whatsapp: "bg-[#25D366] text-white shadow-md shadow-[#25D366]/20 hover:bg-[#1eb858]",
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}

/* ============================================================
   Section 2 — Cost Estimate Generator
   ============================================================ */

function EstimateSection({ procedures }: { procedures: Procedure[] }) {
  // procedureId is null until user picks; effectiveId falls back to first procedure.
  const [procedureId, setProcedureId] = useState<string | null>(null);
  const [stayDays, setStayDays] = useState<number>(7);
  const [extras, setExtras] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);

  const effectiveId = procedureId ?? procedures[0]?.id ?? "";
  const selectedProc = procedures.find((p) => p.id === effectiveId);

  const generate = async () => {
    if (!selectedProc) {
      toast.error("Please select a procedure");
      return;
    }
    setLoading(true);
    try {
      const extrasList = EXTRA_PACKAGES.filter((e) => extras[e.id]).map((e) => ({
        name: e.name,
        cost: e.cost,
      }));
      const res = await fetch("/api/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_estimate",
          procedureId: selectedProc.id,
          stayDays,
          extras: extrasList,
        }),
      });
      const d = await res.json();
      if (d.totalUSD != null) {
        setResult(d);
        toast.success("Cost estimate generated");
      } else {
        toast.error(d.error || "Failed to generate estimate");
      }
    } catch {
      toast.error("Network error");
    }
    setLoading(false);
  };

  const downloadEstimate = () => {
    if (!result || !selectedProc) return;
    const lines = [
      "NEXURA GLOBAL — COST ESTIMATE",
      "=============================",
      `Procedure: ${result.procedure}`,
      `Estimated Stay: ${result.stayDays} days`,
      `Exchange Rate: 1 USD = ₹${result.inrRate}`,
      "",
      "BREAKDOWN (USD):",
      `  Procedure Fee ......... $${result.procedureFee.toLocaleString()}`,
      `  Surgeon Fee (30%) ..... $${result.surgeonFee.toLocaleString()}`,
      `  Room ($150/day × ${result.stayDays}) .. $${result.roomCharges.toLocaleString()}`,
      `  Nursing & Meds (10%) .. $${result.nursingMed.toLocaleString()}`,
    ];
    if (result.extrasList && result.extrasList.length > 0) {
      lines.push("");
      lines.push("ADD-ONS:");
      for (const e of result.extrasList) {
        lines.push(`  ${e.name} ... $${e.cost}`);
      }
      lines.push(`  Extras Subtotal ....... $${result.extras}`);
    }
    lines.push("");
    lines.push("=============================");
    lines.push(`TOTAL: $${result.totalUSD.toLocaleString()} / ₹${result.totalINR.toLocaleString("en-IN")}`);
    lines.push("");
    lines.push("Generated: " + new Date().toLocaleString("en-IN"));
    lines.push("Valid for 30 days. Final cost may vary based on diagnosis.");
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estimate-${selectedProc.name.slice(0, 20).replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Estimate downloaded");
  };

  const whatsappEstimate = () => {
    if (!result) return;
    const text = encodeURIComponent(
      `*Nexura Global — Cost Estimate*\n\n*Procedure:* ${result.procedure}\n*Stay:* ${result.stayDays} days\n\n*Breakdown (USD):*\n• Procedure Fee: $${result.procedureFee.toLocaleString()}\n• Surgeon Fee: $${result.surgeonFee.toLocaleString()}\n• Room: $${result.roomCharges.toLocaleString()}\n• Nursing & Meds: $${result.nursingMed.toLocaleString()}\n• Extras: $${result.extras}\n\n*Total: $${result.totalUSD.toLocaleString()} / ₹${result.totalINR.toLocaleString("en-IN")}*\n\nReply to proceed. — Nexura Global Desk`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const extraCost = EXTRA_PACKAGES.filter((e) => extras[e.id]).reduce(
    (s, e) => s + e.cost,
    0,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#1E293B]">
          Cost Estimate Generator
        </h1>
        <p className="text-sm text-[#64748B]">
          Build transparent USD + INR estimates with optional add-on packages
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Form */}
        <div className="glass-soft rounded-2xl p-5 shadow-depth">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#A16207]/15 text-[#A16207]">
              <Calculator className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-semibold text-[#1E293B]">
              Estimate Inputs
            </h3>
          </div>

          {/* Procedure select */}
          <label className="mb-1.5 block text-xs font-medium text-[#475569]">
            Procedure
          </label>
          <select
            value={effectiveId}
            onChange={(e) => {
              const p = procedures.find((x) => x.id === e.target.value);
              setProcedureId(e.target.value);
              if (p) setStayDays(p.avgStayDays);
            }}
            className="mb-4 h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#1E293B] outline-none transition-colors focus:border-[#A16207]/50"
          >
            {procedures.length === 0 && (
              <option value="">No procedures configured</option>
            )}
            {procedures.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {usd(p.priceUSD)} ({p.avgStayDays}d)
              </option>
            ))}
          </select>

          {/* Stay days */}
          <label className="mb-1.5 block text-xs font-medium text-[#475569]">
            Estimated Stay (days)
          </label>
          <div className="mb-4 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={60}
              value={stayDays}
              onChange={(e) =>
                setStayDays(Math.max(1, Math.min(60, Number(e.target.value) || 1)))
              }
              className="h-11 w-24 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm text-[#1E293B] outline-none focus:border-[#A16207]/50"
            />
            {selectedProc && (
              <span className="text-[0.65rem] text-slate-400">
                Default for this procedure: {selectedProc.avgStayDays} days
              </span>
            )}
          </div>

          {/* Extras */}
          <label className="mb-2 block text-xs font-medium text-[#475569]">
            Optional Packages
          </label>
          <div className="space-y-2">
            {EXTRA_PACKAGES.map((e) => {
              const checked = !!extras[e.id];
              return (
                <button
                  key={e.id}
                  onClick={() =>
                    setExtras((prev) => ({ ...prev, [e.id]: !prev[e.id] }))
                  }
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    checked
                      ? "border-[#A16207]/50 bg-[#A16207]/5"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-lg ${
                        checked ? "bg-[#A16207] text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <e.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-[#1E293B]">
                        {e.name}
                      </p>
                      <p className="text-[0.6rem] text-slate-400">
                        +${e.cost}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`grid h-5 w-5 place-items-center rounded-md border ${
                      checked
                        ? "border-[#A16207] bg-[#A16207] text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Summary preview */}
          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Procedure base</span>
              <span className="font-medium text-[#1E293B]">
                {selectedProc ? usd(selectedProc.priceUSD) : "—"}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">Add-ons ({Object.values(extras).filter(Boolean).length})</span>
              <span className="font-medium text-[#1E293B]">{usd(extraCost)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-500">Stay ({stayDays}d × $150)</span>
              <span className="font-medium text-[#1E293B]">
                {usd(stayDays * 150)}
              </span>
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !selectedProc}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#A16207] to-[#8A5A04] py-3 text-sm font-semibold text-white shadow-lg shadow-[#A16207]/30 transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate Estimate
              </>
            )}
          </button>
        </div>

        {/* Result */}
        <div className="glass-soft rounded-2xl p-5 shadow-depth">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#A16207]/15 text-[#A16207]">
                <Receipt className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold text-[#1E293B]">
                Professional Breakdown
              </h3>
            </div>
            {result && (
              <span className="rounded-full bg-[#16A34A]/10 px-2 py-0.5 text-[0.6rem] font-medium text-[#16A34A]">
                Generated
              </span>
            )}
          </div>

          {!result ? (
            <div className="grid h-72 place-items-center text-center">
              <div>
                <Calculator className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm text-slate-400">
                  Configure inputs and click Generate
                </p>
                <p className="mt-1 text-[0.65rem] text-slate-300">
                  Your cost estimate will appear here
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="rounded-xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-4 text-white">
                <p className="text-[0.65rem] uppercase tracking-wider text-white/40">
                  Procedure
                </p>
                <p className="mt-0.5 font-serif text-base font-semibold">
                  {result.procedure}
                </p>
                <p className="mt-1 text-[0.65rem] text-white/50">
                  {result.stayDays}-day stay · Rate 1 USD = ₹{result.inrRate}
                </p>
              </div>

              <div className="space-y-1.5">
                <EstimateLine label="Procedure Fee" value={result.procedureFee} />
                <EstimateLine
                  label="Surgeon Fee (30%)"
                  value={result.surgeonFee}
                  icon={Stethoscope}
                />
                <EstimateLine
                  label={`Room ($150/day × ${result.stayDays})`}
                  value={result.roomCharges}
                  icon={BedDouble}
                />
                <EstimateLine
                  label="Nursing & Meds (10%)"
                  value={result.nursingMed}
                  icon={HeartPulse}
                />
                {result.extras > 0 && (
                  <EstimateLine
                    label="Add-on Packages"
                    value={result.extras}
                    icon={PlusCircle}
                  />
                )}
              </div>

              {/* Total */}
              <div className="rounded-xl border-2 border-[#A16207]/30 bg-[#A16207]/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#475569]">
                    Total USD
                  </span>
                  <span className="font-serif text-xl font-bold text-[#1E293B]">
                    {usd(result.totalUSD)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-[#A16207]/20 pt-2">
                  <span className="text-xs font-medium text-[#475569]">
                    Total INR
                  </span>
                  <span className="font-serif text-xl font-bold text-[#A16207]">
                    {inr(result.totalINR)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={downloadEstimate}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-[#1E293B] transition-colors hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={whatsappEstimate}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-[#25D366] py-2 text-xs font-medium text-white shadow-md shadow-[#25D366]/20 transition-all hover:bg-[#1eb858]"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function EstimateLine({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon?: any;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs text-[#475569]">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
        {label}
      </span>
      <span className="font-serif text-sm font-semibold text-[#1E293B]">
        {usd(value)}
      </span>
    </div>
  );
}

/* ============================================================
   Section 3 — International Patients Table
   ============================================================ */

const INTERNATIONAL_STATUSES = [
  "arrived",
  "treatment_ongoing",
  "discharged",
  "post_care",
];

function PatientsSection({ inquiries }: { inquiries: Inquiry[] }) {
  const patients = useMemo(
    () =>
      inquiries
        .filter((i) => INTERNATIONAL_STATUSES.includes(i.status))
        .sort((a, b) => {
          const ad = a.arrivalDate ? new Date(a.arrivalDate).getTime() : 0;
          const bd = b.arrivalDate ? new Date(b.arrivalDate).getTime() : 0;
          return bd - ad;
        }),
    [inquiries],
  );

  const totalRevenue = patients.reduce(
    (s, p) => s + (p.totalBilledUSD || p.estimatedCostUSD || 0),
    0,
  );
  const successful = patients.filter((p) => p.outcome === "successful").length;
  const successRate =
    patients.length > 0
      ? Math.round((successful / patients.length) * 100)
      : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#1E293B]">
          International Patients
        </h1>
        <p className="text-sm text-[#64748B]">
          Patients who have arrived for treatment or completed their journey
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={Users}
          label="Total Patients"
          value={String(patients.length)}
          accent="#3B82F6"
        />
        <SummaryCard
          icon={DollarSign}
          label="Total Revenue"
          value={usd(totalRevenue)}
          accent="#16A34A"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Success Rate"
          value={`${successRate}%`}
          accent="#A16207"
        />
      </div>

      {/* Table */}
      <div className="glass-soft overflow-hidden rounded-2xl shadow-depth">
        {patients.length === 0 ? (
          <div className="grid h-48 place-items-center text-center">
            <div>
              <Users className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-400">
                No international patients yet
              </p>
              <p className="mt-1 text-[0.65rem] text-slate-300">
                Patients who arrive for treatment will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <Th>Name</Th>
                  <Th>Country</Th>
                  <Th>Procedure</Th>
                  <Th>Admission</Th>
                  <Th>Discharge</Th>
                  <Th align="right">Billed (USD)</Th>
                  <Th align="center">Outcome</Th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/60"
                  >
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-[0.6rem] font-bold text-white">
                          {p.patientName[0]}
                        </span>
                        <div>
                          <p className="font-medium text-[#1E293B]">
                            {p.patientName}
                          </p>
                          <p className="text-[0.6rem] text-slate-400">
                            {p.patientEmail}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="flex items-center gap-1.5">
                        <span className="text-base">
                          {countryCodeToFlag(p.countryCode)}
                        </span>
                        <span className="text-xs text-[#475569]">
                          {p.patientCountry}
                        </span>
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-[#475569]">
                        {p.procedureInterest || "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-[#475569]">
                        {fmtDate(p.arrivalDate)}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-[#475569]">
                        {fmtDate(p.dischargeDate)}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="font-serif text-sm font-semibold text-[#1E293B]">
                        {usd(p.totalBilledUSD || p.estimatedCostUSD)}
                      </span>
                    </Td>
                    <Td align="center">
                      <OutcomeBadge
                        outcome={p.outcome}
                        status={p.status}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={`px-4 py-3 text-[0.65rem] font-semibold uppercase tracking-wider text-[#64748B] ${
        align === "right"
          ? "text-right"
          : align === "center"
            ? "text-center"
            : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={`px-4 py-3 ${
        align === "right"
          ? "text-right"
          : align === "center"
            ? "text-center"
            : "text-left"
      }`}
    >
      {children}
    </td>
  );
}

function OutcomeBadge({
  outcome,
  status,
}: {
  outcome: string | null;
  status: string;
}) {
  if (outcome === "successful") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[0.6rem] font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Successful
      </span>
    );
  }
  if (outcome === "complications") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.6rem] font-medium text-amber-700">
        <AlertCircle className="h-3 w-3" />
        Complications
      </span>
    );
  }
  if (status === "treatment_ongoing") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[0.6rem] font-medium text-blue-700">
        <Activity className="h-3 w-3" />
        In Treatment
      </span>
    );
  }
  if (status === "arrived") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[0.6rem] font-medium text-cyan-700">
        <MapPin className="h-3 w-3" />
        Arrived
      </span>
    );
  }
  if (status === "post_care") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 text-[0.6rem] font-medium text-pink-700">
        <HeartPulse className="h-3 w-3" />
        Follow-up
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[0.6rem] font-medium text-slate-600">
      <Clock className="h-3 w-3" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-soft rounded-2xl p-4 shadow-depth"
    >
      <div className="flex items-center justify-between">
        <span
          className="grid h-9 w-9 place-items-center rounded-xl"
          style={{ background: `${accent}15`, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 font-serif text-2xl font-bold text-[#1E293B]">
        {value}
      </p>
      <p className="text-[0.65rem] text-[#64748B]">{label}</p>
    </motion.div>
  );
}

/* ============================================================
   Section 4 — Analytics
   ============================================================ */

function AnalyticsSection({ data }: { data: TourismData }) {
  const now = new Date();
  const thisMonth = (inquiries: Inquiry[]) =>
    inquiries.filter((i) => {
      const d = new Date(i.createdAt);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }).length;

  const international = data.inquiries.filter((i) =>
    INTERNATIONAL_STATUSES.includes(i.status),
  );
  const totalRevenue = international.reduce(
    (s, p) => s + (p.totalBilledUSD || p.estimatedCostUSD || 0),
    0,
  );
  const avgRevenue =
    international.length > 0 ? Math.round(totalRevenue / international.length) : 0;
  const convertedThisMonth = thisMonth(data.inquiries);
  const conversionRate = data.stats.conversionRate;

  // Top 3 countries
  const topCountries = (data.stats.topCountries || []).slice(0, 3);
  const countryChart = topCountries.map((c) => ({
    name: c.country.length > 12 ? c.country.slice(0, 11) + "…" : c.country,
    fullName: c.country,
    count: c.count,
  }));

  // Top 3 procedures
  const topProcedures = (data.stats.topProcedures || []).slice(0, 3);
  const procedureChart = topProcedures.map((p) => ({
    name: p.procedure.length > 14 ? p.procedure.slice(0, 13) + "…" : p.procedure,
    fullName: p.procedure,
    count: p.count,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#1E293B]">
          Analytics
        </h1>
        <p className="text-sm text-[#64748B]">
          Performance insights for the international patient desk
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Sparkles}
          label="Inquiries This Month"
          value={String(convertedThisMonth)}
          sub={`${data.stats.totalInquiries} all-time`}
          accent="#3B82F6"
        />
        <KpiCard
          icon={TrendingUp}
          label="Conversion Rate"
          value={`${conversionRate}%`}
          sub="inquiry → admission"
          accent="#16A34A"
        />
        <KpiCard
          icon={DollarSign}
          label="Avg Revenue / Patient"
          value={usd(avgRevenue)}
          sub={`${international.length} international`}
          accent="#A16207"
        />
        <KpiCard
          icon={Globe2}
          label="Active Patients"
          value={String(data.stats.activePatients)}
          sub={`${data.stats.discharged} discharged`}
          accent="#8B5CF6"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top countries */}
        <ChartCard
          title="Top 3 Source Countries"
          icon={MapPin}
          accent="#3B82F6"
        >
          {countryChart.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={countryChart}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: SLATE }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: SLATE_LIGHT }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "#F1F5F9" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${BORDER}`,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} inquiries`, "Count"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={50}>
                  {countryChart.map((_, i) => (
                    <Cell
                      key={i}
                      fill={["#3B82F6", "#60A5FA", "#93C5FD"][i] || "#3B82F6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top procedures */}
        <ChartCard
          title="Top 3 Procedures by Inquiry"
          icon={Stethoscope}
          accent="#A16207"
        >
          {procedureChart.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={procedureChart}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: SLATE_LIGHT }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: SLATE }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  cursor={{ fill: "#F1F5F9" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: `1px solid ${BORDER}`,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} inquiries`, "Count"]}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={28}>
                  {procedureChart.map((_, i) => (
                    <Cell
                      key={i}
                      fill={["#A16207", "#D9B87C", "#FCD34D"][i] || "#A16207"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top countries/procedures lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard
          title="Source Countries"
          icon={MapPin}
          accent="#3B82F6"
          items={topCountries.map((c) => ({
            label: c.country,
            value: `${c.count} inquiries`,
          }))}
        />
        <ListCard
          title="Procedures"
          icon={Stethoscope}
          accent="#A16207"
          items={topProcedures.map((p) => ({
            label: p.procedure,
            value: `${p.count} inquiries`,
          }))}
        />
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-soft rounded-2xl p-4 shadow-depth"
    >
      <span
        className="grid h-9 w-9 place-items-center rounded-xl"
        style={{ background: `${accent}15`, color: accent }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2 font-serif text-2xl font-bold text-[#1E293B]">
        {value}
      </p>
      <p className="text-[0.65rem] text-[#64748B]">{label}</p>
      <p className="mt-0.5 text-[0.6rem] text-slate-400">{sub}</p>
    </motion.div>
  );
}

function ChartCard({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: any;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-soft rounded-2xl p-4 shadow-depth">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="grid h-7 w-7 place-items-center rounded-lg"
          style={{ background: `${accent}15`, color: accent }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="grid h-56 place-items-center text-center">
      <div>
        <BarChart3 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
        <p className="text-xs text-slate-400">No data yet</p>
      </div>
    </div>
  );
}

function ListCard({
  title,
  icon: Icon,
  accent,
  items,
}: {
  title: string;
  icon: any;
  accent: string;
  items: { label: string; value: string }[];
}) {
  return (
    <div className="glass-soft rounded-2xl p-4 shadow-depth">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="grid h-7 w-7 place-items-center rounded-lg"
          style={{ background: `${accent}15`, color: accent }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
          {title}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">
          No data available
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="grid h-5 w-5 place-items-center rounded-full text-[0.6rem] font-bold text-white"
                  style={{ background: accent }}
                >
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-[#1E293B]">
                  {item.label}
                </span>
              </div>
              <span className="text-[0.65rem] text-slate-500">{item.value}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
