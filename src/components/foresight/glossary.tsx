"use client";

/* ============================================================
 * FORESIGHT GLOSSARY — "The twelve domains, explained."
 * Every line is engine-accurate (foresight-2.0.0 ·
 * india-cal-2.0.0): role sentence, the heaviest factors that
 * raise burden, and the Indian calibration hook. Tap a card
 * to expand. Signal levels are ordinal 0–100 burden — never
 * a diagnosis.
 * ============================================================ */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Eyebrow, GlassCard, Ornament, fadeUp } from "./ui";

const DOMAINS: { name: string; role: string; raises: string; india: string }[] = [
  {
    name: "Metabolic · T2D",
    role: "Your sugar-metabolism signal checker.",
    raises: "HbA1c ≥ 6.5 · fasting sugar ≥ 126 · BMI ≥ 27.5",
    india:
      "Indian BMI bands start at 23, not 25. Mithai, fried food and sugary drinks carry real weight — and if diabetes is already diagnosed, the domain switches to control-mode instead of detection.",
  },
  {
    name: "Blood Pressure",
    role: "One reading plus salt and lifestyle stressors.",
    raises: "BP ≥ 140/90 · pickle-papad salt load · family history",
    india:
      "130/85 is treated as the Indian prehypertension watch zone, with a sub-5 g daily salt target.",
  },
  {
    name: "Heart",
    role: "The modifiable cluster: tobacco, lipids, BP, sugar.",
    raises: "Tobacco use · LDL ≥ 160 · triglycerides ≥ 300",
    india:
      "Smokeless gutkha and paan are tracked separately, and South-Asian LDL targets are stricter.",
  },
  {
    name: "Haemoglobin",
    role: "Oxygen-carrying pattern — very common in India, very fixable.",
    raises: "Low haemoglobin · pregnancy (ICMR screen) · veg diet + menstrual loss",
    india:
      "Cutoffs 13 g/dL (men) / 12 (women). Chai with meals blocks iron; ferritin and thalassemia-trait questions included.",
  },
  {
    name: "Vitamin D",
    role: "The classic urban-India sun-and-bone pattern.",
    raises: "Level < 12 ng/mL · under 15 min sun · bone aches",
    india:
      "Metro AQI keeps people indoors — the engine knows. Repletion courses follow the Indian 60,000-IU weekly norm.",
  },
  {
    name: "B12 · Nerve",
    role: "Nerve-and-energy pattern, extremely common in vegetarian India.",
    raises: "Level < 150 pg/mL · veg diet + tingling · long-term metformin",
    india:
      "Veg/vegan/Jain diets are a lead factor — the veg-plus-tingling combo is the classic Indian B12 setup.",
  },
  {
    name: "Thyroid",
    role: "Symptom-cluster checker — one blood test settles it.",
    raises: "TSH > 5.5 · unexplained weight gain · family history",
    india:
      "Broad 0.4–5.5 screening band, morning-fasting timing advice, and 5–8× higher prevalence in women.",
  },
  {
    name: "PCOS · Hormonal",
    role: "Cycle-and-hormone pattern for female profiles.",
    raises: "Irregular cycles · PCOS/PCOD diagnosed · waist ≥ 80 cm",
    india:
      "HbA1c and fasting-insulin screening is standard alongside; protein-first Indian food swaps suggested.",
  },
  {
    name: "Sleep · OSA",
    role: "Sleep debt plus a two-question apnoea screen.",
    raises: "Under 6 h sleep · snoring with gasping · severe daytime dozes",
    india:
      "Practical actions like a 4 PM chai cutoff and side-sleeping; home sleep kits referenced in metros.",
  },
  {
    name: "Lungs",
    role: "Airway load from air quality, tobacco and cough clock.",
    raises: "Tobacco · severe AQI exposure · cough ≥ 3 weeks",
    india: "Follows India's TB cough-rule (≥ 21 days → get a chest X-ray) and city AQI bands.",
  },
  {
    name: "Liver",
    role: "Fatty-liver pattern builder — reversible at this stage.",
    raises: "High waist · daily alcohol · daily sweets/fried",
    india:
      "South-Asian waist cutoffs drive the screen; LFT + ultrasound are cheap and widely available.",
  },
  {
    name: "Mind",
    role: "Mental load that deserves real care, not willpower.",
    raises: "≥ 10 low days in two weeks · high stress · panic spells",
    india: "Routes to Tele-MANAS 14416 — free, 24×7, in your language.",
  },
];

export function DomainGlossary({ lang = "en" }: { lang?: "en" | "hi" }) {
  const t = (en: string, hi: string) => (lang === "hi" ? hi : en);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <motion.section {...fadeUp}>
      <div className="mb-6 text-center">
        <Eyebrow className="mb-2">{t("Before you run it", "चलाने से पहले")}</Eyebrow>
        <h2 className="font-display text-2xl font-semibold tracking-tight nxf-hi sm:text-3xl">
          {t("The twelve domains, explained", "बारह क्षेत्र, समझाए गए")}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed nxf-dim">
          {t(
            "Every domain is a transparent rule-set, not a black box. Tap any card to see exactly what raises its signal — the same factors the engine will weigh for you.",
            "हर क्षेत्र एक पारदर्शी नियम-सेट है, कोई काला बक्सा नहीं। किसी भी कार्ड पर टैप करें और देखें कि सिग्नल क्या बढ़ाता है — वही कारक जो इंजन आपके लिए तौलेगा।",
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DOMAINS.map((d, i) => {
          const isOpen = open === i;
          return (
            <GlassCard key={d.name} className="p-4" hover={!isOpen}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <span className="font-display text-[15px] font-semibold nxf-hi">{d.name}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15"
                  aria-hidden="true"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.span>
              </button>
              <p className="mt-1 text-[12px] leading-relaxed nxf-dim">{d.role}</p>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                      <p className="text-[11.5px] leading-relaxed nxf-body">
                        <span className="font-semibold">Raises the signal:</span> {d.raises}
                      </p>
                      <p className="text-[11.5px] leading-relaxed nxf-dim">
                        <span className="font-semibold">Built for India:</span> {d.india}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          );
        })}
      </div>

      <p className="nxf-mono mt-5 text-center text-[9.5px] uppercase tracking-[0.3em] nxf-gold-soft/80">
        signal levels 0–100 · watch ≥ 18 · elevated ≥ 40 · high ≥ 66 · never a diagnosis
      </p>
      <Ornament label="transparent by design" className="mt-6" />
    </motion.section>
  );
}
