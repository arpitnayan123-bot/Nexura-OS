"use client";

/* ============================================================
 * FORESIGHT UI — shared primitives. Premium dark clinical:
 * glass cards, hairline borders, generous whitespace, mono
 * data stamps. Rose is reserved EXCLUSIVELY for emergencies.
 * ============================================================ */

import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export const FS_LANG_KEY = "nx_fs_lang";
export type FsLang = "en" | "hi";

/* ---------------- i18n (tiny, flat, EN default) ---------------- */

export const STRINGS: Record<FsLang, Record<string, string>> = {
  en: {
    "app.tag": "NEXURA PREDICTIVE 2.0",
    "app.loading": "Preparing your foresight session…",
    "app.home": "Overview",
    "app.history": "History",
    "app.settings": "Settings",
    "app.lang": "हिंदी",
    "app.back": "Back",
    "app.continue": "Continue",
    "app.run": "Run My Foresight Map",
    "app.retry": "Try again",
    "app.errorTitle": "Something interrupted us",
    "app.errorBody": "We couldn't reach the foresight service. Nothing was lost — your answers are still here.",
    "app.demo": "DEMO — not a medical device. Always consult a doctor.",
    "app.adultsOnly": "Built for adults (18+)",
  },
  hi: {
    "app.tag": "नेक्सुरा प्रेडिक्टिव 2.0",
    "app.loading": "आपका फ़ोरसाइट सेशन तैयार हो रहा है…",
    "app.home": "ओवरव्यू",
    "app.history": "इतिहास",
    "app.settings": "सेटिंग्स",
    "app.lang": "EN",
    "app.back": "वापस",
    "app.continue": "आगे बढ़ें",
    "app.run": "मेरा फ़ोरसाइट मैप बनाएँ",
    "app.retry": "फिर कोशिश करें",
    "app.errorTitle": "कनेक्शन में बाधा आई",
    "app.errorBody": "हम फ़ोरसाइट सेवा तक नहीं पहुँच पाए। कुछ भी खोया नहीं — आपके उत्तर सुरक्षित हैं।",
    "app.demo": "डेमो — मेडिकल डिवाइस नहीं। हमेशा डॉक्टर से सलाह लें।",
    "app.adultsOnly": "18+ वयस्कों के लिए",
  },
};

export function tr(lang: FsLang, key: string): string {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
}

/* ---------------- boot shells (inline-styled, chunk-safe) ---------------- */

export function FsLoader({ label }: { label: string }) {
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
        color: "#DED9CA",
      }}
    >
      <span
        aria-hidden="true"
        className="nxf-spin"
        style={{
          width: 26, height: 26, borderRadius: "50%",
          border: "3px solid rgba(252,211,77,0.25)", borderTopColor: "#FCD34D",
          display: "inline-block",
        }}
      />
      <p style={{ fontSize: "0.875rem", margin: 0 }}>{label}</p>
    </div>
  );
}

export function FsError({
  title, body, onRetry, retryLabel,
}: { title: string; body: string; onRetry: () => void; retryLabel: string }) {
  return (
    <div
      role="alert"
      style={{
        minHeight: "100dvh", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "26rem", textAlign: "center", padding: "1.75rem 1.5rem",
          borderRadius: "1.25rem", border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)", color: "#FFFEFA",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1.15rem", fontWeight: 650 }}>{title}</h2>
        <p style={{ marginTop: "0.5rem", fontSize: "0.9rem", lineHeight: 1.6, color: "#DED9CA" }}>{body}</p>
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: "1.25rem", display: "inline-flex", alignItems: "center",
            minHeight: "44px", padding: "0 1.4rem", borderRadius: 9999,
            background: "linear-gradient(135deg, #FDE047, #FCD34D 42%, #F59E0B)", color: "#241A02", fontWeight: 700,
            fontSize: "0.9rem", border: "none", cursor: "pointer",
          }}
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}

/* ---------------- layout primitives ---------------- */

export function GlassCard({
  children, className, hover = true, ...rest
}: { children: ReactNode; className?: string; hover?: boolean } & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      className={cn("nxf-glass", hover && "nxf-glass-hover", className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("nxf-eyebrow text-[10.5px] font-semibold uppercase nxf-gold", className)}>
      <span aria-hidden="true" className="nxf-glyph-glow mr-1">✦</span>
      {children}
    </p>
  );
}

/* figma-style ornament: glowing glyph between gold hairlines */
export function Ornament({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn("nxf-ornament", className)} aria-hidden="true">
      <span className="nxf-gold nxf-glyph-glow text-[13px]">✦</span>
      {label ? (
        <span className="nxf-mono text-[9.5px] font-semibold uppercase tracking-[0.32em] nxf-gold-soft">
          {label}
        </span>
      ) : null}
      <span className="nxf-gold nxf-glyph-glow text-[13px]">✦</span>
    </div>
  );
}

export function LevelChip({ level }: { level: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]",
        `nxf-chip-${level}`
      )}
    >
      {level === "LOW" ? "steady" : level === "WATCH" ? "watch" : level === "ELEVATED" ? "elevated" : "attention"}
    </span>
  );
}

export function Bar({ pct, tone = "teal" }: { pct: number; tone?: "teal" | "amber" | "orange" | "rose" | "emerald" }) {
  const tones: Record<string, string> = {
    teal: "from-teal-400 to-emerald-400",
    emerald: "from-emerald-400 to-green-300",
    amber: "from-amber-400 to-yellow-300",
    orange: "from-orange-400 to-amber-300",
    rose: "from-rose-400 to-rose-300",
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.09]">
      <div
        className={cn("nxf-bar-fill h-full rounded-full bg-gradient-to-r", tones[tone])}
        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function SectionHead({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
      <h2 className="font-display text-xl font-semibold tracking-tight nxf-hi sm:text-2xl">{title}</h2>
      {sub ? <p className="mt-1.5 text-sm leading-relaxed nxf-dim">{sub}</p> : null}
    </div>
  );
}

export function Field({ label, why, children }: { label: string; why?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium nxf-body">{label}</span>
        {why ? <span className="text-[11px] nxf-mute">{why}</span> : null}
      </span>
      {children}
    </label>
  );
}

export function PillGroup({
  options, value, onChange, multi = false, values, rose = false,
}: {
  options: { value: string; label: string; hint?: string }[];
  value?: string;
  values?: string[];
  onChange: (v: string) => void;
  multi?: boolean;
  rose?: boolean;
}) {
  const isOn = (v: string) => (multi ? (values ?? []).includes(v) : value === v);
  return (
    <div className="flex flex-wrap gap-2" role={multi ? "group" : "radiogroup"}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cn("nxf-pill", rose && "nxf-pill-rose")}
          aria-pressed={isOn(o.value)}
          onClick={() => onChange(o.value)}
        >
          <span>{o.label}</span>
          {o.hint ? <span className="text-[11px] nxf-mute">{o.hint}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function CountUp({ to, duration = 1.4 }: { to: number; duration?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.span
          key={to}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration }}
        >
          {to}
        </motion.span>
      </motion.span>
    </motion.span>
  );
}

export const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.7, ease: [0.2, 0.7, 0.2, 1] as const },
};

export const stagger = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};
