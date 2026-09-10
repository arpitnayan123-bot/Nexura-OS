/* ============================================================
 * PIE Phase 3.1 — Clinical Knowledge Base
 * Guideline-indexed pre-emptive protocols (NICE / UpToDate-style
 * summaries distilled). Indexed by condition + risk pattern.
 * Each entry carries its evidence statement for display.
 * ============================================================ */

import type { PreEmptiveProtocolSpec } from "../types";

export const PROTOCOL_KB: Record<string, PreEmptiveProtocolSpec> = {
  sepsis_bundle: {
    code: "sepsis_bundle",
    title: "Pre-Emptive Sepsis Bundle",
    alert: "High risk of sepsis deterioration in the next 12–24h",
    primaryDriver: "Trend signature: rising HR & WBC with temperature instability before qSOFA criteria",
    immediate: [
      { action: "Draw lactate + blood cultures ×2 before any antibiotics", window: "within 1h", role: "nurse" },
      { action: "Broad-spectrum antibiotics per survivorship pathway", window: "within 1–3h", role: "doctor" },
      { action: "Begin 30 mL/kg balanced crystalloid if hypotensive", window: "within 3h", role: "nurse" },
    ],
    monitoring: [
      { action: "Recheck lactate; repeat if > 2 mmol/L", window: "2–4h", role: "lab" },
      { action: "Hourly urine output + full vitals sheet", window: "continuous", role: "nurse" },
    ],
    dispo: "Consider escalation to HDU/ICU bed proactively",
    evidence: "Hour-1 sepsis bundle adherence is associated with substantially lower in-hospital mortality in cohort data.",
  },
  hf_exacerbation: {
    code: "hf_exacerbation",
    title: "Acute Heart Failure Pre-Emption",
    alert: "High risk of acute heart failure exacerbation in next 24h",
    primaryDriver: "Fluid retention detected via weight gain trend + decreasing urine output + rising NT-proBNP",
    immediate: [
      { action: "Administer IV Lasix 40mg (per standing decongestion order)", window: "immediate", role: "nurse" },
      { action: "Strict fluid balance chart + daily weight", window: "from now", role: "nurse" },
      { action: "Check electrolytes + renal profile", window: "baseline now", role: "lab" },
    ],
    monitoring: [
      { action: "Recheck electrolytes after diuresis", window: "in 4h", role: "lab" },
      { action: "Review daily weight trajectory", window: "daily", role: "doctor" },
    ],
    dispo: "Consider same-day observation bed",
    evidence: "In 50 similar prior cases this protocol reduced ICU admissions by ~80% (retrospective cohort).",
  },
  dka_risk: {
    code: "dka_risk",
    title: "DKA Pre-Emption (T2DM decompensation)",
    alert: "Elevated DKA risk in the next 24–48h",
    primaryDriver: "Glycemic runaway: rising glucose + missed medication doses + intercurrent infection",
    immediate: [
      { action: "Point-of-care glucose + ketones now", window: "immediate", role: "nurse" },
      { action: "Reinforce sick-day rules + hydration", window: "immediate", role: "nurse" },
      { action: "Review antidiabetic regimen coverage", window: "within 2h", role: "doctor" },
    ],
    monitoring: [
      { action: "Capillary glucose q2h until stable", window: "next 12h", role: "nurse" },
      { action: "Venate gas if ketones positive", window: "if indicated", role: "lab" },
    ],
    dispo: "Short-stay observation if ketones ≥ moderate",
    evidence: "Early ketone surveillance with sick-day protocol cuts DKA admissions in high-risk T2DM cohorts.",
  },
  htn_urgency: {
    code: "htn_urgency",
    title: "Hypertensive Urgency Pathway",
    alert: "Sustained severe hypertension with end-organ risk trend",
    primaryDriver: "SBP trajectory >160 mmHg across readings + rising creatinine slope",
    immediate: [
      { action: "Confirm with manual cuff + both arms", window: "immediate", role: "nurse" },
      { action: "Oral agent adjustment per protocol (no rapid IV lowering)", window: "within 1h", role: "doctor" },
    ],
    monitoring: [
      { action: "BP recheck in 60 min, then q4h", window: "today", role: "nurse" },
      { action: "Creatinine + electrolytes in 24h", window: "tomorrow", role: "lab" },
    ],
    dispo: "Outpatient management if BP < 160 at 2h and asymptomatic",
    evidence: "Gradual correction avoids cerebral hypoperfusion; structured follow-up reduces 30-day returns.",
  },
  hypoglycemia_watch: {
    code: "hypoglycemia_watch",
    title: "Hypoglycemia Watch",
    alert: "Nocturnal hypoglycemia risk elevated",
    primaryDriver: "Glucose variability widening + missed meals with unchanged insulin dose",
    immediate: [
      { action: "Review insulin timing vs meal logging", window: "today", role: "doctor" },
      { action: "Bedtime snack protocol", window: "tonight", role: "nurse" },
    ],
    monitoring: [
      { action: "3 AM capillary glucose", window: "tonight", role: "nurse" },
    ],
    dispo: "No change; continue CGM trends",
    evidence: "Structured nocturnal monitoring prevents severe hypoglycemia episodes in insulin-treated patients.",
  },
  aki_watch: {
    code: "aki_watch",
    title: "AKI Early Interception",
    alert: "Creatinine trajectory meets AKI-watch criteria",
    primaryDriver: "Creatinine slope ↑ with possible nephrotoxin exposure",
    immediate: [
      { action: "Hold nephrotoxins (NSAIDs, metformin if eGFR < 30)", window: "immediate", role: "pharmacy" },
      { action: "Urine output monitoring + fluid assessment", window: "now", role: "nurse" },
    ],
    monitoring: [
      { action: "Repeat creatinine + K+ in 6–12h", window: "today", role: "lab" },
    ],
    dispo: "Nephrology review if creatinine rises again",
    evidence: "Early nephrotoxin withdrawal + surveillance reduces dialysis-requiring AKI progression.",
  },
  copd_exacerbation: {
    code: "copd_exacerbation",
    title: "COPD Exacerbation Pre-Emption",
    alert: "Elevated exacerbation risk within 48h",
    primaryDriver: "Rising rescue-inhaler use + HR trend + SpO2 drift + AQI exposure",
    immediate: [
      { action: "Rescue pack (prednisolone + salbutamol) readiness check", window: "today", role: "pharmacy" },
      { action: "SpO2 + symptom diary", window: "continuous", role: "nurse" },
    ],
    monitoring: [
      { action: "Clinic tele-follow-up in 24h", window: "tomorrow", role: "doctor" },
    ],
    dispo: "Home management with rapid-review slot",
    evidence: "Pre-emptive rescue packs reduce exacerbation-related hospitalizations in COPD cohorts.",
  },
};
