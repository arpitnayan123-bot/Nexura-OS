import { Navbar } from "@/components/site/navbar";
import { Hero } from "@/components/site/hero";
import { FeaturesShowcase } from "@/components/site/features-showcase";
import { FounderBadge } from "@/components/site/founder-badge";
import { ProductShowcase } from "@/components/site/product-showcase";
import { CleanFooter } from "@/components/site/clean-footer";
import { HealthAssistant } from "@/components/widgets/health-assistant";
import { BackToTop } from "@/components/site/back-to-top";
import { SkipLink } from "@/components/site/skip-link";
import { CursorGlow } from "@/components/site/cursor-glow";
import { CookieConsent } from "@/components/site/cookie-consent";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Global soft top glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[60vh] bg-[radial-gradient(60%_60%_at_50%_0%,oklch(0.85_0.10_55/0.30),transparent_70%)]"
      />

      <SkipLink />
      <CursorGlow />
      <Navbar />

      <main id="main" className="flex-1">
        <Hero />
        <FeaturesShowcase />
        <FounderBadge />
      </main>

      <CleanFooter />

      <HealthAssistant />
      <BackToTop />
      <CookieConsent />
    </div>
  );
}
