/* ============================================================
 * NEXURA PREDICTIVE — SHARED LABELS
 * Engine-side canonical labels (imported by modules and by the
 * workspace UI alike — no component imports here).
 * ============================================================ */

import type { DomainId } from "./types";

export const DOMAIN_LABELS: Record<DomainId, string> = {
  metabolic: "Metabolic",
  bp: "Blood Pressure",
  heart: "Heart",
  hemoglobin: "Haemoglobin",
  vitamin_d: "Vitamin D",
  b12: "B12 · Nerve",
  thyroid: "Thyroid",
  pcos: "PCOS",
  sleep: "Sleep",
  lungs: "Lungs",
  liver: "Liver",
  mind: "Mind",
};
