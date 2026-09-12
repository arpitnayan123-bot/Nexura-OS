import { Navbar } from "@/components/site/navbar";
import { Hero } from "@/components/site/hero";
import { FeaturesShowcase } from "@/components/site/features-showcase";
import { DiyStrip } from "@/components/site/diy-strip";
import { OsGlance } from "@/components/site/os-glance";
import { AiStrip } from "@/components/site/ai-strip";
import { GlobeCard } from "@/components/site/globe-card";
import { TrustRail } from "@/components/site/trust-rail";
import { FounderBadge } from "@/components/site/founder-badge";
import { CleanFooter } from "@/components/site/clean-footer";
import { SkipLink } from "@/components/site/skip-link";
// Overlay widgets are client-only lazy chunks — see lazy-overlays.tsx.
import {
  LazyBackToTop,
  LazyCookieConsent,
  LazyCursorGlow,
  LazyHealthAssistant,
} from "@/components/site/lazy-overlays";

export default function Home() {
  return (
    /* NEXURA LINEN — warm clinical premium. The design system
       (General Sans, inset-glass, terracotta pills, warm-dark AI
       strip) is scoped to .nx-linen so only the homepage wears it. */
    <div className="nx-linen relative flex min-h-screen flex-col bg-[#FAF7F2] text-[#2E2A26]">
      {/* Linen atmosphere — dual warm radial glows (terracotta/sage) */}
      <div
        aria-hidden
        className="nx-hero-glow pointer-events-none fixed inset-x-0 top-0 -z-10 h-[70vh]"
      />

      <SkipLink />
      <LazyCursorGlow />
      <Navbar />

      <main id="main" className="flex-1">
        <Hero />
        <OsGlance />
        <FeaturesShowcase />
        <DiyStrip />
        <AiStrip />
        <GlobeCard />
        <TrustRail />
        <FounderBadge />
      </main>

      <CleanFooter />

      <LazyHealthAssistant />
      <LazyBackToTop />
      <LazyCookieConsent />
    </div>
  );
}
