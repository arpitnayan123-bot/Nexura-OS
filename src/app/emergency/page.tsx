import type { Metadata } from "next";
import { EmergencyExperience } from "@/components/emergency/emergency-experience";

/* ============================================================
   NEXURA EMERGENCY — "Seconds, respected." · /emergency
   ------------------------------------------------------------
   Press-and-hold SOS dispatch, ambulance fleet with ETAs,
   live ER network, blood-bank availability, Medical ID and
   offline first-aid guides.

   Dark Liquid Gold canvas with crimson reserved for semantic
   emergency states only. Demo-safe: dispatch is simulated,
   national numbers surfaced prominently.
   ============================================================ */

export const metadata: Metadata = {
  title: "Nexura Emergency — Seconds, Respected",
  description:
    "Press-and-hold SOS dispatches the nearest ambulance to your GPS pin with your medical ID already streaming to the crew. Live ER beds, blood-bank availability and offline first-aid guides. A product of Nexura OS.",
};

const NXE_SHELL_CSS = `
html:has(.nxe-root),
body:has(.nxe-root) {
  background: #141210 !important;
}
html:has(.nxe-root) { color-scheme: dark; }
.nxe-root ::selection { background: rgba(229, 143, 122, 0.35); }
@keyframes nxlHalo {
  0%, 100% { box-shadow: 0 0 0 0 rgba(229, 100, 84, 0.35); }
  50%      { box-shadow: 0 0 0 22px rgba(229, 100, 84, 0); }
}
.nxl-sos-halo { animation: nxlHalo 2.2s ease-out infinite; }
.nxl-sos-armed { animation: nxlHalo 1.1s ease-out infinite; }
.nxl-pulse { animation: nxlPulse 1.4s ease-in-out infinite; }
@keyframes nxlPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) {
  .nxl-sos-halo, .nxl-sos-armed, .nxl-pulse { animation: none; }
}
`;

export default function EmergencyPage() {
  return (
    <div
      className="nxe-shell"
      style={{ minHeight: "100dvh", backgroundColor: "#141210", colorScheme: "dark" }}
    >
      <style dangerouslySetInnerHTML={{ __html: NXE_SHELL_CSS }} />
      <EmergencyExperience />
    </div>
  );
}
