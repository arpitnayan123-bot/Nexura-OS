import type { Metadata } from "next";

/* ============================================================
 * NEXURA PREDICTIVE — /predictive
 *
 * HOLLOW SHELL. The previous feature build has been fully
 * removed; this route intentionally renders a minimal dark
 * placeholder while the next-generation experience is built
 * from scratch. The site chrome (navbar, hamburger, homepage
 * caption) remains untouched and keeps pointing here.
 *
 * The inline canvas paint + :has() body rule are kept from the
 * white-screen hardening: this page must never render white,
 * even if the Tailwind chunk fails to load.
 * ============================================================ */

export const metadata: Metadata = {
  title: "Nexura Predictive",
  description:
    "Healthcare is Reactive. Nexura is Predictive. The next generation of Nexura Predictive is being rebuilt.",
};

const HOLLOW_SHELL_CSS = `
html:has(.nxp-hollow),
body:has(.nxp-hollow) {
  background: #0A1220 !important;
}
html:has(.nxp-hollow) { color-scheme: dark; }
@keyframes nxpHollowPulse {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.25); }
}
.nxp-hollow-dot { animation: nxpHollowPulse 1.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .nxp-hollow-dot { animation: none; }
}
`;

export default function PredictivePage() {
  return (
    <div
      className="nxp-hollow flex min-h-screen flex-col"
      style={{ backgroundColor: "#0A1220", minHeight: "100dvh", colorScheme: "dark" }}
    >
      <style dangerouslySetInnerHTML={{ __html: HOLLOW_SHELL_CSS }} />
      <main
        className="flex flex-1 items-center justify-center px-6"
        style={{ minHeight: "100dvh" }}
      >
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6 flex items-center justify-center gap-2" aria-hidden="true">
            <span className="nxp-hollow-dot inline-block h-2 w-2 rounded-full bg-teal-300" />
            <span
              className="nxp-hollow-dot inline-block h-2 w-2 rounded-full bg-teal-300"
              style={{ animationDelay: "0.3s" }}
            />
            <span
              className="nxp-hollow-dot inline-block h-2 w-2 rounded-full bg-teal-300"
              style={{ animationDelay: "0.6s" }}
            />
          </div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-300">
            Nexura Predictive
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
            Healthcare is Reactive.
            <span className="block text-teal-300">But Nexura is Predictive.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            The next generation of Predictive Health Intelligence is being rebuilt
            from the ground up. It will read your symptoms, diet, fitness, sleep and
            history to map your health trajectory — calibrated for Indian lives.
          </p>
          <a
            href="/"
            className="mt-8 inline-flex min-h-[44px] items-center rounded-full border border-white/10 px-5 text-sm font-medium text-slate-200 transition hover:border-teal-300/40 hover:text-white"
          >
            Return to Hospital OS
          </a>
        </div>
      </main>
    </div>
  );
}
