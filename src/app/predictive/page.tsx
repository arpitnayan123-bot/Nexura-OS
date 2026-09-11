import Link from "next/link";

/* ============================================================
 * NEXURA PREDICTIVE — hollow shell
 *
 * The previous Predictive Intelligence Engine console (hero radar,
 * bento grid, twin simulator, forecast explorer, protocol pipeline)
 * has been fully removed. This route is intentionally an empty
 * vessel: the section stays registered across the site (navbar
 * link, hamburger menu, homepage product grid all point here) but
 * contains no feature code. The next generation of the predictive
 * experience will be rebuilt from scratch on this route.
 *
 * Kept elsewhere on purpose (NOT part of this page):
 *   • src/modules/pi-engine/            — engine + 119 unit tests
 *   • src/app/api/nx/predict/*          — smoke-covered API surface
 *   • risk-badge / protocol-card / twin-simulator — Hospital OS
 *     module (src/components/nx/mod-pie.tsx) dependencies
 * ============================================================ */

export const metadata = {
  title: "Nexura Predictive",
  description: "Predictive analysis — module cleared. Rebuilding from scratch.",
};

export default function PredictivePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0B1220] px-6 text-center">
      {/* faint ambient glow — placeholder ambience only */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.07] blur-[130px]" />
      </div>

      <main className="relative">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
          Nexura Predictive
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Predictive Analysis — module cleared
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-300">
          This section has been intentionally hollowed out. The next generation
          of the predictive experience will be built here from scratch.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          Return to Hospital OS
        </Link>
      </main>
    </div>
  );
}
