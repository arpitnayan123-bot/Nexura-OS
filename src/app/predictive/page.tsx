import type { Metadata } from "next";
import { ForesightExperience } from "@/components/foresight/experience";

/* ============================================================
 * NEXURA PREDICTIVE 2.0 — HEALTH FORESIGHT · /predictive
 *
 * "Healthcare is Reactive. But Nexura is Predictive."
 *
 * Decision-support, NOT diagnosis: a deterministic, versioned,
 * explainable disease-risk-signal engine calibrated for Indian
 * users (symptoms, diet, South-Asian BMI bands, fitness, sleep,
 * vitals, labs, history, air quality). Red-flag triage always
 * runs before analysis; emergencies withhold the map entirely.
 *
 * The experience is client-rendered — so this shell carries the
 * anti-white-screen hardening: inline canvas paint + :has()
 * body rule that survive even a failed CSS chunk.
 * ============================================================ */

export const metadata: Metadata = {
  title: "Nexura Predictive — Health Foresight",
  description:
    "Healthcare is Reactive. But Nexura is Predictive. Map twelve disease-risk domains from your symptoms, diet, BMI, fitness, sleep, vitals and history — calibrated for Indian bodies, explainable by design. Decision support, never a diagnosis.",
};

const NXP_SHELL_CSS = `
html:has(.nxf-root),
body:has(.nxf-root) {
  background: #070D1A !important;
}
html:has(.nxf-root) { color-scheme: dark; }
@keyframes nxfSpin { to { transform: rotate(360deg); } }
.nxf-spin { animation: nxfSpin 0.9s linear infinite; }
@keyframes nxfPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.35); } }
.nxf-pulse-dot { animation: nxfPulse 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .nxf-spin, .nxf-pulse-dot { animation: none; }
}
.nxf-root ::selection { background: rgba(252, 211, 77, 0.35); }
`;

export default function PredictivePage() {
  return (
    <div
      className="nxf-root nxf-canvas"
      style={{ backgroundColor: "#070D1A", minHeight: "100dvh", colorScheme: "dark" }}
    >
      <style dangerouslySetInnerHTML={{ __html: NXP_SHELL_CSS }} />
      {/* aurora + starfield live behind the experience */}
      <div className="nxf-aurora" aria-hidden="true" />
      <noscript>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            textAlign: "center",
            color: "#F3EFE3",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p style={{ maxWidth: "28rem", lineHeight: 1.6 }}>
            Nexura Predictive needs JavaScript to run its safety screening and
            foresight engine privately for you. Please enable JavaScript and reload.
          </p>
        </div>
      </noscript>
      <ForesightExperience />
    </div>
  );
}
