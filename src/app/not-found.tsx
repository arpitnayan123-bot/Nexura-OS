import Link from "next/link";

/* ============================================================
   BRANDED 404 — a hospital platform should never show the
   framework's default not-found page.
   ============================================================ */

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6 text-white">
      <div className="w-full max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#d98b6e]">404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">This page isn&apos;t on the chart</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          The page you asked for doesn&apos;t exist or may have moved. If you followed a link from
          inside Hospital OS, use the back arrow in the app — your windows are still open.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-[#d98b6e] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#c97a5d]"
          >
            Go home
          </Link>
          <Link
            href="/hospital"
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
          >
            Open Hospital OS
          </Link>
        </div>
      </div>
    </main>
  );
}
