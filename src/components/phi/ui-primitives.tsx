/* ============================================================
 * PHI — shared UI primitives
 * Dark clinical canvas language: glass cards, teal accents,
 * amber for "watch", rose reserved EXCLUSIVELY for emergency.
 * ============================================================ */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AlertTriangle, Check, HeartPulse, Info, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UrgencyLevel, ConfidenceCategory } from "@/modules/phi/contracts";
import {
  interpolate,
  readStoredLang,
  stringsFor,
  writeStoredLang,
  type PhiLang,
} from "./strings";

/* ---------------- Language context ---------------- */

type PhiLangContextValue = {
  lang: PhiLang;
  setLang: (lang: PhiLang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const PhiLangContext = createContext<PhiLangContextValue | null>(null);

/* Tiny external store so the stored language survives navigation and
   cross-tab changes — and so hydration never needs setState-in-effect. */
type LangListener = () => void;
const langListeners = new Set<LangListener>();

function subscribeLang(listener: LangListener): () => void {
  langListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    langListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getLangSnapshot(): PhiLang {
  return readStoredLang();
}

function getLangServerSnapshot(): PhiLang {
  return "en";
}

export function PhiLangProvider({ children }: { children: ReactNode }) {
  // Server renders EN; after hydration the stored choice applies.
  const lang = useSyncExternalStore(subscribeLang, getLangSnapshot, getLangServerSnapshot);

  const setLang = useCallback((next: PhiLang) => {
    writeStoredLang(next);
    for (const listener of langListeners) listener();
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = stringsFor(lang);
      const template = dict[key] ?? key;
      return vars ? interpolate(template, vars) : template;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <PhiLangContext.Provider value={value}>{children}</PhiLangContext.Provider>;
}

export function usePhiT(): PhiLangContextValue {
  const ctx = useContext(PhiLangContext);
  if (!ctx) {
    // Fallback: EN-only, never crashes
    return {
      lang: "en",
      setLang: () => undefined,
      t: (key, vars) => {
        const template = stringsFor("en")[key] ?? key;
        return vars ? interpolate(template, vars) : template;
      },
    };
  }
  return ctx;
}

/* ---------------- Layout primitives ---------------- */

export function SectionCard({
  children,
  className,
  title,
  icon,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6",
        className
      )}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-white">
            {icon}
            {title}
          </h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  why,
  required,
  hint,
}: {
  htmlFor: string;
  children: ReactNode;
  /** "Why we ask" — rendered via title attr + optional visible small text. */
  why?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <label
        htmlFor={htmlFor}
        title={why ? `${"Why we ask"}: ${why}` : undefined}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-200"
      >
        {children}
        {required ? (
          <span aria-hidden="true" className="text-teal-300">
            *
          </span>
        ) : (
          <span className="text-xs font-normal text-slate-500">
            ({""}
            <span className="sr-only">optional</span>
            <span aria-hidden="true">optional</span>
            )
          </span>
        )}
        {why && (
          <Info
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-slate-500"
          />
        )}
      </label>
      {why && <p className="mt-1 text-xs leading-relaxed text-slate-400">{why}</p>}
      {hint && <p className="mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

/* ---------------- Status chips ---------------- */

const CONFIDENCE_STYLES: Record<ConfidenceCategory, string> = {
  INSUFFICIENT_INFORMATION: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  LOW_CONFIDENCE: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  MODERATE_CONFIDENCE: "border-teal-300/30 bg-teal-300/10 text-teal-200",
  HIGHER_CONFIDENCE_WITHIN_SCREENING_SCOPE:
    "border-teal-300/50 bg-teal-300/15 text-teal-100",
};

export function ConfidenceChip({
  confidence,
  label,
}: {
  confidence: ConfidenceCategory;
  label: string;
}) {
  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        CONFIDENCE_STYLES[confidence] ?? CONFIDENCE_STYLES.LOW_CONFIDENCE
      )}
    >
      <Check aria-hidden="true" className="h-3 w-3" />
      {label}
    </span>
  );
}

export function SeverityDot({
  severity,
}: {
  severity: "informational" | "watch" | "elevated";
}) {
  // rose is NEVER used here — it is reserved for emergency banners only.
  const color =
    severity === "elevated"
      ? "bg-orange-300"
      : severity === "watch"
        ? "bg-amber-300"
        : "bg-teal-300";
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 shrink-0 rounded-full", color)}
    />
  );
}

export function DemoBadge({ label }: { label: string }) {
  return (
    <span
      role="note"
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-300/40 bg-amber-300/10 px-3.5 py-1.5 text-xs font-semibold text-amber-200 sm:text-[13px]"
    >
      <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span className="text-left leading-snug">{label}</span>
    </span>
  );
}

/* ---------------- Urgency banner ---------------- */

export const URGENCY_TONE: Record<
  UrgencyLevel,
  { border: string; bg: string; text: string; chipBg: string }
> = {
  EMERGENCY_NOW: {
    border: "border-rose-300/60",
    bg: "bg-rose-300/10",
    text: "text-rose-100",
    chipBg: "bg-rose-300/20 text-rose-100 border-rose-300/50",
  },
  SAME_DAY_MEDICAL_REVIEW: {
    border: "border-amber-300/50",
    bg: "bg-amber-300/10",
    text: "text-amber-100",
    chipBg: "bg-amber-300/20 text-amber-100 border-amber-300/50",
  },
  PROMPT_APPOINTMENT: {
    border: "border-amber-200/40",
    bg: "bg-amber-200/[0.07]",
    text: "text-amber-50",
    chipBg: "bg-amber-200/15 text-amber-100 border-amber-200/40",
  },
  ROUTINE_FOLLOW_UP: {
    border: "border-teal-300/40",
    bg: "bg-teal-300/[0.07]",
    text: "text-teal-100",
    chipBg: "bg-teal-300/15 text-teal-100 border-teal-300/40",
  },
  MONITOR_AND_PREVENT: {
    border: "border-teal-300/40",
    bg: "bg-teal-300/[0.06]",
    text: "text-teal-100",
    chipBg: "bg-teal-300/10 text-teal-200 border-teal-300/30",
  },
};

export function UrgencyBanner({
  urgency,
  label,
}: {
  urgency: UrgencyLevel;
  label: string;
}) {
  const tone = URGENCY_TONE[urgency] ?? URGENCY_TONE.ROUTINE_FOLLOW_UP;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col gap-1 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
        tone.border,
        tone.bg
      )}
    >
      <div className="flex items-center gap-3">
        <HeartPulse aria-hidden="true" className={cn("h-5 w-5 shrink-0", tone.text)} />
        <p className={cn("text-lg font-semibold tracking-tight sm:text-xl", tone.text)}>
          {label}
        </p>
      </div>
      <span
        className={cn(
          "w-fit rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest",
          tone.chipBg
        )}
      >
        {urgency.replace(/_/g, " ")}
      </span>
    </div>
  );
}

/* ---------------- Progress & notes ---------------- */

export function StepProgress({
  steps,
  current,
}: {
  steps: string[];
  current: number; // 0-based
}) {
  return (
    <nav aria-label="Progress" className="w-full">
      <div
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={current + 1}
        aria-valuetext={`Step ${current + 1} of ${steps.length}`}
      >
        <div
          className="h-full rounded-full bg-teal-300 transition-all duration-500"
          style={{ width: `${((current + 1) / steps.length) * 100}%` }}
        />
      </div>
      <ol className="mt-3 flex flex-wrap gap-x-1 gap-y-1 text-[11px] leading-none sm:text-xs">
        {steps.map((name, i) => (
          <li key={name} className="flex items-center gap-1">
            <span
              aria-current={i === current ? "step" : undefined}
              className={cn(
                "px-1 py-0.5 font-medium",
                i === current
                  ? "text-teal-200"
                  : i < current
                    ? "text-slate-400"
                    : "text-slate-500"
              )}
            >
              {i < current ? "✓ " : ""}
              {name}
            </span>
            {i < steps.length - 1 && (
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SkipNote({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs leading-relaxed text-slate-500">
      <Info aria-hidden="true" className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
      {children}
    </p>
  );
}

export function SaveStateChip({
  state,
  savingLabel,
  savedLabel,
  retryLabel,
  onRetry,
}: {
  state: "idle" | "saving" | "saved" | "error";
  savingLabel: string;
  savedLabel: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400">
        <Loader2 aria-hidden="true" className="h-3 w-3 animate-spin" />
        {savingLabel}
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-300/30 bg-teal-300/10 px-2.5 py-1 text-xs text-teal-200">
        <Check aria-hidden="true" className="h-3 w-3" />
        {savedLabel}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-200 transition hover:bg-amber-300/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
    >
      <RotateCcw aria-hidden="true" className="h-3 w-3" />
      {retryLabel}
    </button>
  );
}

/* ---------------- Boot shells ----------------
 * CalmLoader + CalmError(fullScreen) are the ONLY markup present in
 * the SSR HTML and in the boot-error state. They therefore must not
 * depend on the Tailwind CSS chunk: every visual property that keeps
 * them presentable on the dark canvas is set INLINE. Class-based
 * polish (spinner animation via .phi-boot-spin) is defined in an
 * inline <style> tag on the page itself, so it also survives a
 * failed CSS chunk. See src/app/predictive/page.tsx.
 * ----------------------------------------------- */

export function CalmLoader({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "1.5rem",
        textAlign: "center",
        color: "#A9BBD6",
        backgroundColor: "transparent",
      }}
    >
      <span
        aria-hidden="true"
        className="phi-boot-spin"
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          border: "3px solid rgba(94, 234, 212, 0.22)",
          borderTopColor: "#5EEAD4",
          display: "inline-block",
        }}
      />
      <p style={{ fontSize: "0.875rem", margin: 0 }}>{label}</p>
    </div>
  );
}

export function CalmError({
  title,
  body,
  onRetry,
  retryLabel,
  fullScreen = false,
}: {
  title: string;
  body: string;
  onRetry: () => void;
  retryLabel: string;
  /** Boot-level errors render alone on the canvas — center them at
   * full height WITHOUT margins (margins collapse through ancestors
   * and expose the white app body above the dark shell). */
  fullScreen?: boolean;
}) {
  const card = (
    <div
      style={{
        maxWidth: "26rem",
        textAlign: "center",
        padding: "1.75rem 1.5rem",
        borderRadius: "1rem",
        border: "1px solid rgba(255, 255, 255, 0.10)",
        background: "rgba(255, 255, 255, 0.04)",
        color: "#F8FAFC",
      }}
    >
      <Info aria-hidden="true" size={22} color="#5EEAD4" />
      <h2
        style={{
          marginTop: "0.75rem",
          fontSize: "1.125rem",
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: "#F8FAFC",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          marginTop: "0.5rem",
          fontSize: "0.875rem",
          lineHeight: 1.6,
          color: "#A9BBD6",
        }}
      >
        {body}
      </p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          marginTop: "1.25rem",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          minHeight: "44px",
          padding: "0 1.25rem",
          borderRadius: 9999,
          background: "#5EEAD4",
          color: "#0A1220",
          fontWeight: 600,
          fontSize: "0.875rem",
          border: "none",
          cursor: "pointer",
        }}
      >
        <RotateCcw aria-hidden="true" size={16} />
        {retryLabel}
      </button>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        role="alert"
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        {card}
      </div>
    );
  }

  return (
    <div role="alert" className="mx-auto my-10 max-w-md px-4">
      {card}
    </div>
  );
}

/* ---------------- Reduced-motion helper (CSS only) ---------------- */

/** Adds a gentle pulse; disabled automatically under prefers-reduced-motion. */
export const PHI_PULSE_CLASS =
  "phi-pulse motion-reduce:[animation:none]";
