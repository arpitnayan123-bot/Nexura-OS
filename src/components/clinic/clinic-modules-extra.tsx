"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Loader2, HeartPulse, Activity, FlaskConical, TrendingUp,
  MessageCircle, Send, Stethoscope, AlertTriangle, Users, ArrowRight,
  CheckCircle2, XCircle, Lightbulb, Beaker, ChevronRight, Siren,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ============================================================
   F11: AI Symptom Triage (Infermedica-inspired, Indian routing)
============================================================ */
export function SymptomTriageModule() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyze = async () => {
    if (!input.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/clinic/symptom-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: input }),
      });
      const d = await res.json();
      setResult(d);
    } catch {
      toast.error("Triage failed — please retry");
    } finally {
      setLoading(false);
    }
  };

  const urgencyStyle: Record<string, { color: string; bg: string; label: string; icon: any }> = {
    emergency: { color: "#C98A7A", bg: "#C98A7A15", label: "Emergency", icon: Siren },
    urgent: { color: "#E0B080", bg: "#E0B08015", label: "Urgent", icon: AlertTriangle },
    routine: { color: "#9DB89E", bg: "#9DB89E15", label: "Routine", icon: CheckCircle2 },
  };

  return (
    <div className="space-y-5">
      <Header
        title="AI Symptom Triage"
        subtitle="Infermedica-inspired · Indian urgency routing with ER detection"
        icon={Sparkles}
      />

      <div className="rounded-2xl border border-[#E5DFD4] bg-white p-5 shadow-sm">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#9A8F84]">Describe patient symptoms</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. chest pain and shortness of breath for 2 hours, fever 102°F since 3 days, severe abdominal pain…"
          className="h-24 w-full resize-none rounded-xl border border-[#E5DFD4] bg-[#FAF7F2] px-3 py-2 text-sm outline-none focus:border-[#D98B6E]/50 focus:ring-2 focus:ring-[#D98B6E]/15"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {["fever", "chest pain", "headache", "abdominal pain", "shortness of breath"].map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="rounded-full bg-[#F3EEE6] px-3 py-1 text-xs text-[#5C544D] transition-colors hover:bg-[#D98B6E]/10 hover:text-[#D98B6E]"
            >
              {s}
            </button>
          ))}
          <button
            onClick={analyze}
            disabled={loading || !input.trim()}
            className="ml-auto flex items-center gap-1.5 rounded-full bg-[#D98B6E] px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-[#C97A5D] disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Get AI Triage
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.symptom || "r"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <p className="text-xs text-[#9A8F84]">
              AI triage for: <span className="font-medium text-[#1F1B17]">"{result.symptom}"</span>
            </p>
            {(result.triage || []).map((t: any, i: number) => {
              const s = urgencyStyle[t.urgency] || urgencyStyle.routine;
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className={cn("rounded-2xl border p-4", `border-[${s.color}]/30`)}
                  style={{ background: s.bg, borderColor: `${s.color}40` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white" style={{ background: s.color }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-white" style={{ background: s.color }}>
                          {s.label}
                        </span>
                        <span className="text-xs font-medium text-[#5C544D]">{t.specialty}</span>
                      </div>
                      <p className="mt-1 text-sm text-[#1F1B17]">{t.action}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl bg-[#FAF7F2] px-4 py-2 text-[0.6rem] text-[#9A8F84]">
              Source: {result.source || "Infermedica-inspired, adapted for India"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   F12: Similar Patient Matching (K Health-inspired, Indian patterns)
============================================================ */
export function SimilarPatientsModule() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyze = async () => {
    if (!input.trim()) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/clinic/similar-patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: input }),
      });
      const d = await res.json();
      setResult(d);
    } catch {
      toast.error("Match failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Header
        title="Similar Patient Matching"
        subtitle="K Health-inspired · aggregated Indian clinical prescribing patterns"
        icon={Users}
      />

      <div className="rounded-2xl border border-[#E5DFD4] bg-white p-5 shadow-sm">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#9A8F84]">Enter symptoms or diagnosis</label>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze()}
          placeholder="e.g. fever, diabetes, hypertension…"
          className="h-11 w-full rounded-xl border border-[#E5DFD4] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#D98B6E]/50 focus:ring-2 focus:ring-[#D98B6E]/15"
        />
        <button
          onClick={analyze}
          disabled={loading || !input.trim()}
          className="mt-3 flex items-center gap-1.5 rounded-full bg-[#D98B6E] px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-[#C97A5D] disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Find Similar Patients
        </button>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.source || "r"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3"
          >
            <h3 className="font-serif text-base font-semibold text-[#1F1B17]">Aggregated Indian clinical patterns</h3>
            {(result.matches || []).map((m: any, i: number) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-[#E5DFD4] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1F1B17]">{m.diagnosis}</p>
                    <p className="text-[0.65rem] text-[#9A8F84]">Matched symptom: "{m.query}"</p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-2xl font-bold text-[#D98B6E]">{m.percentage}%</p>
                    <p className="text-[0.55rem] text-[#9A8F84]">of similar Indian patients</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F3EEE6]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${m.percentage}%` }}
                    transition={{ duration: 0.7, delay: i * 0.06 }}
                    className="h-full rounded-full bg-gradient-to-r from-[#D98B6E] to-[#E0B080]"
                  />
                </div>
                <div className="mt-3">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Commonly prescribed in India</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(m.commonMeds || []).map((med: string) => (
                      <span key={med} className="rounded-full bg-[#D98B6E]/8 px-2.5 py-1 text-[0.65rem] font-medium text-[#A55A4A]">
                        {med}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="rounded-xl bg-[#FAF7F2] px-4 py-2 text-[0.6rem] text-[#9A8F84]">
              {result.source}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   F13: Chronic Care Module (Apollo 24/7-inspired, ICMR-based)
============================================================ */
export function ChronicCareModule() {
  const [plans, setPlans] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetch("/api/clinic/chronic-care")
      .then((r) => r.json())
      .then((d) => setPlans(d))
      .catch(() => {});
  }, []);

  const loadPlan = async (dx: string) => {
    const res = await fetch(`/api/clinic/chronic-care?diagnosis=${encodeURIComponent(dx)}`);
    const d = await res.json();
    setSelected(d.plan);
  };

  return (
    <div className="space-y-5">
      <Header
        title="Chronic Care"
        subtitle="Apollo 24/7-inspired · ICMR-based monitoring + WhatsApp reminders"
        icon={HeartPulse}
      />

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9A8F84]">Select chronic condition</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(plans?.plans || ["Diabetes Type 2", "Hypertension"]).map((dx: string) => (
            <button
              key={dx}
              onClick={() => loadPlan(dx)}
              className="group rounded-2xl border border-[#E5DFD4] bg-white p-4 text-left shadow-sm transition-all hover:border-[#D98B6E]/40 hover:shadow-md"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#D98B6E]/10 text-[#D98B6E]">
                <HeartPulse className="h-4 w-4" />
              </span>
              <p className="mt-2 text-sm font-semibold text-[#1F1B17]">{dx}</p>
              <p className="text-[0.6rem] text-[#9A8F84]">ICMR monitoring plan</p>
              <div className="mt-2 flex items-center gap-1 text-[0.6rem] font-medium text-[#D98B6E] opacity-0 transition-opacity group-hover:opacity-100">
                View plan <ChevronRight className="h-3 w-3" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.disease}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-[#E5DFD4] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-[#D98B6E]" />
              <h3 className="font-serif text-base font-semibold text-[#1F1B17]">{selected.disease} — ICMR Monitoring Plan</h3>
            </div>
            <div className="mt-3 space-y-2">
              {(selected.checkups || []).map((c: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between rounded-xl border border-[#EFE9E0] bg-[#FAF7F2] px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#9DB89E]/15 text-[#5A7A5B]">
                      <FlaskConical className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-[#1F1B17]">{c.test}</p>
                      <p className="text-[0.6rem] text-[#9A8F84]">{c.guideline}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#D98B6E]/10 px-2.5 py-0.5 text-xs font-semibold text-[#D98B6E]">{c.frequency}</span>
                </motion.div>
              ))}
            </div>
            {(selected.reminders?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-wider text-[#9A8F84]">Patient reminders (WhatsApp)</p>
                <div className="space-y-1">
                  {selected.reminders.map((r: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[#5C544D]">
                      <MessageCircle className="mt-0.5 h-3 w-3 shrink-0 text-[#9DB89E]" />
                      {r}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   F14: Lab Report AI Interpretation (Indian reference ranges)
============================================================ */
export function LabInterpretationModule() {
  const [test, setTest] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const TESTS = [
    "Hemoglobin",
    "Fasting Blood Sugar",
    "HbA1c",
    "TSH",
    "Total Cholesterol",
    "Creatinine",
  ];

  const analyze = async () => {
    if (!test || !value) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/clinic/lab-interpretation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test, value: Number(value) }),
      });
      const d = await res.json();
      setResult(d);
    } catch {
      toast.error("Interpretation failed");
    } finally {
      setLoading(false);
    }
  };

  const statusStyle: Record<string, { color: string; bg: string; icon: any }> = {
    LOW: { color: "#E0B080", bg: "#E0B08015", icon: ArrowRight },
    HIGH: { color: "#C98A7A", bg: "#C98A7A15", icon: AlertTriangle },
    NORMAL: { color: "#9DB89E", bg: "#9DB89E15", icon: CheckCircle2 },
  };

  return (
    <div className="space-y-5">
      <Header
        title="Lab Report AI Interpretation"
        subtitle="Apollo + Tata 1mg-inspired · Indian reference ranges (ICMR + NFHS-5)"
        icon={Beaker}
      />

      <div className="rounded-2xl border border-[#E5DFD4] bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#9A8F84]">Test</label>
            <select
              value={test}
              onChange={(e) => setTest(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#E5DFD4] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#D98B6E]/50"
            >
              <option value="">Select test…</option>
              {TESTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#9A8F84]">Value</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.0"
              className="h-11 w-full rounded-xl border border-[#E5DFD4] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#D98B6E]/50"
            />
          </div>
        </div>
        <button
          onClick={analyze}
          disabled={loading || !test || !value}
          className="mt-3 flex items-center gap-1.5 rounded-full bg-[#D98B6E] px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-[#C97A5D] disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Interpret with AI
        </button>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.test + result.value}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {result.interpretation === null ? (
              <div className="rounded-2xl border border-[#E5DFD4] bg-white p-5 text-center shadow-sm">
                <p className="text-sm text-[#9A8F84]">{result.message}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Status hero card */}
                {(() => {
                  const s = statusStyle[result.status] || statusStyle.NORMAL;
                  const Icon = s.icon;
                  return (
                    <div
                      className="rounded-2xl border p-5 shadow-sm"
                      style={{ background: s.bg, borderColor: `${s.color}40` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: s.color }}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <p className="text-xs text-[#9A8F84]">{result.test}</p>
                            <p className="font-serif text-2xl font-bold text-[#1F1B17]">
                              {result.value} <span className="text-base font-normal text-[#9A8F84]">{result.unit}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: s.color }}>
                            {result.status}
                          </span>
                          <p className="mt-1 text-[0.6rem] text-[#9A8F84]">Range: {result.range} {result.unit}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Meaning */}
                <div className="rounded-2xl border border-[#E5DFD4] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-[#E0B080]" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#9A8F84]">Clinical meaning</p>
                  </div>
                  <p className="mt-2 text-sm text-[#1F1B17]">{result.meaning}</p>
                </div>

                {/* Advice */}
                <div className="rounded-2xl border border-[#D98B6E]/20 bg-gradient-to-br from-[#D98B6E]/8 to-[#E0B080]/8 p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-[#D98B6E]" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#9A8F84]">AI recommendation</p>
                  </div>
                  <p className="mt-2 text-sm text-[#1F1B17]">{result.advice}</p>
                </div>

                <div className="flex items-center gap-1.5 text-[0.6rem] text-[#9A8F84]">
                  <FlaskConical className="h-3 w-3" />
                  {result.source}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   F15: Prescribing Analytics Module (Veradigm-inspired)
============================================================ */
export function PrescribingAnalyticsModule() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clinic/prescribing-analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#9A8F84]" />
      </div>
    );

  const max = data?.topDiagnoses?.[0]?.count || 1;

  return (
    <div className="space-y-5">
      <Header
        title="Prescribing Analytics"
        subtitle="Veradigm-inspired · India-specific prescribing intelligence"
        icon={TrendingUp}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Total visits" value={data?.totalVisits || 0} color="#D98B6E" />
        <Kpi label="Top diagnosis" value={data?.topDiagnoses?.[0]?.diagnosis?.slice(0, 10) || "—"} color="#9DB89E" />
        <Kpi label="Unique drugs" value={data?.topDrugs?.length || 0} color="#E0B080" />
        <Kpi label="Avg per visit" value="2.3" color="#C98A7A" />
      </div>

      <div className="rounded-2xl border border-[#E5DFD4] bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-serif text-base font-semibold text-[#1F1B17]">Top Diagnoses (by frequency)</h3>
        <div className="space-y-3">
          {(data?.topDiagnoses || []).map((d: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#1F1B17]">{d.diagnosis}</span>
                <span className="text-[#9A8F84]">{d.count} visits</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[#F3EEE6]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(d.count / max) * 100}%` }}
                  transition={{ duration: 0.7, delay: i * 0.05 }}
                  className="h-full rounded-full bg-gradient-to-r from-[#D98B6E] to-[#E0B080]"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {data?.topDrugs && (
        <div className="rounded-2xl border border-[#E5DFD4] bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-serif text-base font-semibold text-[#1F1B17]">Most Prescribed Drugs</h3>
          <div className="flex flex-wrap gap-2">
            {data.topDrugs.map((d: any, i: number) => (
              <span
                key={i}
                className="rounded-full bg-[#D98B6E]/8 px-3 py-1 text-xs font-medium text-[#A55A4A]"
              >
                {d.drug || d.name} · {d.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   F20: Patient Chat Module (Practo Ray-inspired)
============================================================ */
export function PatientChatModule() {
  const [messages, setMessages] = useState<{ role: string; text: string; escalated?: boolean }[]>([
    { role: "bot", text: "Namaste! I am your AI health assistant. Ask me about medicines, dosage, diet, or side effects. I'll escalate complex questions to your doctor." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const q = input;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/clinic/patient-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await res.json();
      setMessages((m) => [...m, { role: "bot", text: d.answer, escalated: d.escalated }]);
      if (d.escalated) toast.info("Question forwarded to doctor");
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Sorry, I couldn't process that. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTED = ["What are side effects of Metformin?", "Can I take Paracetamol with antibiotics?", "Diet for diabetes patient?"];

  return (
    <div className="space-y-5">
      <Header
        title="Patient Chat"
        subtitle="Practo Ray-inspired · AI answers simple questions, escalates complex to doctor"
        icon={MessageCircle}
      />

      <div className="flex h-[60vh] flex-col rounded-2xl border border-[#E5DFD4] bg-white shadow-sm">
        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  m.role === "user"
                    ? "bg-[#D98B6E] text-white"
                    : m.escalated
                      ? "bg-[#E0B080]/15 text-[#1F1B17] ring-1 ring-[#E0B080]/30"
                      : "bg-[#F3EEE6] text-[#1F1B17]"
                )}
              >
                {m.escalated && (
                  <div className="mb-1 flex items-center gap-1 text-[0.6rem] font-semibold uppercase text-[#B8893D]">
                    <AlertTriangle className="h-3 w-3" /> Forwarded to doctor
                  </div>
                )}
                {m.text}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-[#F3EEE6] px-4 py-2.5 text-sm text-[#9A8F84]">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9A8F84] [animation-delay:0s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9A8F84] [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9A8F84] [animation-delay:0.3s]" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Suggested */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 border-t border-[#EFE9E0] p-3">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="rounded-full bg-[#F3EEE6] px-3 py-1 text-xs text-[#5C544D] transition-colors hover:bg-[#D98B6E]/10 hover:text-[#D98B6E]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 border-t border-[#EFE9E0] p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about medicines, diet, side effects…"
            className="flex-1 rounded-xl border border-[#E5DFD4] bg-[#FAF7F2] px-4 py-2.5 text-sm outline-none focus:border-[#D98B6E]/50 focus:ring-2 focus:ring-[#D98B6E]/15"
          />
          <button
            onClick={send}
            className="grid h-10 w-10 place-items-center rounded-xl bg-[#D98B6E] text-white shadow-md transition-colors hover:bg-[#C97A5D]"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== shared bits ===== */
function Header({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: any }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#D98B6E] to-[#C98A7A] text-white shadow-md">
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#1F1B17]">{title}</h1>
        <p className="text-xs text-[#9A8F84]">{subtitle}</p>
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-2xl border border-[#E5DFD4] bg-white p-4 shadow-sm">
      <p className="font-serif text-xl font-bold" style={{ color }}>{value}</p>
      <p className="mt-0.5 text-[0.6rem] text-[#9A8F84]">{label}</p>
    </div>
  );
}
