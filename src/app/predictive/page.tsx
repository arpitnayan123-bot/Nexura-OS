import type { Metadata } from "next";
import { PhiExperience } from "@/components/phi/phi-experience";

/* ============================================================
 * NEXURA PREDICTIVE HEALTH INTELLIGENCE — /predictive
 *
 * Decision support, NOT diagnosis. Full-bleed dark clinical
 * canvas (#0A1220 → #0E1830), theme-independent. The global
 * site chrome stays untouched; this page renders only the PHI
 * experience. Safety copy always precedes any analysis content
 * (enforced in results.tsx, position-locked).
 * ============================================================ */

export const metadata: Metadata = {
  title: "Nexura Predictive Health Intelligence",
  description:
    "Spot important health signals earlier, understand what may be contributing to them, and know what to do next. Consent-based, private, and safety-first. Decision support — always consult a doctor.",
};

const PHI_PULSE_CSS = `
@keyframes phiPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(1.4); }
}
.phi-pulse { animation: phiPulse 1.7s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .phi-pulse { animation: none; }
}
.phi-root ::selection { background: rgba(94, 234, 212, 0.3); }
`;

export default function PredictivePage() {
  return (
    <div className="phi-root min-h-screen bg-gradient-to-b from-[#0A1220] to-[#0E1830]">
      <style dangerouslySetInnerHTML={{ __html: PHI_PULSE_CSS }} />
      <PhiExperience />
    </div>
  );
}
