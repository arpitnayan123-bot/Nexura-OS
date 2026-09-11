"use client";

/* ============================================================
 * FORESIGHT EXPERIENCE — root client state machine.
 * landing | wizard(10) | running | results | history | settings
 * - form autosaves to localStorage (survives reloads)
 * - language persists (en/hi)
 * - run posts to the server engine; report renders results
 * - boot shells are inline-styled: never render white
 * ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, History as HistoryIcon, Settings as SettingsIcon } from "lucide-react";
import type { ForesightInput, ForesightReport } from "@/modules/foresight/types";
import { Landing } from "./landing";
import { ResultsView } from "./results";
import { HistoryView, SettingsView, SummarySheet, type HistoryRun } from "./extras";
import {
  EMPTY_FORM, StepActivity, StepDiet, StepEnvironment, StepHistory,
  StepLabs, StepProfile, StepReview, StepSleep, StepSymptoms, StepVitals,
  type FsForm,
} from "./intake";
import { FsError, FsLoader, tr, type FsLang } from "./ui";
import { cn } from "@/lib/utils";

const FORM_KEY = "nx_fs_form";
const LANG_KEY = "nx_fs_lang";

type View = "landing" | "wizard" | "running" | "results" | "history" | "settings";

const STEPS = [
  { id: "profile", label: "You" },
  { id: "symptoms", label: "Symptoms" },
  { id: "diet", label: "Diet" },
  { id: "activity", label: "Movement" },
  { id: "sleep", label: "Sleep" },
  { id: "vitals", label: "Readings" },
  { id: "labs", label: "Labs" },
  { id: "history", label: "History" },
  { id: "environment", label: "Environment" },
  { id: "review", label: "Review" },
] as const;

const RUNNING_LINES = [
  "Screening for emergencies first…",
  "Weighing 60+ factors across twelve domains…",
  "Calibrating for South-Asian thresholds…",
  "Drawing your health halo…",
];

function loadForm(): FsForm {
  if (typeof window === "undefined") return EMPTY_FORM;
  try {
    const raw = window.localStorage.getItem(FORM_KEY);
    if (!raw) return EMPTY_FORM;
    const parsed = JSON.parse(raw) as Partial<FsForm>;
    return {
      ...EMPTY_FORM,
      ...parsed,
      profile: { ...EMPTY_FORM.profile, ...parsed.profile },
      diet: { ...EMPTY_FORM.diet, ...parsed.diet },
      activity: { ...EMPTY_FORM.activity, ...parsed.activity },
      sleep: { ...EMPTY_FORM.sleep, ...parsed.sleep },
      vitals: { ...parsed.vitals },
      labs: { ...parsed.labs },
      history: { ...EMPTY_FORM.history, ...parsed.history },
      environment: { ...EMPTY_FORM.environment, ...parsed.environment },
      symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
    };
  } catch {
    return EMPTY_FORM;
  }
}

export function ForesightExperience() {
  const [lang, setLangState] = useState<FsLang>("en");
  const [view, setView] = useState<View>("landing");
  const [step, setStep] = useState(0);
  const [form, setFormState] = useState<FsForm>(EMPTY_FORM);
  const [bootState, setBootState] = useState<"loading" | "ready">("loading");
  const [runError, setRunError] = useState<string | null>(null);
  const [report, setReport] = useState<ForesightReport | null>(null);
  const [input, setInput] = useState<ForesightInput | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [historyCount, setHistoryCount] = useState(0);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [runningLine, setRunningLine] = useState(0);
  const topRef = useRef<HTMLDivElement | null>(null);
  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: "auto", block: "start" });

  /* boot: hydrate form + language, count history (fail-soft).
     All setState is deferred to a microtask so the effect body
     never calls setState synchronously (cascading-render rule). */
  useEffect(() => {
    let alive = true;
    const hydrate = async () => {
      const loaded = loadForm();
      let l: string | null = null;
      try { l = window.localStorage.getItem(LANG_KEY); } catch { /* private mode */ }
      let count = 0;
      try {
        const j = await fetch("/api/nx/foresight/history").then((r) => r.json());
        if (j?.ok) count = (j.data?.runs ?? []).length;
      } catch { /* offline — boot still succeeds */ }
      if (!alive) return;
      setFormState(loaded);
      if (l === "hi") setLangState("hi");
      setHistoryCount(count);
      setBootState("ready");
    };
    void hydrate();
    return () => { alive = false; };
  }, []);

  const setForm = useCallback((patch: Partial<FsForm>) => {
    setFormState((prev) => {
      const next = { ...prev, ...patch };
      try { window.localStorage.setItem(FORM_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const setLang = useCallback((l: FsLang) => {
    setLangState(l);
    try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  }, []);

  /* running narration */
  useEffect(() => {
    if (view !== "running") return;
    const t = setInterval(() => setRunningLine((n) => (n + 1) % RUNNING_LINES.length), 1400);
    return () => clearInterval(t);
  }, [view]);

  const startRun = useCallback(async () => {
    setView("running");
    setRunError(null);
    scrollToTop();
    try {
      const res = await fetch("/api/nx/foresight/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        setRunError(typeof j?.error === "string" ? j.error : tr(lang, "app.errorBody"));
        setView("wizard");
        return;
      }
      setReport(j.data.report as ForesightReport);
      setInput((j.data.input as ForesightInput | undefined) ?? null);
      setRunId(j.data.id as string);
      setHistoryCount((n) => n + 1);
      setView("results");
      scrollToTop();
    } catch {
      setRunError(tr(lang, "app.errorBody"));
      setView("wizard");
    }
  }, [form, lang]);

  const openHistoryItem = useCallback(async (id: string) => {
    try {
      const j = await fetch(`/api/nx/foresight/run/${id}`).then((r) => r.json());
      if (j?.ok) {
        setReport(j.data.report as ForesightReport);
        setInput((j.data.input as ForesightInput | undefined) ?? null);
        setRunId(j.data.id as string);
        setView("results");
        scrollToTop();
      }
    } catch { /* network — stay on history */ }
  }, []);

  const goLanding = () => { setView("landing"); scrollToTop(); };

  const navBtn = (label: string, target: View, Icon: typeof Activity, active: boolean) => (
    <button
      type="button"
      onClick={() => { setView(target); scrollToTop(); }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition",
        active ? "bg-amber-300/10 text-[#FDE68A]" : "text-[#C0BAA9] hover:bg-white/5 hover:text-[#FFFEFA]"
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  const stepComponent = useMemo(() => {
    switch (STEPS[step]?.id) {
      case "profile": return <StepProfile form={form} set={setForm} />;
      case "symptoms": return <StepSymptoms form={form} set={setForm} />;
      case "diet": return <StepDiet form={form} set={setForm} />;
      case "activity": return <StepActivity form={form} set={setForm} />;
      case "sleep": return <StepSleep form={form} set={setForm} />;
      case "vitals": return <StepVitals form={form} set={setForm} />;
      case "labs": return <StepLabs form={form} set={setForm} />;
      case "history": return <StepHistory form={form} set={setForm} />;
      case "environment": return <StepEnvironment form={form} set={setForm} />;
      case "review": return <StepReview form={form} />;
      default: return null;
    }
  }, [step, form, setForm]);

  const ageValid = form.profile.ageYears >= 18;
  const canContinue = step !== 0 || ageValid;

  /* ---------------- render ---------------- */

  if (bootState === "loading") {
    return <FsLoader label={tr("en", "app.loading")} />;
  }

  return (
    <div ref={topRef} className="relative z-10 flex min-h-screen flex-col">
      {/* slim experience bar */}
      <div className="sticky top-0 z-30 border-b border-white/[0.10] bg-[#0D1936]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
          <p className="nxf-eyebrow text-[10.5px] font-bold uppercase nxf-gold">
            <span aria-hidden="true" className="nxf-glyph-glow mr-1">✦</span>
            {tr(lang, "app.tag")}
          </p>
          <div className="flex items-center gap-1">
            {navBtn(tr(lang, "app.home"), "landing", Activity, view === "landing")}
            {navBtn(tr(lang, "app.history"), "history", HistoryIcon, view === "history")}
            {navBtn(tr(lang, "app.settings"), "settings", SettingsIcon, view === "settings")}
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="ml-1 inline-flex min-h-[44px] items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-[13px] font-semibold text-[#F3EFE3] transition hover:border-amber-300/50 hover:text-[#FDE68A]"
              aria-label="Switch language"
            >
              {tr(lang, "app.lang")}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
              <Landing
                onStart={() => { setView("wizard"); setStep(0); scrollToTop(); }}
                onHistory={() => { setView("history"); scrollToTop(); }}
                hasHistory={historyCount > 0}
              />
            </motion.div>
          )}

          {view === "wizard" && (
            <motion.div key="wizard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="mx-auto max-w-3xl">
              {/* progress */}
              <div className="mb-7" role="group" aria-label={`${STEPS[step].label}: step ${step + 1} of ${STEPS.length}`}>
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] nxf-gold">
                    {step + 1}/{STEPS.length} · {STEPS[step].label}
                  </p>
                  <p className="text-[11.5px] nxf-mute">Everything optional · autosaved</p>
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  {STEPS.map((s, i) => (
                    <button key={s.id} type="button" aria-label={`Step ${i + 1}: ${s.label}`}
                      onClick={() => { setStep(i); }}
                      className={cn("h-1.5 flex-1 rounded-full transition-all",
                        i < step ? "bg-amber-400/70" : i === step ? "bg-amber-300" : "bg-white/10")} />
                  ))}
                </div>
              </div>

              {step === 0 && !ageValid && form.profile.ageYears > 0 && form.profile.ageYears < 18 && (
                <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] p-4 text-[13px] nxf-body">
                  Nexura Predictive is built for adults. For under-18s, a paediatrician should lead — growth changes every rule.
                </div>
              )}

              <div className="nxf-glass p-5 sm:p-7">
                {stepComponent}
              </div>

              {runError && (
                <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/[0.07] p-3.5 text-[13px] nxf-body">{runError}</p>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="nxf-cta nxf-cta-ghost"
                  onClick={() => { if (step === 0) goLanding(); else setStep((s) => s - 1); scrollToTop(); }}
                >
                  {step === 0 ? tr(lang, "app.home") : tr(lang, "app.back")}
                </button>
                {step < STEPS.length - 1 ? (
                  <button type="button" className="nxf-cta" disabled={!canContinue}
                    onClick={() => { setStep((s) => s + 1); scrollToTop(); }}>
                    {tr(lang, "app.continue")}
                  </button>
                ) : (
                  <button type="button" className="nxf-cta" onClick={() => void startRun()}>
                    ✦ {tr(lang, "app.run")}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {view === "running" && (
            <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
              <div className="relative">
                <motion.div
                  className="h-20 w-20 rounded-full border border-amber-300/35"
                  animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="absolute inset-3 rounded-full border-2 border-amber-300/70 border-t-transparent nxf-spin" />
              </div>
              <AnimatePresence mode="wait">
                <motion.p key={runningLine} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}
                  className="text-[14px] nxf-dim">
                  {RUNNING_LINES[runningLine]}
                </motion.p>
              </AnimatePresence>
              <p className="text-[11.5px] nxf-mute">deterministic engine · versioned ruleset · no black boxes</p>
            </motion.div>
          )}

          {view === "results" && report && (
            <motion.div key={`results-${runId ?? "x"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <ResultsView
                report={report}
                input={input}
                onRerun={() => { setView("wizard"); setStep(0); scrollToTop(); }}
                onEditInputs={() => { setView("wizard"); setStep(STEPS.length - 1); scrollToTop(); }}
                onSummary={(text) => setSummaryText(text || report.doctorSummary || "")}
              />
            </motion.div>
          )}

          {view === "history" && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
              <HistoryView lang={lang} onOpen={(id) => void openHistoryItem(id)} onBack={goLanding} />
            </motion.div>
          )}

          {view === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="mx-auto max-w-2xl">
              <SettingsView lang={lang} onLang={setLang} onBack={goLanding} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto border-t border-white/[0.06] px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
          <p className="text-[11.5px] leading-relaxed nxf-mute">
            Nexura Predictive reads risk-signal patterns — it does not diagnose, prescribe or replace a doctor.
            In an emergency call 108. Mental health: Tele-MANAS 14416 (free, 24×7).
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a href="/" className="text-[13px] font-medium nxf-gold transition hover:text-[#FDE68A]">Return to Hospital OS</a>
            <p className="nxf-mono text-[10px] tracking-wider text-[#C0BAA9]">
              <span aria-hidden="true" className="nxf-glyph-glow nxf-gold">✦ </span>
              NEXURA BUILD 1.1.0 · foresight-2.0.0 · india-cal-2.0.0
            </p>
          </div>
        </div>
      </footer>

      {summaryText && <SummarySheet text={summaryText} onClose={() => setSummaryText(null)} />}
    </div>
  );
}
