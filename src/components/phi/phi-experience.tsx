/* ============================================================
 * PHI — client root: view state machine
 * landing | intake(7 steps) | running | results | history |
 * summary | settings | minor | run-error
 * Loads session + consent + profile + status on mount and
 * prefills any previously saved intake rows.
 * ============================================================ */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  History as HistoryIcon,
  Loader2,
  PauseCircle,
  Settings as SettingsIcon,
  ShieldAlert,
  UserRoundX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsentScope } from "@/modules/phi/contracts";
import { CONSENT_SCOPES, REQUIRED_FOR_ASSESSMENT } from "@/modules/phi/contracts";
import type { ConsentState, PredictiveHealthAssessment } from "@/modules/phi/contracts";
import { Button } from "@/components/ui/button";
import { Landing } from "./landing";
import { ResultsView } from "./results";
import { HistoryView } from "./history";
import { SummaryShareView } from "./summary-share";
import { SettingsView } from "./settings";
import {
  ConsentStep,
  ConditionsStep,
  LifestyleStep,
  ProfileStep,
  ReviewStep,
  SymptomsStep,
  VitalsStep,
  MENTAL_HEALTH_CATEGORIES,
  ONSET_OPTIONS,
  nextLocalId,
  type ConditionsForm,
  type LifestyleForm,
  type ProfileForm,
  type SymptomForm,
  type VitalsForm,
} from "./intake-steps";
import {
  CalmError,
  CalmLoader,
  PhiLangProvider,
  StepProgress,
  usePhiT,
} from "./ui-primitives";
import {
  createSession,
  getAssessment,
  getAssessmentHistory,
  getConsent,
  getIntake,
  getProfile,
  getStatus,
  getTrends,
  postFeedback,
  postIntake,
  putConsent,
  putProfile,
  runAssessment,
  EMPTY_PROFILE,
  PhiApiError,
  type PhiHistoryItem,
  type PhiProfile,
  type PhiStatusPayload,
} from "./api-client";
import type { TrendObservation } from "@/modules/phi/contracts";

const MIN_RUN_MS = 1800;

type View =
  | "landing"
  | "intake"
  | "running"
  | "results"
  | "history"
  | "summary"
  | "settings"
  | "minor"
  | "runerror";

const EMPTY_PROFILE_FORM: ProfileForm = {
  ageYears: "",
  sexAtBirth: "",
  pregnancyPossibility: false,
  heightCm: "",
  weightKg: "",
  waistCm: "",
  languagePref: "en",
  activityLevel: "",
  occupation: "",
  shiftWork: false,
  accessibilityNotes: "",
};

const EMPTY_CONDITIONS: ConditionsForm = {
  conditions: [],
  medications: [],
  allergies: [],
};

const EMPTY_LIFESTYLE: LifestyleForm = {
  dietaryPref: "",
  cuisine: "",
  sleepHours: "",
  sleepQuality: "fair",
  activityMinutes: "",
  fruitsVeg: "",
  tobacco: "",
  alcohol: "",
  stress: "",
  waterGlasses: "",
};

const EMPTY_VITALS: VitalsForm = {
  bp: "",
  pulse: "",
  temperature: "",
  tempUnit: "C",
  spo2: "",
  glucose: "",
  glucoseUnit: "mgdl",
  weightKg: "",
  atRest: true,
  confidence: "sure",
};

const STEP_KEYS = [
  "step.consent",
  "step.profile",
  "step.symptoms",
  "step.conditions",
  "step.lifestyle",
  "step.vitals",
  "step.review",
] as const;

type SaveState = "idle" | "saving" | "saved" | "error";

function numOrNull(v: string): number | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function durationFromOnset(onset: SymptomForm["onset"]): number {
  return ONSET_OPTIONS.find((o) => o.value === onset)?.days ?? 1;
}

function onsetFromDuration(days: unknown): SymptomForm["onset"] {
  const d = typeof days === "number" ? days : Number(days);
  if (!Number.isFinite(d)) return "today";
  if (d <= 1) return "today";
  if (d <= 5) return "fewDays";
  if (d <= 21) return "overWeek";
  return "overMonth";
}

function parseAssociated(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function str(v: unknown): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
}

export function PhiExperience() {
  return (
    <PhiLangProvider>
      <PhiExperienceInner />
    </PhiLangProvider>
  );
}

function PhiExperienceInner() {
  const { t, lang, setLang } = usePhiT();

  const [bootState, setBootState] = useState<"loading" | "error" | "ready">("loading");
  const [view, setView] = useState<View>("landing");
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [runPhase, setRunPhase] = useState(0);
  const [runError, setRunError] = useState<string | null>(null);
  const [systemNote, setSystemNote] = useState<string | null>(null);

  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [status, setStatus] = useState<PhiStatusPayload | null>(null);
  const [historyItems, setHistoryItems] = useState<PhiHistoryItem[]>([]);
  const [trends, setTrends] = useState<TrendObservation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [assessment, setAssessment] = useState<PredictiveHealthAssessment | null>(null);

  // Intake working state
  const [profileForm, setProfileForm] = useState<ProfileForm>(EMPTY_PROFILE_FORM);
  const [symptoms, setSymptoms] = useState<SymptomForm[]>([]);
  const [conditions, setConditions] = useState<ConditionsForm>(EMPTY_CONDITIONS);
  const [lifestyle, setLifestyle] = useState<LifestyleForm>(EMPTY_LIFESTYLE);
  const [vitals, setVitals] = useState<VitalsForm>(EMPTY_VITALS);

  const topRef = useRef<HTMLDivElement | null>(null);
  const scrollToTop = () =>
    topRef.current?.scrollIntoView({ behavior: "auto", block: "start" });

  /* ---------------- boot ---------------- */

  const boot = useCallback(async () => {
    setBootState("loading");
    try {
      try {
        await createSession();
      } catch (err) {
        if (err instanceof PhiApiError && err.status === 405) {
          const { getSession } = await import("./api-client");
          await getSession();
        } else {
          throw err;
        }
      }
    } catch {
      setBootState("error");
      return;
    }

    // Everything else is fail-soft — a fresh subject legitimately misses rows.
    const [consentRes, profileRes, statusRes, historyRes] = await Promise.allSettled([
      getConsent(),
      getProfile(),
      getStatus(),
      getAssessmentHistory(),
    ]);

    if (consentRes.status === "fulfilled") setConsent(consentRes.value);
    if (statusRes.status === "fulfilled") setStatus(statusRes.value);
    if (historyRes.status === "fulfilled") setHistoryItems(historyRes.value);

    if (profileRes.status === "fulfilled") {
      const p: PhiProfile = profileRes.value ?? EMPTY_PROFILE;
      setProfileForm({
        ageYears: p.ageYears != null ? String(p.ageYears) : "",
        sexAtBirth: (p.sexAtBirth ?? "") as ProfileForm["sexAtBirth"],
        pregnancyPossibility: p.pregnancyPossibility === true,
        heightCm: p.heightCm != null ? String(p.heightCm) : "",
        weightKg: p.weightKg != null ? String(p.weightKg) : "",
        waistCm: p.waistCm != null ? String(p.waistCm) : "",
        languagePref: p.languagePref === "hi" ? "hi" : "en",
        activityLevel: p.activityLevel ?? "",
        occupation: p.occupation ?? "",
        shiftWork: p.shiftWork === true,
        accessibilityNotes: p.accessibilityNotes ?? "",
      });
      if (p.dietaryPref || p.cuisine) {
        setLifestyle((prev) => ({
          ...prev,
          dietaryPref: p.dietaryPref ?? "",
          cuisine: p.cuisine ?? "",
        }));
      }
      if (p.languagePref === "hi") setLang("hi");
    }

    // Prefill intake buckets (best-effort, parallel)
    const buckets = await Promise.allSettled([
      getIntake("symptoms"),
      getIntake("conditions"),
      getIntake("medications"),
      getIntake("allergies"),
      getIntake("lifestyle"),
      getIntake("vitals"),
    ]);
    const rows = buckets.map((b) => (b.status === "fulfilled" ? b.value : []));

    const symptomRows = rows[0];
    if (symptomRows.length > 0) {
      setSymptoms(
        symptomRows.map((r) => {
          const category = str(r.category) || "general";
          return {
            localId: nextLocalId("sym"),
            category,
            severity: numOrNull(str(r.severity1to10)) ?? 3,
            onset: onsetFromDuration(r.durationDays),
            isNew: r.isNew !== false,
            isWorsening: r.isWorsening === true,
            associated: parseAssociated(r.associated),
            associatedDraft: "",
            freeText: str(r.userWording),
            mhAck: !MENTAL_HEALTH_CATEGORIES.has(category),
          };
        })
      );
    }

    const conditionRows = rows[1];
    if (conditionRows.length > 0) {
      setConditions((prev) => ({
        ...prev,
        conditions: conditionRows
          .filter((r) => str(r.name))
          .map((r) => ({
            localId: nextLocalId("cond"),
            name: str(r.name),
            status: str(r.status) || "active",
          })),
      }));
    }
    const medRows = rows[2];
    if (medRows.length > 0) {
      setConditions((prev) => ({
        ...prev,
        medications: medRows
          .filter((r) => str(r.name))
          .map((r) => ({
            localId: nextLocalId("med"),
            name: str(r.name),
            strength: str(r.strength),
            frequency: str(r.frequency),
          })),
      }));
    }
    const allergyRows = rows[3];
    if (allergyRows.length > 0) {
      setConditions((prev) => ({
        ...prev,
        allergies: allergyRows
          .filter((r) => str(r.substance))
          .map((r) => ({
            localId: nextLocalId("alr"),
            substance: str(r.substance),
            reaction: str(r.reaction),
          })),
      }));
    }

    const lifestyleRows = rows[4];
    const latestLifestyle = lifestyleRows[lifestyleRows.length - 1];
    if (latestLifestyle) {
      setLifestyle((prev) => ({
        ...prev,
        sleepHours: latestLifestyle.sleepHours != null ? String(latestLifestyle.sleepHours) : prev.sleepHours,
        sleepQuality: str(latestLifestyle.sleepQuality) || prev.sleepQuality,
        activityMinutes:
          latestLifestyle.activityMinutesWeek != null
            ? String(latestLifestyle.activityMinutesWeek)
            : prev.activityMinutes,
        fruitsVeg: str(latestLifestyle.fruitsVegFrequency) || prev.fruitsVeg,
        tobacco: str(latestLifestyle.tobacco) || prev.tobacco,
        alcohol: str(latestLifestyle.alcohol) || prev.alcohol,
        stress: str(latestLifestyle.stressLevel) || prev.stress,
        waterGlasses:
          latestLifestyle.waterGlasses != null
            ? String(latestLifestyle.waterGlasses)
            : prev.waterGlasses,
      }));
    }

    const vitalRows = rows[5];
    const latestVitals = vitalRows[vitalRows.length - 1];
    if (latestVitals) {
      const systolic = latestVitals.systolic;
      const diastolic = latestVitals.diastolic;
      const tempC = numOrNull(str(latestVitals.temperatureC));
      const glucoseVal = numOrNull(str(latestVitals.glucoseMgDl));
      setVitals((prev) => ({
        ...prev,
        bp:
          typeof systolic === "number" && typeof diastolic === "number"
            ? `${systolic}/${diastolic}`
            : prev.bp,
        pulse: latestVitals.heartRate != null ? String(latestVitals.heartRate) : prev.pulse,
        temperature:
          tempC != null ? String(Math.round(tempC * 10) / 10) : prev.temperature,
        tempUnit: "C",
        spo2: latestVitals.spo2 != null ? String(latestVitals.spo2) : prev.spo2,
        glucose: glucoseVal != null ? String(glucoseVal) : prev.glucose,
        glucoseUnit: "mgdl",
        weightKg: latestVitals.weightKg != null ? String(latestVitals.weightKg) : prev.weightKg,
        atRest: latestVitals.atRest !== false,
        confidence: latestVitals.confidence === "unsure" ? "unsure" : "sure",
      }));
    }

    setBootState("ready");
    setView("landing");
  }, [setLang]);

  useEffect(() => {
    void boot();
  }, [boot]);

  /* ---------------- step helpers ---------------- */

  const gotoStep = (next: number) => {
    setStep(next);
    setSaveState("idle");
    scrollToTop();
  };

  const advance = useCallback(() => {
    setStep((s) => {
      const next = Math.min(s + 1, STEP_KEYS.length - 1);
      return next;
    });
    setSaveState("idle");
    scrollToTop();
  }, []);

  // Ensure the symptoms step always has a row to fill
  useEffect(() => {
    if (view === "intake" && step === 2 && symptoms.length === 0) {
      setSymptoms([
        {
          localId: nextLocalId("sym"),
          category: "general",
          severity: 3,
          onset: "today",
          isNew: true,
          isWorsening: false,
          associated: [],
          associatedDraft: "",
          freeText: "",
          mhAck: false,
        },
      ]);
    }
  }, [view, step, symptoms.length]);

  /* ---------------- consent ---------------- */

  const requiredConsentMissing =
    !consent ||
    REQUIRED_FOR_ASSESSMENT.some((scope) => consent.scopes?.[scope] !== true);

  const handleConsentToggle = async (scope: ConsentScope, granted: boolean) => {
    setConsentError(null);
    setConsent((prev) =>
      prev
        ? { ...prev, scopes: { ...prev.scopes, [scope]: granted } }
        : prev
    );
    try {
      const state = await putConsent(scope, granted);
      setConsent(state);
    } catch (err) {
      setConsentError(err instanceof PhiApiError ? err.message : "Unexpected error");
    }
  };

  const handleConsentBulk = (granted: boolean) => {
    // Bulk applies locally and syncs in background (best-effort).
    setConsent((prev) => {
      const scopes: Record<string, boolean> = {};
      for (const s of CONSENT_SCOPES) scopes[s] = granted;
      return prev ? { ...prev, scopes: { ...prev.scopes, ...scopes } } : prev;
    });
    for (const scope of CONSENT_SCOPES) {
      putConsent(scope, granted).then(setConsent).catch(() => undefined);
    }
  };

  /* ---------------- step save ---------------- */

  const saveProfile = async (): Promise<boolean> => {
    setSaveState("saving");
    try {
      await putProfile({
        ageYears: numOrNull(profileForm.ageYears),
        sexAtBirth: (profileForm.sexAtBirth || null) as PhiProfile["sexAtBirth"],
        pregnancyPossibility: profileForm.pregnancyPossibility,
        heightCm: numOrNull(profileForm.heightCm),
        weightKg: numOrNull(profileForm.weightKg),
        waistCm: numOrNull(profileForm.waistCm),
        languagePref: profileForm.languagePref,
        activityLevel: profileForm.activityLevel || null,
        occupation: profileForm.occupation || null,
        shiftWork: profileForm.shiftWork,
        accessibilityNotes: profileForm.accessibilityNotes || null,
      });
      setSaveState("saved");
      return true;
    } catch (err) {
      setSaveState("error");
      if (err instanceof PhiApiError && err.code === "minor_not_supported") {
        setView("minor");
      } else {
        setFlowError(err instanceof PhiApiError ? err.message : "Unexpected error");
      }
      return false;
    }
  };

  const saveSymptoms = async (): Promise<boolean> => {
    setSaveState("saving");
    try {
      for (const s of symptoms) {
        await postIntake("symptoms", {
          category: s.category,
          severity1to10: s.severity,
          durationDays: durationFromOnset(s.onset),
          isNew: s.isNew,
          isWorsening: s.isWorsening,
          associated: s.associated,
          userWording: s.freeText,
        });
      }
      setSaveState("saved");
      return true;
    } catch (err) {
      setSaveState("error");
      setFlowError(err instanceof PhiApiError ? err.message : "Unexpected error");
      return false;
    }
  };

  const saveConditions = async (): Promise<boolean> => {
    setSaveState("saving");
    try {
      for (const c of conditions.conditions) {
        if (!c.name.trim()) continue;
        await postIntake("conditions", {
          name: c.name.trim(),
          status: c.status,
          source: "user_reported",
        });
      }
      for (const m of conditions.medications) {
        if (!m.name.trim()) continue;
        await postIntake("medications", {
          name: m.name.trim(),
          strength: m.strength.trim() || null,
          frequency: m.frequency.trim() || null,
        });
      }
      for (const a of conditions.allergies) {
        if (!a.substance.trim()) continue;
        await postIntake("allergies", {
          substance: a.substance.trim(),
          reaction: a.reaction.trim() || null,
        });
      }
      setSaveState("saved");
      return true;
    } catch (err) {
      setSaveState("error");
      setFlowError(err instanceof PhiApiError ? err.message : "Unexpected error");
      return false;
    }
  };

  const saveLifestyle = async (): Promise<boolean> => {
    setSaveState("saving");
    try {
      await postIntake("lifestyle", {
        sleepHours: numOrNull(lifestyle.sleepHours),
        sleepQuality: lifestyle.sleepQuality || null,
        activityMinutesWeek: numOrNull(lifestyle.activityMinutes),
        fruitsVegFrequency: lifestyle.fruitsVeg || null,
        tobacco: lifestyle.tobacco || null,
        alcohol: lifestyle.alcohol || null,
        stressLevel: lifestyle.stress || null,
        waterGlasses: numOrNull(lifestyle.waterGlasses),
      });
      await putProfile({
        dietaryPref: lifestyle.dietaryPref || null,
        cuisine: lifestyle.cuisine || null,
      });
      setSaveState("saved");
      return true;
    } catch (err) {
      setSaveState("error");
      setFlowError(err instanceof PhiApiError ? err.message : "Unexpected error");
      return false;
    }
  };

  const saveVitals = async (): Promise<boolean> => {
    setSaveState("saving");
    try {
      const [sys, dia] = vitals.bp.includes("/")
        ? vitals.bp.split("/").map((p) => numOrNull(p))
        : [numOrNull(vitals.bp), null];
      const tempRaw = numOrNull(vitals.temperature);
      const temperatureC =
        tempRaw == null
          ? null
          : vitals.tempUnit === "F"
            ? Math.round(((tempRaw - 32) * 5) / 9 * 10) / 10
            : tempRaw;
      const glucoseRaw = numOrNull(vitals.glucose);
      const glucoseMgDl =
        glucoseRaw == null
          ? null
          : vitals.glucoseUnit === "mmol"
            ? Math.round(glucoseRaw * 18 * 10) / 10
            : glucoseRaw;
      const heartRate = numOrNull(vitals.pulse);
      const spo2 = numOrNull(vitals.spo2);
      const weightKg = numOrNull(vitals.weightKg);
      // Nothing entered: skip saving entirely — an all-null vitals row is
      // meaningless and the server (correctly) rejects it.
      const hasAnyValue =
        sys != null ||
        dia != null ||
        heartRate != null ||
        temperatureC != null ||
        spo2 != null ||
        glucoseMgDl != null ||
        weightKg != null;
      if (!hasAnyValue) {
        setSaveState("saved");
        return true;
      }
      await postIntake("vitals", {
        systolic: sys,
        diastolic: dia,
        heartRate,
        temperatureC,
        spo2,
        glucoseMgDl,
        weightKg,
        atRest: vitals.atRest,
        confidence: vitals.confidence,
        deviceSource: "user_entered",
      });
      setSaveState("saved");
      return true;
    } catch (err) {
      setSaveState("error");
      setFlowError(err instanceof PhiApiError ? err.message : "Unexpected error");
      return false;
    }
  };

  /* ---------------- run ---------------- */

  const startRun = useCallback(async () => {
    setFlowError(null);
    setRunError(null);
    setSystemNote(null);
    setRunPhase(0);
    setView("running");
    scrollToTop();

    const phaseTimers = [
      window.setTimeout(() => setRunPhase(1), 800),
      window.setTimeout(() => setRunPhase(2), 1500),
    ];

    const delay = (ms: number) => new Promise<void>((res) => window.setTimeout(res, ms));

    try {
      const [result] = await Promise.all([runAssessment(), delay(MIN_RUN_MS)]);
      phaseTimers.forEach((id) => window.clearTimeout(id));
      setAssessment(result);
      setView("results");
      scrollToTop();
    } catch (err) {
      phaseTimers.forEach((id) => window.clearTimeout(id));
      if (err instanceof PhiApiError) {
        if (err.code === "consent_required") {
          // The engine's own message, verbatim — never paraphrased.
          setFlowError(err.message);
          setStep(0);
          setSaveState("idle");
          setView("intake");
          scrollToTop();
          return;
        }
        if (err.code === "kill_switch") {
          try {
            setStatus(await getStatus());
          } catch {
            /* keep previous status */
          }
          // The engine's own message, verbatim — shown on the landing view.
          setSystemNote(err.message);
          setView("landing");
          scrollToTop();
          return;
        }
        setRunError(err.message);
        setView("runerror");
        scrollToTop();
        return;
      }
      setRunError(null);
      setView("runerror");
      scrollToTop();
    }
  }, []);

  const handleContinue = async () => {
    setFlowError(null);
    if (step === 0) {
      if (requiredConsentMissing) return;
      advance();
      return;
    }
    if (step === 1) {
      const age = numOrNull(profileForm.ageYears);
      if (age == null) return;
      if (age < 18) {
        setView("minor");
        scrollToTop();
        return;
      }
      const ok = await saveProfile();
      if (ok) advance();
      return;
    }
    if (step === 2) {
      const ok = await saveSymptoms();
      if (ok) advance();
      return;
    }
    if (step === 3) {
      const ok = await saveConditions();
      if (ok) advance();
      return;
    }
    if (step === 4) {
      const ok = await saveLifestyle();
      if (ok) advance();
      return;
    }
    if (step === 5) {
      const ok = await saveVitals();
      if (ok) advance();
      return;
    }
    if (step === 6) {
      if (status?.killSwitch) return;
      void startRun();
    }
  };

  const handleRetrySave = () => {
    void handleContinue();
  };

  /* ---------------- history ---------------- */

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const [itemsRes, trendsRes] = await Promise.allSettled([
      getAssessmentHistory(),
      getTrends(),
    ]);
    if (itemsRes.status === "fulfilled") setHistoryItems(itemsRes.value);
    if (trendsRes.status === "fulfilled") setTrends(trendsRes.value);
    setHistoryLoading(false);
  }, []);

  const openHistory = () => {
    setView("history");
    scrollToTop();
    void loadHistory();
  };

  const openHistoryItem = async (id: string) => {
    setHistoryLoading(true);
    try {
      const full = await getAssessment(id);
      setAssessment(full);
      setView("results");
      scrollToTop();
    } catch (err) {
      setFlowError(err instanceof PhiApiError ? err.message : "Unexpected error");
    } finally {
      setHistoryLoading(false);
    }
  };

  /* ---------------- data rights ---------------- */

  const handleDataDeleted = async () => {
    setProfileForm(EMPTY_PROFILE_FORM);
    setSymptoms([]);
    setConditions(EMPTY_CONDITIONS);
    setLifestyle(EMPTY_LIFESTYLE);
    setVitals(EMPTY_VITALS);
    setConsent(null);
    setHistoryItems([]);
    setTrends([]);
    setAssessment(null);
    setView("landing");
    scrollToTop();
    void boot();
  };

  /* ---------------- render ---------------- */

  if (bootState === "loading") {
    return <CalmLoader label={t("app.loading")} />;
  }

  if (bootState === "error") {
    return (
      <CalmError
        title={t("app.errorTitle")}
        body={t("app.errorBody")}
        onRetry={() => void boot()}
        retryLabel={t("app.retry")}
      />
    );
  }

  const killSwitch = status?.killSwitch === true;

  const navButton = (
    label: string,
    target: View,
    Icon: typeof HistoryIcon,
    active: boolean
  ) => (
    <button
      key={target}
      type="button"
      onClick={() => {
        setFlowError(null);
        if (target === "history") openHistory();
        else {
          setView(target);
          scrollToTop();
        }
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300",
        active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div ref={topRef} className="flex min-h-screen flex-col">
      {/* slim experience controls — not a site navbar */}
      <div className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0A1220]/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-2 sm:px-6">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">
            {t("app.demoTag")} · PHI
          </p>
          <div className="flex items-center gap-1">
            {navButton(t("app.home"), "landing", ShieldAlert, view === "landing")}
            {navButton(t("app.history"), "history", HistoryIcon, view === "history")}
            {navButton(t("app.settings"), "settings", SettingsIcon, view === "settings")}
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              aria-label={`${t("app.langLabel")}: ${lang === "en" ? t("app.langEn") : t("app.langHi")}`}
              className="ml-1 inline-flex min-h-[44px] items-center rounded-full border border-white/10 bg-white/[0.04] px-3 text-[13px] font-semibold text-slate-200 transition hover:border-teal-300/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              {lang === "en" ? "हिं" : "EN"}
            </button>
          </div>
        </div>
      </div>

      {killSwitch && view !== "settings" && (
        <div className="border-b border-amber-300/30 bg-amber-300/10" role="alert">
          <div className="mx-auto flex w-full max-w-5xl items-start gap-2.5 px-4 py-3 sm:px-6">
            <PauseCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-100">
                {t("app.killSwitchTitle")}
              </p>
              <p className="text-[13px] leading-relaxed text-amber-100/90">
                {t("app.killSwitchBody")}
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        {view === "landing" && (
          <>
            {systemNote && (
              <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6">
                <div
                  role="alert"
                  className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4 text-[13px] leading-relaxed text-amber-100"
                >
                  {systemNote}
                </div>
              </div>
            )}
            <Landing
              onStart={() => {
                setFlowError(null);
                setSystemNote(null);
                setView("intake");
                gotoStep(0);
              }}
              onOpenHistory={openHistory}
              hasHistory={historyItems.length > 0}
              status={status}
            />
          </>
        )}

        {view === "intake" && (
          <div className="mx-auto w-full max-w-3xl px-4 pb-40 pt-8 sm:px-6">
            <StepProgress
              steps={STEP_KEYS.map((k) => t(k))}
              current={step}
            />
            <div className="mt-7">
              {step === 0 && (
                <ConsentStep
                  scopes={consent?.scopes ?? {}}
                  onToggle={(scope, granted) => void handleConsentToggle(scope, granted)}
                  onBulk={handleConsentBulk}
                />
              )}
              {step === 1 && (
                <ProfileStep
                  value={profileForm}
                  onChange={(patch) => setProfileForm((prev) => ({ ...prev, ...patch }))}
                  saveState={saveState}
                  onRetry={handleRetrySave}
                />
              )}
              {step === 2 && (
                <SymptomsStep
                  value={symptoms}
                  onChange={setSymptoms}
                  saveState={saveState}
                  onRetry={handleRetrySave}
                />
              )}
              {step === 3 && (
                <ConditionsStep
                  value={conditions}
                  onChange={(patch) => setConditions((prev) => ({ ...prev, ...patch }))}
                  saveState={saveState}
                  onRetry={handleRetrySave}
                />
              )}
              {step === 4 && (
                <LifestyleStep
                  value={lifestyle}
                  onChange={(patch) => setLifestyle((prev) => ({ ...prev, ...patch }))}
                  saveState={saveState}
                  onRetry={handleRetrySave}
                />
              )}
              {step === 5 && (
                <VitalsStep
                  value={vitals}
                  onChange={(patch) => setVitals((prev) => ({ ...prev, ...patch }))}
                  saveState={saveState}
                  onRetry={handleRetrySave}
                />
              )}
              {step === 6 && (
                <ReviewStep
                  profile={profileForm}
                  symptoms={symptoms}
                  conditions={conditions}
                  lifestyle={lifestyle}
                  vitals={vitals}
                  onEdit={(key) => {
                    const map: Record<string, number> = {
                      profile: 1,
                      symptoms: 2,
                      conditions: 3,
                      lifestyle: 4,
                      vitals: 5,
                    };
                    gotoStep(map[key] ?? 1);
                  }}
                />
              )}
            </div>

            {(flowError || consentError) && (
              <p role="alert" className="mt-4 text-[13px] leading-relaxed text-amber-200">
                {flowError ?? consentError}
              </p>
            )}

            {/* sticky action bar */}
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0A1220]/92 backdrop-blur">
              <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-3 sm:px-6">
                {step > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setFlowError(null);
                      gotoStep(step - 1);
                    }}
                    className="min-h-[44px] rounded-full text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    {t("app.back")}
                  </Button>
                )}
                <div className="flex-1" />
                {step >= 2 && step <= 5 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setFlowError(null);
                      advance();
                    }}
                    className="min-h-[44px] rounded-full text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  >
                    {t("app.skipStep")}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => void handleContinue()}
                  disabled={
                    (step === 0 && requiredConsentMissing) ||
                    (step === 1 && numOrNull(profileForm.ageYears) == null) ||
                    (step === 6 && killSwitch)
                  }
                  className="min-h-[48px] min-w-[120px] rounded-full bg-teal-300 px-6 font-semibold text-[#0A1220] hover:bg-teal-200"
                >
                  {step === 6 ? t("review.run") : t("app.continue")}
                  {step < 6 && (
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  )}
                </Button>
              </div>
            {step === 0 && requiredConsentMissing && (
                <p className="mx-auto max-w-3xl px-4 pb-2.5 text-center text-xs text-amber-200/90 sm:px-6">
                  {t("consent.blockedNote")}
                </p>
              )}
            </div>
          </div>
        )}

        {view === "running" && (
          <div
            className="flex min-h-[70vh] flex-col items-center justify-center px-4"
            role="status"
            aria-live="polite"
          >
            <span
              aria-hidden="true"
              className="phi-pulse inline-block h-4 w-4 rounded-full bg-teal-300 shadow-[0_0_24px_6px_rgba(94,234,212,0.35)]"
            />
            <h1 className="mt-6 text-xl font-semibold tracking-tight text-white">
              {t("running.title")}
            </h1>
            <p className="mt-3 text-base text-teal-200">
              {runPhase === 0 ? t("running.s1") : runPhase === 1 ? t("running.s2") : t("running.s3")}
            </p>
            <p className="mt-2 text-[13px] text-slate-500">{t("running.note")}</p>
            <Loader2 aria-hidden="true" className="mt-8 h-5 w-5 animate-spin text-slate-500" />
          </div>
        )}

        {view === "results" && assessment && (
          <ResultsView
            assessment={assessment}
            onCreateSummary={() => {
              setView("summary");
              scrollToTop();
            }}
            onRunAgain={() => {
              setView("intake");
              gotoStep(6);
            }}
            onViewHistory={openHistory}
            onFeedback={async (kind, message) => {
              await postFeedback({
                kind,
                message: message || undefined,
              });
            }}
          />
        )}

        {view === "history" && (
          <HistoryView
            items={historyItems}
            trends={trends}
            lang={lang}
            loading={historyLoading}
            onOpen={(id) => void openHistoryItem(id)}
          />
        )}

        {view === "summary" &&
          (assessment ? (
            <SummaryShareView assessment={assessment} lang={lang} />
          ) : (
            <CalmError
              title={t("app.errorTitle")}
              body={t("summary.notFound")}
              onRetry={() => setView("landing")}
              retryLabel={t("app.back")}
            />
          ))}

        {view === "settings" && (
          <SettingsView
            consent={consent}
            onConsentUpdated={setConsent}
            status={status}
            onDataDeleted={() => void handleDataDeleted()}
            onSetLang={setLang}
            lang={lang}
          />
        )}

        {view === "minor" && (
          <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
            <UserRoundX aria-hidden="true" className="h-8 w-8 text-teal-300" />
            <h1 className="mt-5 text-xl font-semibold tracking-tight text-white">
              {t("profile.adultsOnly")}
            </h1>
            <Button
              type="button"
              onClick={() => {
                setView("landing");
                scrollToTop();
              }}
              className="mt-7 min-h-[44px] rounded-full bg-teal-300 font-semibold text-[#0A1220] hover:bg-teal-200"
            >
              {t("app.back")}
            </Button>
          </div>
        )}

        {view === "runerror" && (
          <div className="pt-10">
            <CalmError
              title={t("app.errorTitle")}
              body={runError ?? t("app.errorBody")}
              onRetry={() => void startRun()}
              retryLabel={t("app.retry")}
            />
          </div>
        )}
      </main>

      <footer className="mt-auto border-t border-white/[0.06] px-4 py-8 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
          <p className="text-xs leading-relaxed text-slate-400">
            {assessment?.disclaimer ?? t("footer.disclaimerNote")}
          </p>
          <p className="text-xs leading-relaxed text-slate-500">{t("footer.emergency")}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <a
              href="/"
              className="inline-flex min-h-[44px] items-center text-[13px] font-medium text-teal-300 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              {t("landing.backToSite")}
            </a>
            {status && (
              <p className="font-mono text-[11px] text-slate-600">
                v{status.engineVersion} · {status.rulesetVersion} · {status.contentVersion}
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
