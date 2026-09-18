/* ============================================================
 * PIE Phase 1.2 — Unstructured Notes → Structured Concepts
 * Clinical NLP extraction over MedicalNotes: symptoms, progress
 * signals, social determinants. Gazetteer + pattern engine with
 * SNOMED-CT / ICD-10 concept mapping, so downstream risk models
 * consume structured concepts rather than free text.
 * An async LLM enrichment hook (setLlmEnricher) upgrades recall
 * when a model is configured; the deterministic layer always runs
 * so the pipeline never depends on external availability.
 * ============================================================ */

import type { LifeStreamPoint } from "../types";

interface ConceptEntry {
  terms: string[]; // lowercase gazetteer
  code: string;
  system: "SNOMED" | "ICD10";
  title: string;
  domain: "symptom" | "condition" | "sdoh" | "functional";
}

/** Curated mapping — the seed of the ontology; grows via graph sync. */
export const CONCEPTS: ConceptEntry[] = [
  {
    terms: ["fever", "pyrexia", "temperature high"],
    code: "386661006",
    system: "SNOMED",
    title: "Fever",
    domain: "symptom",
  },
  {
    terms: ["shortness of breath", "dyspnea", "dyspnoea", "breathless"],
    code: "267036007",
    system: "SNOMED",
    title: "Dyspnea",
    domain: "symptom",
  },
  {
    terms: ["chest pain"],
    code: "29857009",
    system: "SNOMED",
    title: "Chest pain",
    domain: "symptom",
  },
  { terms: ["cough"], code: "49727002", system: "SNOMED", title: "Cough", domain: "symptom" },
  {
    terms: ["vomiting", "emesis"],
    code: "422400008",
    system: "SNOMED",
    title: "Vomiting",
    domain: "symptom",
  },
  {
    terms: ["dizziness", "giddy", "lightheaded"],
    code: "404640003",
    system: "SNOMED",
    title: "Dizziness",
    domain: "symptom",
  },
  {
    terms: ["fatigue", "weakness", "tiredness"],
    code: "84229001",
    system: "SNOMED",
    title: "Fatigue",
    domain: "symptom",
  },
  {
    terms: ["swelling", "edema", "oedema"],
    code: "271807003",
    system: "SNOMED",
    title: "Edema",
    domain: "symptom",
  },
  {
    terms: ["confusion", "delirium", "altered mental"],
    code: "405815000",
    system: "SNOMED",
    title: "Acute confusion",
    domain: "symptom",
  },
  {
    terms: ["reduced urine", "oliguria", "low urine output"],
    code: "89466004",
    system: "SNOMED",
    title: "Oliguria",
    domain: "symptom",
  },
  {
    terms: ["type 2 diabetes", "dm2", "t2dm"],
    code: "E11",
    system: "ICD10",
    title: "Type 2 diabetes",
    domain: "condition",
  },
  {
    terms: ["hypertension", "high bp", "htn"],
    code: "I10",
    system: "ICD10",
    title: "Hypertension",
    domain: "condition",
  },
  {
    terms: ["heart failure", "chf"],
    code: "I50",
    system: "ICD10",
    title: "Heart failure",
    domain: "condition",
  },
  {
    terms: ["ckd", "chronic kidney"],
    code: "N18",
    system: "ICD10",
    title: "Chronic kidney disease",
    domain: "condition",
  },
  { terms: ["copd"], code: "J44", system: "ICD10", title: "COPD", domain: "condition" },
  {
    terms: ["sepsis", "septic"],
    code: "A41",
    system: "ICD10",
    title: "Sepsis",
    domain: "condition",
  },
  {
    terms: ["anemia", "anaemia"],
    code: "D64",
    system: "ICD10",
    title: "Anemia",
    domain: "condition",
  },
  {
    terms: ["hypothyroid"],
    code: "E03",
    system: "ICD10",
    title: "Hypothyroidism",
    domain: "condition",
  },
  {
    terms: ["smoker", "smoking", "tobacco use"],
    code: "Z720",
    system: "ICD10",
    title: "Tobacco use",
    domain: "sdoh",
  },
  { terms: ["alcohol"], code: "Z721", system: "ICD10", title: "Alcohol use", domain: "sdoh" },
  {
    terms: ["homeless", "no fixed house"],
    code: "Z590",
    system: "ICD10",
    title: "Homelessness",
    domain: "sdoh",
  },
  {
    terms: ["food insecurity", "cannot afford food"],
    code: "Z594",
    system: "ICD10",
    title: "Food insecurity",
    domain: "sdoh",
  },
  {
    terms: ["sedentary", "no exercise", "physically inactive"],
    code: "Z728",
    system: "ICD10",
    title: "Sedentary lifestyle",
    domain: "sdoh",
  },
  {
    terms: ["non-adherent", "not taking medication", "missed doses"],
    code: "Z9114",
    system: "ICD10",
    title: "Medication non-adherence",
    domain: "functional",
  },
  {
    terms: ["poor sleep", "insomnia", "sleepless"],
    code: "G47",
    system: "ICD10",
    title: "Sleep disorder",
    domain: "functional",
  },
  {
    terms: ["stress", "anxious", "anxiety"],
    code: "F41",
    system: "ICD10",
    title: "Anxiety",
    domain: "functional",
  },
];

export interface NoteExtraction {
  points: LifeStreamPoint[];
  concepts: { code: string; system: string; title: string; domain: string }[];
  deteriorationSignals: string[]; // phrases that flag worsening
}

const DETERIORATION = [
  "worsening",
  "deteriorat",
  "not improving",
  "getting worse",
  "increasing pain",
  "more breathless",
  "spreading",
  "recurrent",
  "uncontrolled",
];

type LlmEnricher = (
  note: string,
) => Promise<{ concepts?: { code: string; system: string; title: string; domain: string }[] }>;
let llmEnricher: LlmEnricher | null = null;

/** Optional async hook — wire the platform's AI SDK here at boot. */
export function setLlmEnricher(fn: LlmEnricher | null) {
  llmEnricher = fn;
}

/** Deterministic extraction — always runs, zero external deps. */
export function extractFromNote(
  note: string,
  opts?: { patientId: string; ts?: string },
): NoteExtraction {
  const text = note.toLowerCase();
  const ts = opts?.ts ?? new Date().toISOString();
  const matched: ConceptEntry[] = CONCEPTS.filter((c) => c.terms.some((t) => text.includes(t)));

  const points: LifeStreamPoint[] = matched.map((c) => ({
    source: "notes" as const,
    kind: (c.domain === "sdoh"
      ? "context"
      : c.domain === "symptom"
        ? "observation"
        : "note_extract") as LifeStreamPoint["kind"],
    conceptCode: c.code,
    conceptSystem: c.system,
    title: c.title,
    severity: c.domain === "sdoh" ? ("watch" as const) : ("info" as const),
    ts,
    data: { extractedBy: "pi-engine-gazetteer" },
  }));

  const deteriorationSignals = DETERIORATION.filter((d) => text.includes(d)).map((d) => d.trim());

  return {
    points,
    concepts: matched.map((c) => ({
      code: c.code,
      system: c.system,
      title: c.title,
      domain: c.domain,
    })),
    deteriorationSignals,
  };
}

/** Full pipeline — deterministic + optional LLM enrichment. */
export async function extractFromNoteAsync(
  note: string,
  opts?: { patientId: string; ts?: string },
): Promise<NoteExtraction> {
  const base = extractFromNote(note, opts);
  if (!llmEnricher) return base;
  try {
    const extra = await llmEnricher(note);
    const known = new Set(base.concepts.map((c) => c.code));
    const novel = (extra.concepts ?? []).filter((c) => !known.has(c.code));
    return {
      ...base,
      concepts: [...base.concepts, ...novel],
      points: [
        ...base.points,
        ...novel.map<LifeStreamPoint>((c) => ({
          source: "notes",
          kind: "note_extract",
          conceptCode: c.code,
          conceptSystem: (c.system as LifeStreamPoint["conceptSystem"]) ?? "SNOMED",
          title: c.title,
          severity: "info",
          ts: base.points[0]?.ts ?? new Date().toISOString(),
          data: { extractedBy: "llm-enricher" },
        })),
      ],
    };
  } catch {
    return base; // never fail ingestion on enrichment
  }
}
