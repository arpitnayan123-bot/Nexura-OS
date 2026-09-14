import type { Metadata } from "next";
import { CareExperience } from "@/components/care/care-experience";

/* ============================================================
   NEXURA CARE CIRCLE — "One circle. Every generation." · /care
   ------------------------------------------------------------
   Family health management: interactive member dashboard,
   immunization timeline, elder medication adherence synced from
   Pharmacia, family insurance utilization, DPDP consent matrix
   with live toggles.

   Demo family (Mehta household), deterministic data, Liquid
   Gold canvas.
   ============================================================ */

export const metadata: Metadata = {
  title: "Nexura Care Circle — One Circle, Every Generation",
  description:
    "Family health in one calm view: switch between members, track kids' vaccinations, watch elders' medication adherence, see family insurance utilization — with DPDP-grade consent controls. A product of Nexura OS.",
};

const NXC_SHELL_CSS = `
html:has(.nxc-root),
body:has(.nxc-root) {
  background: #141210 !important;
}
html:has(.nxc-root) { color-scheme: dark; }
.nxc-root ::selection { background: rgba(200, 165, 91, 0.35); }
`;

export default function CarePage() {
  return (
    <div
      className="nxc-shell"
      style={{ minHeight: "100dvh", backgroundColor: "#141210", colorScheme: "dark" }}
    >
      <style dangerouslySetInnerHTML={{ __html: NXC_SHELL_CSS }} />
      <CareExperience />
    </div>
  );
}
