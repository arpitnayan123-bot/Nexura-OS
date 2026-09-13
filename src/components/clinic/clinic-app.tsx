// @ts-nocheck
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Users, FileText, Wallet, BarChart3,
  Stethoscope, X, ArrowLeft, Plus, Search, Clock,
  CheckCircle2, ChevronRight, Phone, HeartPulse,
  Loader2, Shield, Pill, Download, MessageCircle,
  Activity, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Counter, StaggerGroup, StaggerItem } from "@/components/premium/kit";

type Tab = "today" | "patients" | "appointments" | "prescriptions" | "billing" | "reports";

type DashboardData = {
  clinic: { name: string; ownerName: string | null; city: string | null; bookingSlug: string | null };
  kpis: { patients: number; appointmentsToday: number; waiting: number; done: number; revenueToday: number; outstanding: number };
  doctors: { id: string; name: string; specialization: string | null; feeConsult: number; shiftStart: string | null; shiftEnd: string | null }[];
  appointments: {
    id: string; tokenNo: number; slot: string; status: string; reason: string | null; source?: string;
    patient: { id: string; mrn: string; name: string; age: number | null; gender: string; phone: string | null; bloodGroup: string | null; abhaId: string | null };
    doctor: { id: string; name: string; specialization: string | null };
  }[];
  revenueTrend7d: { date: string; revenue: number }[];
  pendingOnlineBookings: any[];
};

const STATUS: Record<string, { dot: string; text: string; label: string; bg: string }> = {
  booked: { dot: "bg-[#C9962E]", text: "text-[#B8893D]", label: "Waiting", bg: "bg-[#C9962E]/10" },
  arrived: { dot: "bg-[#A16207]", text: "text-[#8A5A04]", label: "In Consultation", bg: "bg-[#A16207]/10" },
  done: { dot: "bg-[#9DB89E]", text: "text-[#5A7A5B]", label: "Done", bg: "bg-[#9DB89E]/10" },
  cancelled: { dot: "bg-[#B8860B]", text: "text-[#8A5A04]", label: "Cancelled", bg: "bg-[#B8860B]/8" },
  no_show: { dot: "bg-[#B8860B]", text: "text-[#8A5A04]", label: "No Show", bg: "bg-[#B8860B]/8" },
};

export function ClinicApp() {
  const [tab, setTab] = useState<Tab>("today");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [consult, setConsult] = useState<{ appointmentId: string; patient: any; doctor: any; doctorFee: number } | null>(null);
  const [doctorFilter, setDoctorFilter] = useState<string | null>(null);

  const load = async () => {
    try { const res = await fetch("/api/clinic/dashboard"); if (!res.ok) throw new Error(); const d = await res.json(); setData(d); } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, []);

  const switchTab = (t: Tab) => startTransition(() => { setTab(t); setDoctorFilter(null); });

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2A2622]">
      {/* ambient loop animations */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#A16207]/8 blur-3xl anim-aurora" />
        <div className="absolute top-1/3 -right-32 h-80 w-80 rounded-full bg-[#9DB89E]/8 blur-3xl anim-aurora" style={{ animationDelay: "-8s" }} />
        <div className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-[#C9962E]/8 blur-3xl anim-aurora" style={{ animationDelay: "-16s" }} />
      </div>

      <div className="mx-auto flex max-w-[1280px]">
        {/* Left rail — Practo Ray style */}
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-[#EFE9E0] bg-white/60 backdrop-blur-xl sm:flex">
          <div className="flex items-center gap-2.5 px-5 py-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#A16207] to-[#C9962E] anim-breathe">
              <Stethoscope className="h-4.5 w-4.5 text-white" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div className="leading-none">
              <p className="font-serif text-[15px] font-semibold tracking-tight">Nexura Clinic</p>
              <p className="text-[0.55rem] uppercase tracking-[0.15em] text-[#9A8F84]">HealthPlix-style EMR</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-2">
            <p className="px-3 py-2 text-[0.55rem] font-semibold uppercase tracking-wider text-[#B5A99E]">Menu</p>
            {([
              { id: "today", label: "Today", icon: CalendarDays },
              { id: "patients", label: "Patients", icon: Users },
              { id: "appointments", label: "Appointments", icon: Clock },
              { id: "prescriptions", label: "Prescriptions", icon: FileText },
              { id: "billing", label: "Billing", icon: Wallet },
              { id: "reports", label: "Reports", icon: BarChart3 },
            ] as const).map((n) => {
              const isActive = tab === n.id;
              return (
                <button key={n.id} onClick={() => switchTab(n.id)} className={cn("group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", isActive ? "bg-[#2A2622] text-white shadow-md" : "text-[#5C544D] hover:bg-[#F3EEE6]")}>
                  <n.icon className="h-4 w-4" strokeWidth={2} />
                  {n.label}
                  {isActive && n.id === "today" && data && <span className="ml-auto rounded-full bg-white/20 px-1.5 py-0.5 text-[0.6rem]">{data.kpis.appointmentsToday}</span>}
                </button>
              );
            })}
          </nav>

          {/* Doctor selector — bottom of sidebar */}
          {data && (
            <div className="border-t border-[#EFE9E0] px-3 pb-3 pt-2">
              <p className="px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-wider text-[#B5A99E]">Doctors</p>
              <div className="space-y-1">
                {data.doctors.map((d) => (
                  <button key={d.id} onClick={() => { setTab("today"); setDoctorFilter(d.id); }} className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-[#F3EEE6]", doctorFilter === d.id && "bg-[#A16207]/10")}>
                    <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#F3EEE6] to-[#E5DFD4] text-[0.6rem] font-bold text-[#5C544D]">
                      {d.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                      <span className="absolute -bottom-0 -right-0 h-2 w-2 rounded-full bg-[#9DB89E] ring-2 ring-white anim-breathe" />
                    </span>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-xs font-medium">{d.name}</p>
                      <p className="truncate text-[0.6rem] text-[#9A8F84]">{d.specialization}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Link href="/" className="mx-3 mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#9A8F84] hover:bg-[#F3EEE6]">
            <ArrowLeft className="h-3.5 w-3.5" /> Homepage
          </Link>
        </aside>

        {/* Mobile top */}
        <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-[#EFE9E0] bg-white/90 px-4 py-3 backdrop-blur sm:hidden">
          <Link href="/" className="flex items-center gap-1.5 text-xs text-[#9A8F84]"><ArrowLeft className="h-3.5 w-3.5" /> Home</Link>
          <span className="font-serif text-sm font-semibold">Nexura Clinic</span>
          <div className="flex gap-1 rounded-lg bg-[#F3EEE6] p-0.5">
            {(["today", "patients", "billing"] as const).map((t) => <button key={t} onClick={() => switchTab(t)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium capitalize", tab === t ? "bg-white text-[#2A2622] shadow-sm" : "text-[#9A8F84]")}>{t}</button>)}
          </div>
        </div>

        {/* Main */}
        <main className="flex-1 overflow-x-hidden px-5 pt-14 sm:px-8 sm:pt-8">
          {loading || !data ? (
            <div className="grid h-64 place-items-center">
              <div className="flex flex-col items-center gap-4">
                <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#A16207] to-[#C9962E] shadow-lg shadow-[#A16207]/25 anim-breathe">
                  <Stethoscope className="h-6 w-6 text-white" strokeWidth={2.2} aria-hidden="true" />
                </span>
                <p className="font-serif text-sm font-medium text-[#5C544D]">Preparing your clinic…</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={tab + (doctorFilter || "")} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                {pending ? <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#9A8F84]" /></div> : tab === "today" ? <TodayTab data={data} doctorFilter={doctorFilter} onConsult={(a) => setConsult({ appointmentId: a.id, patient: a.patient, doctor: a.doctor, doctorFee: data.doctors.find((d) => d.id === a.doctor.id)?.feeConsult ?? 0 })} onReload={load} onClearFilter={() => setDoctorFilter(null)} /> : tab === "patients" ? <PatientsTab /> : tab === "appointments" ? <AppointmentsTab /> : tab === "prescriptions" ? <PrescriptionsTab /> : tab === "billing" ? <BillingTab /> : <ReportsTab data={data} />}
              </motion.div>
            </AnimatePresence>
          )}
          <div className="h-16" />
        </main>
      </div>

      <ConsultModal data={consult} onClose={() => setConsult(null)} onSaved={() => { setConsult(null); load(); }} />
    </div>
  );
}

/* ============== TODAY — patient cards ============== */

function TodayTab({ data, doctorFilter, onConsult, onReload, onClearFilter }: { data: DashboardData; doctorFilter: string | null; onConsult: (a: any) => void; onReload: () => void; onClearFilter: () => void }) {
  const { kpis, appointments, revenueTrend7d, clinic } = data;
  const filtered = doctorFilter ? appointments.filter((a) => a.doctor.id === doctorFilter) : appointments;
  const filterDoctor = data.doctors.find((d) => d.id === doctorFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-2 text-[0.625rem]">
            <span aria-hidden className="hairline-gold inline-block h-px w-8" />
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="title-lux mt-1 text-[1.75rem]">{clinic.name}</h1>
          {filterDoctor ? <p className="text-xs text-[#9A8F84]">Filtered: {filterDoctor.name} · <button onClick={onClearFilter} className="text-[#B8893D] underline">clear</button></p> : <p className="text-xs text-[#9A8F84]">{clinic.city} · all doctors</p>}
        </div>
        <div className="flex items-center gap-2">
          {clinic.bookingSlug && <Link href={`/clinic/book/${clinic.bookingSlug}`} target="_blank" className="btn-glass-lux h-9 rounded-full px-3.5 text-xs font-medium text-[#5C544D]"><span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" />Booking page</span></Link>}
          <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium shadow-sm ring-1 ring-[#EFE9E0]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9DB89E] animate-pulse" /> Live
          </div>
        </div>
      </div>

      {/* KPI cards — staggered choreography, count-up numerals */}
      <StaggerGroup className="grid grid-cols-2 gap-3 lg:grid-cols-4" stagger={0.08}>
        <StaggerItem className="h-full"><Kpi icon={Users} label="Patients" value={kpis.patients} sub="registered" accent="#A16207" /></StaggerItem>
        <StaggerItem className="h-full"><Kpi icon={CalendarDays} label="Today" value={kpis.appointmentsToday} sub={`${kpis.done} done`} accent="#9DB89E" /></StaggerItem>
        <StaggerItem className="h-full"><Kpi icon={Clock} label="Waiting" value={kpis.waiting} sub="in queue" accent="#C9962E" /></StaggerItem>
        <StaggerItem className="h-full"><Kpi icon={Wallet} label="Revenue" value={kpis.revenueToday} prefix="₹" sub="today" accent="#B8860B" /></StaggerItem>
      </StaggerGroup>

      {/* Queue — patient cards */}
      <div>
        <h3 className="mb-3 font-serif text-base font-semibold">Today&apos;s Queue {filterDoctor && `· ${filterDoctor.name}`}</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-[#9A8F84]">No appointments {filterDoctor ? "for this doctor" : "today"}.</p>}
          {filtered.map((a, i) => {
            const s = STATUS[a.status] || STATUS.booked;
            const time = new Date(a.slot).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
            const isOnline = a.source === "online";
            return (
              <motion.button
                key={a.id}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.25 + (i % 9) * 0.05, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2 }}
                onClick={() => (a.status === "booked" || a.status === "arrived") && onConsult(a)}
                className={cn("group relative overflow-hidden rounded-2xl border bg-white p-4 text-left shadow-sm ring-1 ring-[#EFE9E0] transition-all hover:shadow-md", (a.status === "done" || a.status === "cancelled") && "opacity-60")}
              >
                {/* status accent bar */}
                <div className={cn("absolute inset-x-0 top-0 h-1", s.bg)} />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FAF7F2] font-serif text-sm font-bold text-[#5C544D]">#{a.tokenNo}</span>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{a.patient.name}</p>
                      <p className="text-[0.65rem] text-[#9A8F84]">{a.patient.mrn} · {a.patient.age}{a.patient.gender ? `/${a.patient.gender[0]}` : ""} {a.patient.bloodGroup ? `· ${a.patient.bloodGroup}` : ""}</p>
                    </div>
                  </div>
                  <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-medium", s.bg, s.text)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                    {s.label}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[0.65rem] text-[#9A8F84]">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{time}</span>
                  <span>{a.doctor.name}</span>
                  {isOnline && <span className="flex items-center gap-0.5 rounded-full bg-[#9DB89E]/15 px-1.5 py-0.5 text-[0.55rem] font-medium text-[#5A7A5B]"><MessageCircle className="h-2.5 w-2.5" />Online</span>}
                  {a.patient.abhaId && <span className="flex items-center gap-0.5 text-[0.55rem] text-[#5A7A5B]"><Shield className="h-2.5 w-2.5" />ABHA</span>}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============== PATIENTS ============== */

function PatientsTab() {
  const [patients, setPatients] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [watchKey, setWatchKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/clinic/patients?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      setPatients(d.patients || []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-serif text-[1.75rem] font-semibold tracking-tight">Patients</h1><p className="text-sm text-[#9A8F84]">{patients.length} registered</p></div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-full bg-[#2A2622] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#3D352E]"><Plus className="h-3.5 w-3.5" />New patient</button>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A8F84]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, MRN, or phone…" className="h-11 w-full rounded-xl bg-white pl-10 pr-4 text-sm shadow-sm ring-1 ring-[#EFE9E0] outline-none focus:ring-2 focus:ring-[#A16207]/40" />
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#EFE9E0]">
        <div className="max-h-[60vh] overflow-auto">
          {patients.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-[#EFE9E0] px-4 py-3 last:border-0 transition-colors hover:bg-[#FAF7F2]">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#F3EEE6] to-[#E5DFD4] text-xs font-bold text-[#5C544D]">{p.name.split(" ").map((x: string) => x[0]).join("").slice(0, 2)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{p.name} {p.abhaId && <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-[#9DB89E]/15 px-1 py-0.5 text-[0.55rem] font-medium text-[#5A7A5B]"><Shield className="h-2.5 w-2.5" />ABHA</span>}</p>
                <p className="text-[0.65rem] text-[#9A8F84]">{p.mrn} · {p.age}{p.gender ? `/${p.gender[0]}` : ""} {p.bloodGroup ? `· ${p.bloodGroup}` : ""} · {p.phone || "no phone"}</p>
              </div>
              {p.allergy && <span className="flex items-center gap-1 rounded-full bg-[#C9962E]/15 px-2 py-0.5 text-[0.6rem] font-medium text-[#B8893D]">⚠ {p.allergy}</span>}
              <span className="rounded-full bg-[#F3EEE6] px-2 py-0.5 text-[0.6rem] font-medium text-[#5C544D]">{p._count?.visits || 0} visits</span>
            </div>
          ))}
          {!loading && patients.length === 0 && <p className="py-12 text-center text-sm text-[#9A8F84]">No patients found.</p>}
        </div>
      </div>
      <ChronicWatchlist refreshKey={watchKey} />
      <AddPatientDialog open={showAdd} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); setQ(""); setWatchKey((k) => k + 1); }} />
    </div>
  );
}

/* ============== CHRONIC CARE WATCHLIST ============== */
/* Joins the patient roster to the ICMR plan library at /api/clinic/chronic-care.
   Conditions come from the patient's chronic-conditions field plus the latest
   recorded visit diagnosis (fuzzy-matched the same way the route matches).
   Last-visit recency rides on the additive `visits` field of patients GET. */

function cadenceDays(freq: string): number | null {
  const f = (freq || "").toLowerCase();
  if (f.includes("annual")) return 365;
  if (f.includes("week")) return 7;
  const m = f.match(/(\d+)\s*(day|week|month|year)/);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] === "day" ? n : m[2] === "week" ? n * 7 : m[2] === "month" ? n * 30 : n * 365;
}

function matchPlanKey(dx: string, keys: string[]): string | null {
  const l = (dx || "").trim().toLowerCase();
  if (!l) return null;
  return keys.find((k) => k.toLowerCase().includes(l) || l.includes(k.toLowerCase())) || null;
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function agoLabel(iso: string): string {
  const d = daysSince(iso);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function ChronicWatchlist({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [plans, setPlans] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const [pres, crest] = await Promise.all([fetch("/api/clinic/patients"), fetch("/api/clinic/chronic-care").then((r) => r.json())]);
        if (!pres.ok) throw new Error();
        const pd = await pres.json();
        const keys: string[] = crest.plans || [];
        const planMap: Record<string, any> = {};
        await Promise.all(keys.map(async (k) => {
          const d = await fetch(`/api/clinic/chronic-care?diagnosis=${encodeURIComponent(k)}`).then((r) => r.json());
          if (d.plan) planMap[k] = d.plan;
        }));
        if (!alive) return;
        setPlans(planMap);
        const planKeys = Object.keys(planMap);
        const chronic = (pd.patients || []).filter((p: any) => {
          if (p.chronicDx && p.chronicDx.trim()) return true;
          const last = p.visits?.[0];
          return !!(last?.diagnosis && matchPlanKey(last.diagnosis, planKeys));
        });
        setRows(chronic);
      } catch {
        if (alive) { setRows([]); setFailed(true); }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [refreshKey]);

  const planKeys = Object.keys(plans);

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#EFE9E0]">
      <div className="flex items-center justify-between border-b border-[#EFE9E0] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#B8860B]/10 text-[#B8860B]"><HeartPulse className="h-3.5 w-3.5" aria-hidden="true" /></span>
          <div>
            <h3 className="font-serif text-sm font-semibold">Chronic care watchlist</h3>
            <p className="text-[0.6rem] text-[#9A8F84]">Patients with chronic conditions · ICMR cadence vs last recorded visit</p>
          </div>
        </div>
        {!loading && <span className="rounded-full bg-[#F3EEE6] px-2 py-0.5 text-[0.6rem] font-medium text-[#5C544D]">{rows.length} tracked</span>}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-4 text-xs text-[#9A8F84]"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading chronic-care roster…</div>
      ) : failed ? (
        <p className="px-4 py-5 text-center text-sm text-[#9A8F84]">Could not load the watchlist right now.</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[#9A8F84]">No chronic-care patients yet — diagnoses appear as visits are recorded.</p>
      ) : (
        rows.map((p) => {
          const last = p.visits?.[0] || null;
          const dxs = (p.chronicDx || "").split(",").map((s: string) => s.trim()).filter(Boolean);
          const visitDxKey = last?.diagnosis ? matchPlanKey(last.diagnosis, planKeys) : null;
          if (visitDxKey && !dxs.some((d: string) => matchPlanKey(d, [visitDxKey]))) dxs.push(visitDxKey);
          const gapKey = dxs.map((d: string) => matchPlanKey(d, planKeys)).find(Boolean) || null;
          const topCheckup = gapKey ? plans[gapKey]?.checkups?.[0] : null;
          const cadence = topCheckup ? cadenceDays(topCheckup.frequency) : null;
          const overdue = !!(last?.createdAt && cadence && daysSince(last.createdAt) > cadence);
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 border-b border-[#EFE9E0] px-4 py-3 last:border-0 transition-colors hover:bg-[#FAF7F2]">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#F3EEE6] to-[#E5DFD4] text-xs font-bold text-[#5C544D]">{p.name.split(" ").map((x: string) => x[0]).join("").slice(0, 2)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-[0.65rem] text-[#9A8F84]">{p.mrn} · {p.age}{p.gender ? `/${p.gender[0]}` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {dxs.map((d: string) => <span key={d} className="rounded-full bg-[#9DB89E]/15 px-2 py-0.5 text-[0.6rem] font-medium text-[#5A7A5B]">{d}</span>)}
                {topCheckup && (
                  <span title={topCheckup.guideline} className={cn("rounded-full px-2 py-0.5 text-[0.6rem] font-medium", overdue ? "bg-[#C9962E]/15 text-[#B8893D]" : "bg-[#F3EEE6] text-[#5C544D]")}>
                    {topCheckup.test} · {topCheckup.frequency}{overdue ? " · overdue" : ""}
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 text-[0.65rem] text-[#9A8F84]"><Clock className="h-3 w-3" aria-hidden="true" />{last?.createdAt ? `Last visit ${agoLabel(last.createdAt)}` : "No visits recorded"}</span>
            </div>
          );
        })
      )}
      {!loading && !failed && rows.length > 0 && (
        <p className="border-t border-[#EFE9E0] px-4 py-2.5 text-[0.6rem] leading-relaxed text-[#9A8F84]">
          Conditions come from the patient record and the latest visit diagnosis, matched to the ICMR plan library — cadence hints are reference guidance, not scheduled appointments.
        </p>
      )}
    </div>
  );
}

function AddPatientDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ name: "", age: "", gender: "male", bloodGroup: "", phone: "", allergy: "", chronicDx: "", abhaId: "" });
  const [abhaProfile, setAbhaProfile] = useState<any>(null);
  const [abhaLoading, setAbhaLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const lookupAbha = async () => {
    if (!form.abhaId || form.abhaId.length < 8) { toast.error("Enter a valid ABHA ID"); return; }
    setAbhaLoading(true);
    try {
      const res = await fetch("/api/clinic/abha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ abhaId: form.abhaId }) });
      if (!res.ok) throw new Error();
      const d = await res.json();
      const p = d.profile;
      setAbhaProfile(p);
      setForm({ ...form, name: p.name, age: String(p.age), gender: p.gender, bloodGroup: p.bloodGroup, phone: p.phone, allergy: "" });
      toast.success("ABHA demo profile generated (simulated — ABDM link is on the roadmap)");
    } catch { toast.error("Could not fetch ABHA profile"); } finally { setAbhaLoading(false); }
  };

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/clinic/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, age: form.age ? Number(form.age) : null, abhaProfile }) });
      if (!res.ok) throw new Error();
      const d = await res.json();
      toast.success(`Registered ${d.patient.mrn}`);
      setForm({ name: "", age: "", gender: "male", bloodGroup: "", phone: "", allergy: "", chronicDx: "", abhaId: "" });
      setAbhaProfile(null);
      onAdded();
    } catch { toast.error("Could not register"); } finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EFE9E0] px-5 py-4">
              <h3 className="font-serif text-base font-semibold">New patient</h3>
              <button onClick={onClose} aria-label="Close dialog" className="grid h-7 w-7 place-items-center rounded-full text-[#9A8F84] hover:bg-[#F3EEE6]"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              {/* ABHA lookup */}
              <div className="col-span-2">
                <label className="text-xs text-[#9A8F84]">ABHA ID (ABDM) — demo lookup, auto-fills profile</label>
                <div className="mt-1.5 flex gap-2">
                  <input value={form.abhaId} onChange={(e) => setForm({ ...form, abhaId: e.target.value })} placeholder="e.g. 91-1234-5678-9012" className="h-10 flex-1 rounded-lg bg-[#FAF7F2] px-3 text-sm ring-1 ring-[#EFE9E0] outline-none focus:ring-2 focus:ring-[#A16207]/40" />
                  <button onClick={lookupAbha} disabled={abhaLoading} className="flex items-center gap-1.5 rounded-lg bg-[#9DB89E]/15 px-3 text-xs font-medium text-[#5A7A5B] hover:bg-[#9DB89E]/25 disabled:opacity-50">{abhaLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}Fetch</button>
                </div>
              </div>
              <In label="Full name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} cls="col-span-2" />
              <In label="Age" value={form.age} onChange={(v) => setForm({ ...form, age: v })} type="number" />
              <div><label className="text-xs text-[#9A8F84]">Gender</label><select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="mt-1.5 h-10 w-full rounded-lg bg-[#FAF7F2] px-3 text-sm ring-1 ring-[#EFE9E0] outline-none focus:ring-2 focus:ring-[#A16207]/40"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
              <In label="Blood group" value={form.bloodGroup} onChange={(v) => setForm({ ...form, bloodGroup: v })} />
              <In label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <In label="Allergies" value={form.allergy} onChange={(v) => setForm({ ...form, allergy: v })} cls="col-span-2" />
              <In label="Chronic conditions" value={form.chronicDx} onChange={(v) => setForm({ ...form, chronicDx: v })} cls="col-span-2" />
            </div>
            <div className="flex gap-2 border-t border-[#EFE9E0] p-4">
              <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-[#9A8F84] hover:bg-[#F3EEE6]">Cancel</button>
              <button onClick={submit} disabled={saving} className="flex-[2] rounded-xl bg-[#2A2622] py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Register patient"}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function In({ label, value, onChange, type = "text", cls }: { label: string; value: string; onChange: (v: string) => void; type?: string; cls?: string }) {
  return <div className={cls}><label className="text-xs text-[#9A8F84]">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg bg-[#FAF7F2] px-3 text-sm ring-1 ring-[#EFE9E0] outline-none focus:ring-2 focus:ring-[#A16207]/40" /></div>;
}

/* ============== OTHER TABS (simplified) ============== */

function AppointmentsTab() {
  return <div className="space-y-4"><h1 className="font-serif text-2xl font-semibold">Appointments</h1><p className="text-sm text-[#9A8F84]">Manage upcoming and past appointments</p><div className="grid place-items-center rounded-2xl border border-dashed border-[#EFE9E0] py-16 text-sm text-[#9A8F84]">Appointment calendar coming soon</div></div>;
}

function PrescriptionsTab() {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/clinic/billing").then((r) => r.json()).then(() => {}).catch(() => {}).finally(() => setLoading(false)); }, []);
  return <div className="space-y-4"><h1 className="font-serif text-2xl font-semibold">Prescriptions</h1><p className="text-sm text-[#9A8F84]">Recent prescriptions are recorded with each visit — open a patient to review or print them</p><div className="grid place-items-center rounded-2xl border border-dashed border-[#EFE9E0] py-16 text-sm text-[#9A8F84]">Prescription history loads with saved visits</div></div>;
}

function BillingTab() {
  const [bills, setBills] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/clinic/billing").then((r) => r.json()).then((d) => { setBills(d.bills || []); setSummary(d.summary || null); }).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#9A8F84]" /></div>;
  return (
    <div className="space-y-5">
      <div><h1 className="font-serif text-[1.75rem] font-semibold tracking-tight">Billing</h1><p className="text-sm text-[#9A8F84]">Invoices &amp; payments</p></div>
      {summary && <div className="grid grid-cols-3 gap-3"><Kpi icon={Wallet} label="Collected" value={`₹${(summary.collected / 1000).toFixed(1)}k`} sub="all time" accent="#9DB89E" /><Kpi icon={Clock} label="Outstanding" value={`₹${(summary.outstanding / 1000).toFixed(1)}k`} sub="unpaid" accent="#B8860B" /><Kpi icon={FileText} label="Invoices" value={summary.count} sub="total" accent="#A16207" /></div>}
      <div className="space-y-2">
        {bills.length === 0 && <p className="py-10 text-center text-sm text-[#9A8F84]">No invoices yet.</p>}
        {bills.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#EFE9E0]">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#F3EEE6]"><FileText className="h-4 w-4 text-[#9A8F84]" /></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">{b.description}</p><p className="text-[0.65rem] text-[#9A8F84]">{b.invoiceNo} · {b.patient.name} · {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p></div>
            <p className="font-serif text-base font-bold tabular-nums">₹{b.total.toLocaleString("en-IN")}</p>
            <span className={cn("rounded-full px-2.5 py-1 text-[0.65rem] font-semibold", b.status === "paid" ? "bg-[#9DB89E]/15 text-[#5A7A5B]" : "bg-[#B8860B]/15 text-[#8A5A04]")}>{b.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportsTab({ data }: { data: DashboardData }) {
  const { revenueTrend7d } = data;
  return (
    <div className="space-y-5">
      <div><h1 className="font-serif text-[1.75rem] font-semibold tracking-tight">Reports</h1><p className="text-sm text-[#9A8F84]">Clinic insights &amp; trends</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Users} label="Patients" value={data.kpis.patients} accent="#A16207" />
        <Kpi icon={CalendarDays} label="Today" value={data.kpis.appointmentsToday} accent="#9DB89E" />
        <Kpi icon={TrendingUp} label="Revenue 7d" value={`₹${revenueTrend7d.reduce((s, r) => s + r.revenue, 0).toLocaleString("en-IN")}`} accent="#C9962E" />
        <Kpi icon={Clock} label="Outstanding" value={`₹${data.kpis.outstanding.toLocaleString("en-IN")}`} accent="#B8860B" />
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#EFE9E0]">
        <h3 className="mb-3 font-serif text-base font-semibold">Revenue · last 7 days</h3>
        <div className="flex h-32 items-end gap-1.5">
          {revenueTrend7d.map((r, i) => {
            const max = Math.max(...revenueTrend7d.map((x) => x.revenue), 1);
            return <div key={i} className="flex flex-1 flex-col items-center gap-1.5"><motion.div className="w-full rounded-t-md bg-gradient-to-t from-[#A16207] to-[#C9962E]" initial={{ height: 0 }} whileInView={{ height: `${(r.revenue / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.05 }} style={{ minHeight: r.revenue > 0 ? 3 : 0 }} /><span className="text-[0.5rem] text-[#9A8F84]">{r.date.slice(-2)}</span></div>;
          })}
        </div>
      </div>
    </div>
  );
}

/* ============== CONSULT MODAL — SOAP + HealthPlix Rx ============== */

function ConsultModal({ data, onClose, onSaved }: { data: { appointmentId: string; patient: any; doctor: any; doctorFee: number } | null; onClose: () => void; onSaved: () => void }) {
  const [soap, setSoap] = useState({ chiefComplaint: "", vitalsBP: "", vitalsPulse: "", vitalsTemp: "", vitalsSpo2: "", vitalsRBS: "", weight: "", diagnosis: "", advice: "", followUp: "" });
  const [rx, setRx] = useState<{ drug: string; salt: string; strength: string; freq: { m: boolean; a: boolean; e: boolean; bed: boolean }; duration: string; instructions: string }[]>([]);
  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  /* reset + pull the patient's real visit history for review
     before writing today's note (EMR-grade, not a blind form) */
  useEffect(() => {
    if (!data) return;
    setSoap({ chiefComplaint: "", vitalsBP: "", vitalsPulse: "", vitalsTemp: "", vitalsSpo2: "", vitalsRBS: "", weight: "", diagnosis: "", advice: "", followUp: "" });
    setRx([]);
    setHistory([]);
    let alive = true;
    fetch(`/api/clinic/visit?patientId=${data.patient.id}`).then((r) => r.json()).then((d) => {
      if (alive) setHistory(d.visits || []);
    }).catch(() => { /* offline — form still usable */ });
    return () => { alive = false; };
  }, [data]);

  // drug autocomplete
  useEffect(() => {
    const q = drugQuery.trim().toLowerCase();
    if (!q || q.length < 1) { setDrugResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/clinic/drugs?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      setDrugResults(d.drugs || []);
    }, 200);
    return () => clearTimeout(t);
  }, [drugQuery]);

  const addDrug = (drug: any) => {
    setRx([...rx, { drug: drug.brandName, salt: drug.saltName, strength: drug.strength || "", freq: { m: false, a: false, e: false, bed: false }, duration: "5 days", instructions: "" }]);
    setDrugQuery(""); setDrugResults([]);
  };

  const toggleFreq = (idx: number, key: "m" | "a" | "e" | "bed") => {
    setRx(rx.map((r, i) => i === idx ? { ...r, freq: { ...r.freq, [key]: !r.freq[key] } } : r));
  };

  const submit = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const meds = rx.map((r) => ({ medicine: `${r.drug} ${r.strength}`, dosage: [r.freq.m && "M", r.freq.a && "A", r.freq.e && "E", r.freq.bed && "Bed"].filter(Boolean).join("-"), duration: r.duration, notes: r.instructions }));
      const res = await fetch("/api/clinic/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: data.patient.id, doctorId: data.doctor.id, appointmentId: data.appointmentId, chiefComplaint: soap.chiefComplaint, vitalsBP: soap.vitalsBP, vitalsPulse: soap.vitalsPulse, vitalsTemp: soap.vitalsTemp, vitalsSpo2: soap.vitalsSpo2, diagnosis: soap.diagnosis, advice: soap.advice, followUp: soap.followUp, meds, fee: data.doctorFee }) });
      if (!res.ok) throw new Error();
      toast.success("Consultation saved & invoice generated");

      // ── Nexura Connect integration ────────────────────────────
      // After successful consult, link the patient for follow-up
      // (chat, voice, video). Never block the consult on failure.
      try {
        await fetch("/api/connect/connections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: data.doctor.id,
            doctorName: data.doctor.name,
            doctorSpecialty: data.doctor.specialization,
            patientId: data.patient.id,
            patientName: data.patient.name,
            patientPhone: data.patient.phone,
            patientAge: data.patient.age,
            patientGender: data.patient.gender,
            source: "clinic",
            sourceRefId: data.appointmentId,
          }),
        });
        toast.success("Nexura Connect: patient linked for follow-up");
      } catch {
        // Silent — consult still succeeded
      }
      onSaved();
    } catch { toast.error("Could not save"); } finally { setSaving(false); }
  };

  const freqLabel = (f: { m: boolean; a: boolean; e: boolean; bed: boolean }) => [f.m && "M", f.a && "A", f.e && "E", f.bed && "Bed"].filter(Boolean).join("-") || "—";

  return (
    <AnimatePresence>
      {data && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* header */}
            <div className="sticky top-0 z-10 border-b border-[#EFE9E0] bg-white px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#A16207]/10 text-[#A16207]"><HeartPulse className="h-4 w-4" aria-hidden="true" /></span>
                  <div>
                    <h3 className="font-serif text-base font-semibold">SOAP Consultation</h3>
                    <p className="text-[0.65rem] text-[#9A8F84]">{data.patient.name} · {data.patient.mrn} · {data.patient.age}{data.patient.gender ? `/${data.patient.gender[0]}` : ""} {data.patient.bloodGroup ? `· ${data.patient.bloodGroup}` : ""} · Dr. {data.doctor.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toast.info("Rx saved to the patient record — share it from the consultation sheet")} className="grid h-7 w-7 place-items-center rounded-full bg-[#9DB89E]/15 text-[#5A7A5B] hover:bg-[#9DB89E]/25" title="Saved to patient record"><MessageCircle className="h-3.5 w-3.5" /></button>
                  <button onClick={() => window.print()} className="grid h-7 w-7 place-items-center rounded-full bg-[#A16207]/10 text-[#A16207] hover:bg-[#A16207]/20" title="Print this page"><Download className="h-3.5 w-3.5" /></button>
                  <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full text-[#9A8F84] hover:bg-[#F3EEE6]"><X className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {/* past-visit history strip — real EMR review before the note */}
              {history.length > 0 && (
                <div className="rounded-xl border border-[#EFE9E0] bg-[#FAF7F2]/60 p-3.5">
                  <p className="text-xs font-semibold text-[#5C544D]">Past visits ({history.length})</p>
                  <div className="nxf-scroll mt-2 max-h-40 space-y-2 overflow-y-auto">
                    {history.slice(0, 6).map((v) => (
                      <div key={v.id} className="rounded-lg bg-white px-3 py-2 text-[11.5px] ring-1 ring-[#EFE9E0]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[#5C544D]">{new Date(v.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          <span className="text-[#9A8F84]">{[v.vitalsBP && `BP ${v.vitalsBP}`, v.vitalsPulse && `P ${v.vitalsPulse}`, v.vitalsSpo2 && `SpO₂ ${v.vitalsSpo2}`].filter(Boolean).join(" · ")}</span>
                        </div>
                        {v.diagnosis ? <p className="mt-0.5 text-[#5C544D]">{v.diagnosis}</p> : null}
                        {v.meds?.length ? <p className="mt-0.5 text-[#9A8F84]">Rx: {v.meds.map((m: { medicine: string }) => m.medicine).slice(0, 3).join(", ")}{v.meds.length > 3 ? ` +${v.meds.length - 3} more` : ""}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* S — Subjective */}
              <Section title="Subjective" color="#A16207">
                <In label="Chief complaint & duration" value={soap.chiefComplaint} onChange={(v) => setSoap({ ...soap, chiefComplaint: v })} />
              </Section>

              {/* O — Objective (vitals) */}
              <Section title="Objective — Vitals (nurse-recorded)" color="#9DB89E">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <In label="BP" value={soap.vitalsBP} onChange={(v) => setSoap({ ...soap, vitalsBP: v })} />
                  <In label="Pulse" value={soap.vitalsPulse} onChange={(v) => setSoap({ ...soap, vitalsPulse: v })} type="number" />
                  <In label="Temp °C" value={soap.vitalsTemp} onChange={(v) => setSoap({ ...soap, vitalsTemp: v })} type="number" />
                  <In label="SpO₂" value={soap.vitalsSpo2} onChange={(v) => setSoap({ ...soap, vitalsSpo2: v })} type="number" />
                  <In label="RBS" value={soap.vitalsRBS} onChange={(v) => setSoap({ ...soap, vitalsRBS: v })} type="number" />
                  <In label="Wt kg" value={soap.weight} onChange={(v) => setSoap({ ...soap, weight: v })} type="number" />
                </div>
              </Section>

              {/* A — Assessment (ICD-10) */}
              <Section title="Assessment — Diagnosis (ICD-10)" color="#C9962E">
                <In label="Diagnosis" value={soap.diagnosis} onChange={(v) => setSoap({ ...soap, diagnosis: v })} />
              </Section>

              {/* P — Plan (HealthPlix-style Rx) */}
              <Section title="Plan — Prescription (HealthPlix-style)" color="#B8860B">
                {/* drug autocomplete */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9A8F84]" />
                  <input value={drugQuery} onChange={(e) => setDrugQuery(e.target.value)} placeholder="Type medicine name or salt…" className="h-10 w-full rounded-lg bg-[#FAF7F2] pl-9 pr-3 text-sm ring-1 ring-[#EFE9E0] outline-none focus:ring-2 focus:ring-[#A16207]/40" />
                  {drugResults.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg bg-white shadow-xl ring-1 ring-[#EFE9E0]">
                      {drugResults.map((d) => (
                        <button key={d.id} onMouseDown={() => addDrug(d)} className="flex w-full items-center gap-2 border-b border-[#F3EEE6] px-3 py-2 text-left last:border-0 hover:bg-[#FAF7F2]">
                          <Pill className="h-3.5 w-3.5 text-[#9DB89E]" />
                          <div className="flex-1"><p className="text-xs font-medium">{d.brandName} {d.strength}</p><p className="text-[0.6rem] text-[#9A8F84]">{d.saltName} · {d.company}</p></div>
                          {d.schedule && d.schedule !== "OTC" && <span className="rounded bg-[#B8860B]/15 px-1 text-[0.55rem] font-bold text-[#8A5A04]">{d.schedule}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rx list */}
                <div className="mt-2 space-y-2">
                  {rx.map((r, i) => (
                    <div key={i} className="rounded-lg border border-[#EFE9E0] bg-[#FAF7F2] p-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold">{r.drug} <span className="text-[#9A8F84]">{r.strength}</span></p>
                        <button onClick={() => setRx(rx.filter((_, j) => j !== i))} className="text-[#9A8F84] hover:text-[#8A5A04]"><X className="h-3 w-3" /></button>
                      </div>
                      <p className="text-[0.6rem] text-[#9A8F84]">{r.salt}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {/* frequency checkboxes — M/A/E/Bedtime */}
                        {([["m", "Morning"], ["a", "Afternoon"], ["e", "Evening"], ["bed", "Bedtime"]] as const).map(([key, label]) => (
                          <button key={key} onClick={() => toggleFreq(i, key)} className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-[0.6rem] font-medium transition-colors", r.freq[key] ? "bg-[#A16207] text-white" : "bg-white text-[#9A8F84] ring-1 ring-[#EFE9E0]")}>
                            <span className={cn("h-2.5 w-2.5 rounded", r.freq[key] ? "bg-white" : "bg-[#EFE9E0]")} />
                            {label}
                          </button>
                        ))}
                        <input value={r.duration} onChange={(e) => setRx(rx.map((x, j) => j === i ? { ...x, duration: e.target.value } : x))} placeholder="5 days" className="h-7 w-16 rounded-md bg-white px-2 text-[0.65rem] ring-1 ring-[#EFE9E0] outline-none" />
                      </div>
                      <input value={r.instructions} onChange={(e) => setRx(rx.map((x, j) => j === i ? { ...x, instructions: e.target.value } : x))} placeholder="e.g. take after food" className="mt-1.5 h-7 w-full rounded-md bg-white px-2 text-[0.65rem] ring-1 ring-[#EFE9E0] outline-none" />
                    </div>
                  ))}
                  {rx.length === 0 && <p className="text-center text-xs text-[#9A8F84] py-2">Search above to add medicines</p>}
                </div>
              </Section>

              {/* advice + follow-up */}
              <Section title="Advice & Follow-up" color="#5A7A5B">
                <In label="Advice" value={soap.advice} onChange={(v) => setSoap({ ...soap, advice: v })} />
                <div><label className="text-xs text-[#9A8F84]">Follow-up date (recorded on the visit — the clinic calls to remind)</label><input type="date" value={soap.followUp} onChange={(e) => setSoap({ ...soap, followUp: e.target.value })} className="mt-1.5 h-10 w-full rounded-lg bg-[#FAF7F2] px-3 text-sm ring-1 ring-[#EFE9E0] outline-none focus:ring-2 focus:ring-[#A16207]/40" /></div>
              </Section>
            </div>

            {/* footer */}
            <div className="sticky bottom-0 flex items-center gap-2 border-t border-[#EFE9E0] bg-white p-4">
              <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-[#9A8F84] hover:bg-[#F3EEE6]">Cancel</button>
              <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-xl border border-[#EFE9E0] px-4 py-2.5 text-sm font-medium text-[#5C544D] hover:bg-[#F3EEE6]"><Download className="h-4 w-4" />Print Rx</button>
              <button onClick={submit} disabled={saving} className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-[#2A2622] py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Save &amp; bill ₹{data.doctorFee}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, prefix, sub, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; prefix?: string; sub?: string; accent: string }) {
  const spotRef = useRef<HTMLDivElement>(null);
  return (
    <motion.div
      ref={spotRef}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      onMouseMove={(e) => {
        const el = spotRef.current; if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className="card-lux spotlight-card h-full rounded-2xl p-4"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}><Icon className="h-4 w-4" strokeWidth={2} /></span>
      <p className="stat-lux mt-3 text-2xl">
        {typeof value === "number"
          ? <Counter to={value} prefix={prefix} duration={1.4} />
          : value}
      </p>
      <p className="text-xs font-medium">{label}</p>
      {sub && <p className="text-[0.6rem] text-[#9A8F84]">{sub}</p>}
    </motion.div>
  );
}
