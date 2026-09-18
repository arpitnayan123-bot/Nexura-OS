/* ============================================================
 * NEXURA DIY — KNOWLEDGE REGISTRY (source-bound, honest)
 * Every roadmap cites its pack. Public Indian datasets have
 * license + review status; anything unverified is labeled so.
 * PROHIBITED uses are explicit — a pack used outside its role
 * is a content-validation failure, not a style issue.
 * ============================================================ */

export type SourceRole =
  | "NUTRITION"
  | "CLINICAL_BASELINE"
  | "ACTIVITY"
  | "SLEEP"
  | "DERMA"
  | "MENTAL_WELLBEING"
  | "POPULATION_STAT";

export interface KnowledgeSourceDef {
  key: string;
  title: string;
  role: SourceRole;
  license: string;
  reviewStatus: "GOV_PUBLIC" | "INTERNAL_REVIEW" | "VALIDATED";
  url?: string;
  prohibitedUse?: string;
}

export const KNOWLEDGE_SOURCES: KnowledgeSourceDef[] = [
  {
    key: "NIN-2024",
    title: "ICMR-NIN Nutrient Requirements Indians 2024",
    role: "NUTRITION",
    license: "Government open (ICMR-NIN)",
    reviewStatus: "GOV_PUBLIC",
    url: "nin.res.in",
    prohibitedUse: "Never for calorie-prescription text; ranges only.",
  },
  {
    key: "IFCT-2017",
    title: "Indian Food Composition Tables 2017",
    role: "NUTRITION",
    license: "Government open (ICMR-NIN)",
    reviewStatus: "GOV_PUBLIC",
    prohibitedUse: "Never to claim a food treats a condition.",
  },
  {
    key: "NFHS-5",
    title: "National Family Health Survey-5",
    role: "POPULATION_STAT",
    license: "Government open (MoHFW)",
    reviewStatus: "GOV_PUBLIC",
    prohibitedUse: "Never to individualize risk.",
  },
  {
    key: "MoSPI-TIME",
    title: "MoSPI Time Use Survey",
    role: "ACTIVITY",
    license: "Government open",
    reviewStatus: "GOV_PUBLIC",
  },
  {
    key: "WHO-ACT",
    title: "WHO Physical Activity Guidelines (summary)",
    role: "ACTIVITY",
    license: "Public guidance summary",
    reviewStatus: "INTERNAL_REVIEW",
  },
  {
    key: "AASM-SLEEP",
    title: "Sleep-hygiene consensus summary",
    role: "SLEEP",
    license: "Public guidance summary",
    reviewStatus: "INTERNAL_REVIEW",
  },
  {
    key: "AAD-ACNE",
    title: "Acne self-care guidance summary",
    role: "DERMA",
    license: "Public guidance summary",
    reviewStatus: "INTERNAL_REVIEW",
    prohibitedUse: "Never medication dosing; patch tests mandatory.",
  },
  {
    key: "TeleMANAS",
    title: "Tele-MANAS 14416 (Govt of India)",
    role: "MENTAL_WELLBEING",
    license: "Government service",
    reviewStatus: "GOV_PUBLIC",
    prohibitedUse: "Crisis referral only — never therapy substitution.",
  },
  {
    key: "NEXURA-CORE",
    title: "Nexura clinical core (habit formation, pacing)",
    role: "CLINICAL_BASELINE",
    license: "Proprietary",
    reviewStatus: "INTERNAL_REVIEW",
  },
  {
    key: "AIKOSH",
    title: "AIKosh datasets (anticipated)",
    role: "CLINICAL_BASELINE",
    license: "Access-gated",
    reviewStatus: "INTERNAL_REVIEW",
    prohibitedUse: "Documented-not-wired until license + key.",
  },
  {
    key: "BHASHINI",
    title: "Bhashini translation (anticipated)",
    role: "POPULATION_STAT",
    license: "Access-gated",
    reviewStatus: "INTERNAL_REVIEW",
    prohibitedUse: "Documented-not-wired until license + key.",
  },
];

/** 13 retrieval packs: category (+context) → source keys + honest scope note. */
export const RETRIEVAL_PACKS: Record<string, { sources: string[]; note: string }> = {
  WEIGHT_LOSS: {
    sources: ["NIN-2024", "IFCT-2017", "WHO-ACT", "NEXURA-CORE"],
    note: "Energy balance with Indian food patterns; no crash deficits.",
  },
  WEIGHT_GAIN: {
    sources: ["NIN-2024", "IFCT-2017", "NEXURA-CORE"],
    note: "Calorie-dense Indian foods, progressive strength.",
  },
  SLEEP: {
    sources: ["AASM-SLEEP", "MoSPI-TIME", "NEXURA-CORE"],
    note: "Circadian anchoring + wind-down; no sedative suggestions.",
  },
  STRESS: {
    sources: ["TeleMANAS", "NEXURA-CORE"],
    note: "Downshift practices; referral paths kept visible.",
  },
  ANXIETY_MOOD: {
    sources: ["TeleMANAS", "NEXURA-CORE"],
    note: "Self-care only; clinical care encouraged alongside.",
  },
  SKIN_ACNE: {
    sources: ["AAD-ACNE", "NEXURA-CORE"],
    note: "Gentle self-care ladder; patch tests; derm triggers.",
  },
  SKIN_GENERAL: { sources: ["AAD-ACNE", "NEXURA-CORE"], note: "Barrier-first care, sun safety." },
  HAIR_HEALTH: {
    sources: ["NIN-2024", "NEXURA-CORE"],
    note: "Nutrition + gentle handling; 90-day honesty.",
  },
  FITNESS_STRENGTH: {
    sources: ["WHO-ACT", "NEXURA-CORE"],
    note: "Progressive overload basics, home-friendly.",
  },
  FITNESS_ENDURANCE: {
    sources: ["WHO-ACT", "MoSPI-TIME", "NEXURA-CORE"],
    note: "Walk-to-run ladders with rest days.",
  },
  DIET_QUALITY: {
    sources: ["IFCT-2017", "NIN-2024", "NEXURA-CORE"],
    note: "Plate-level upgrades, regional foods.",
  },
  ENERGY: {
    sources: ["NIN-2024", "AASM-SLEEP", "NEXURA-CORE"],
    note: "Sleep+iron-aware basics; fatigue red flags kept.",
  },
  DIGESTION: {
    sources: ["IFCT-2017", "NEXURA-CORE"],
    note: "Fiber pacing, hydration; alarm symptoms referred.",
  },
  POSTURE_PAIN: {
    sources: ["WHO-ACT", "NEXURA-CORE"],
    note: "Mobility micro-doses; pain escalation referred.",
  },
  HABITS_SCREEN: {
    sources: ["MoSPI-TIME", "NEXURA-CORE"],
    note: "Friction design, not willpower sermons.",
  },
  SUBSTANCE_REDUCTION: {
    sources: ["TeleMANAS", "NEXURA-CORE"],
    note: "Reduction scaffolding + quit support referral.",
  },
  SKINCARE_ROUTINE: {
    sources: ["AAD-ACNE", "NEXURA-CORE"],
    note: "Level-based routines with patch-test gates.",
  },
  CONTEXT_PREGNANCY: {
    sources: ["NEXURA-CORE"],
    note: "Obstetrician-first; gentle defaults only.",
  },
};

export const SEED_SOURCES = KNOWLEDGE_SOURCES.filter(
  (s) => !s.key.startsWith("AIKOSH") && !s.key.startsWith("BHASHINI"),
);

export function packFor(category: string) {
  return (
    RETRIEVAL_PACKS[category] ?? {
      sources: ["NEXURA-CORE"],
      note: "General habit formation with safety reviews.",
    }
  );
}
