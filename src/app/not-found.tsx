import Link from "next/link";

/* ============================================================
   BRANDED 404 — a hospital platform should never show the
   framework's default not-found page. Liquid Gold treatment:
   charcoal ground, champagne numeral, gold CTA.
   ============================================================ */

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#141210] px-6 text-[#F6F1E7]">
      {/* ambient champagne light */}
      <div
        aria-hidden
        className="aurora-gold top-[-30%] left-1/2 h-[30rem] w-[44rem] -translate-x-1/2 opacity-40"
      />
      <div aria-hidden className="grain-fine" />

      <div className="relative w-full max-w-md text-center">
        <p className="stat-lux text-gold-gradient text-7xl sm:text-8xl" aria-hidden="true">
          404
        </p>
        <p className="eyebrow mt-2 justify-center">Page not found</p>
        <h1 className="title-lux mt-3 text-2xl sm:text-3xl">This page isn&apos;t on the chart</h1>
        <p className="lede-lux mt-3 text-sm text-white/60">
          The page you asked for doesn&apos;t exist or may have moved. If you followed a link from
          inside Hospital OS, use the back arrow in the app — your windows are still open.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link href="/" className="btn-gold h-10 rounded-full px-5 text-sm font-semibold">
            Go home
          </Link>
          <Link
            href="/hospital"
            className="btn-glass-lux h-10 rounded-full border-white/15 bg-white/5 px-5 text-sm font-medium text-white/85"
          >
            Open Hospital OS
          </Link>
        </div>
      </div>
    </main>
  );
}
