"use client";

import dynamic from "next/dynamic";

/**
 * Client-only lazy wrappers for the homepage's non-blocking overlay widgets.
 *
 * Each target is either interaction-gated (chat assistant), scroll-gated
 * (back-to-top), consent/state-gated (cookie banner), or purely decorative
 * and invisible until pointer input (cursor glow). None contribute SSR HTML,
 * so loading them as post-hydration client chunks keeps their JS out of the
 * critical first-paint bundle. `ssr: false` is legal here because this file
 * is a Client Component (App Router requirement).
 */
const loading = () => null;

export const LazyHealthAssistant = dynamic(
  () => import("@/components/widgets/health-assistant").then((m) => m.HealthAssistant),
  { ssr: false, loading },
);

export const LazyCursorGlow = dynamic(
  () => import("@/components/site/cursor-glow").then((m) => m.CursorGlow),
  { ssr: false, loading },
);

export const LazyBackToTop = dynamic(
  () => import("@/components/site/back-to-top").then((m) => m.BackToTop),
  { ssr: false, loading },
);

export const LazyCookieConsent = dynamic(
  () => import("@/components/site/cookie-consent").then((m) => m.CookieConsent),
  { ssr: false, loading },
);
