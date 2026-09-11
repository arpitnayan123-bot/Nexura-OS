import { Navbar } from "@/components/site/navbar";
import { Hero } from "@/components/site/hero";
import { FeaturesShowcase } from "@/components/site/features-showcase";
import { OsGlance } from "@/components/site/os-glance";
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
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Global soft top glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[60vh] bg-[radial-gradient(60%_60%_at_50%_0%,oklch(0.85_0.10_55/0.30),transparent_70%)]"
      />

      <SkipLink />
      <LazyCursorGlow />
      <Navbar />

      <main id="main" className="flex-1">
        <Hero />
        <FeaturesShowcase />
        <OsGlance />
        <FounderBadge />
      </main>

      <CleanFooter />

      <LazyHealthAssistant />
      <LazyBackToTop />
      <LazyCookieConsent />
    </div>
  );
}
