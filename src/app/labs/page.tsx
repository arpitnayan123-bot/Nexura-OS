import type { Metadata } from "next";
import { LabsExperience } from "@/components/labs/labs-experience";

/* ============================================================
   NEXURA LABS — "Diagnostics, Decoded." · /labs
   ------------------------------------------------------------
   At-home diagnostics: NABL-certified labs, certified
   phlebotomists at your door in 30-minute windows, and
   AI-decoded plain-language reports. Decision support,
   never a diagnosis — physician validation on every report.

   Dark charcoal canvas in the Liquid Gold 2.0 language;
   inline shell CSS keeps the anti-white-screen hardening.
   ============================================================ */

export const metadata: Metadata = {
  title: "Nexura Labs — Diagnostics, Decoded",
  description:
    "400+ lab tests collected at home by certified phlebotomists, run in NABL-certified labs, and decoded by AI into plain language. Reports in 4–12 hours across 50 cities. A product of Nexura OS.",
};

const NXL_SHELL_CSS = `
html:has(.nxl-root),
body:has(.nxl-root) {
  background: #141210 !important;
}
html:has(.nxl-root) { color-scheme: dark; }
.nxl-root ::selection { background: rgba(200, 165, 91, 0.35); }
`;

export default function LabsPage() {
  return (
    <div
      className="nxl-shell"
      style={{ minHeight: "100dvh", backgroundColor: "#141210", colorScheme: "dark" }}
    >
      <style dangerouslySetInnerHTML={{ __html: NXL_SHELL_CSS }} />
      <LabsExperience />
    </div>
  );
}
