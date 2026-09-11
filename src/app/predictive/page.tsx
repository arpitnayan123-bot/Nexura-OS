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

/* ============================================================
 * BOOT-SHELL CANVAS PAINT — anti-white-screen hardening.
 *
 * This page is fully client-rendered: the SSR HTML ships only a
 * small boot loader inside .phi-root. If the Tailwind CSS chunk
 * is slow or fails (preview-proxy hiccup, stale HTML pointing at
 * chunks deleted by a redeploy), the page previously rendered on
 * the WHITE app body and read as a blank white screen.
 *
 * Fix, defense in depth:
 *  1. .phi-root carries an INLINE dark background + min-height —
 *     inline styles need no CSS chunk at all.
 *  2. html/body are painted dark via :has() whenever .phi-root
 *     is mounted — kills white overscroll / margin-collapse
 *     strips around the experience.
 *  3. Boot loader + boot error use inline-styled shells (see
 *     ui-primitives.tsx) so they present correctly even with
 *     zero CSS.
 * ============================================================ */
const PHI_PULSE_CSS = `
html:has(.phi-root),
body:has(.phi-root) {
  background: #0A1220 !important;
}
html:has(.phi-root) { color-scheme: dark; }
@keyframes phiSpin { to { transform: rotate(360deg); } }
.phi-boot-spin { animation: phiSpin 0.9s linear infinite; }
@keyframes phiPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(1.4); }
}
.phi-pulse { animation: phiPulse 1.7s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .phi-pulse, .phi-boot-spin { animation: none; }
}
.phi-root ::selection { background: rgba(94, 234, 212, 0.3); }
`;

export default function PredictivePage() {
  return (
    <div
      className="phi-root min-h-screen bg-gradient-to-b from-[#0A1220] to-[#0E1830]"
      style={{ backgroundColor: "#0A1220", minHeight: "100dvh", colorScheme: "dark" }}
    >
      <style dangerouslySetInnerHTML={{ __html: PHI_PULSE_CSS }} />
      <noscript>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            textAlign: "center",
            color: "#D7E2F2",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p style={{ maxWidth: "28rem", lineHeight: 1.6 }}>
            Nexura Predictive Health Intelligence needs JavaScript to run
            its safety checks privately on your device. Please enable
            JavaScript and reload the page.
          </p>
        </div>
      </noscript>
      <PhiExperience />
    </div>
  );
}
