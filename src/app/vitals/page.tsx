import type { Metadata } from "next";
import { VitalsExperience } from "@/components/vitals/vitals-experience";

/* ============================================================
   NEXURA VITALS — "Your body, in real time." · /vitals
   ------------------------------------------------------------
   Continuous health from wearables you already own: heart
   rate (live-simulated), SpO₂, HRV, stress, steps, sleep
   architecture — hand-rolled gold SVG charts, context-aware
   pattern alerts, doctor-ready weekly share.

   Demo-safe: simulated data, clearly labelled. Wellness
   insights, never medical advice.
   ============================================================ */

export const metadata: Metadata = {
  title: "Nexura Vitals — Your Body, In Real Time",
  description:
    "Connect the wearables and sensors you already own. Nexura Vitals turns heart rate, SpO₂, HRV, sleep and stress streams into one calm, physician-grade picture with trends explained. A product of Nexura OS.",
};

const NXT_SHELL_CSS = `
html:has(.nxt-root),
body:has(.nxt-root) {
  background: #141210 !important;
}
html:has(.nxt-root) { color-scheme: dark; }
.nxt-root ::selection { background: rgba(200, 165, 91, 0.35); }
@keyframes nxlVtPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }
.nxl-vt-pulse { animation: nxlVtPulse 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .nxl-vt-pulse { animation: none; }
}
`;

export default function VitalsPage() {
  return (
    <div
      className="nxt-shell"
      style={{ minHeight: "100dvh", backgroundColor: "#141210", colorScheme: "dark" }}
    >
      <style dangerouslySetInnerHTML={{ __html: NXT_SHELL_CSS }} />
      <VitalsExperience />
    </div>
  );
}
