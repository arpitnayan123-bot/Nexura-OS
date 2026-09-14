import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/site/theme-provider";
import { BookingProvider } from "@/components/site/booking-context";
import { BookingModalLazy } from "@/components/site/booking-modal-lazy";
import { PwaRegister } from "@/components/pwa-register";
import { ErrorSentinel } from "@/components/nx/error-sentinel";
import { HydrationWatchdog } from "@/components/site/hydration-watchdog";
import { CommandPalette } from "@/components/site/command-palette";

// Preview freshness guarantee: without this, fully static pages emit
// "Cache-Control: s-maxage=31536000" and any proxy/CDN between the
// sandbox and the user's preview window pins stale HTML for a year.
// revalidate=0 renders pages dynamically and emits no-store headers,
// so every preview load reflects the latest deployed build.
export const revalidate = 0;

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

// Precision mono for numerics, timestamps and clinical codes
// (Predictive Intelligence Engine console, gauges, UHIDs).
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexura — A Calmer Operating System for Health",
  description:
    "Nexura unifies AI diagnostics, continuous monitoring, and human care into one warm, intelligent health platform. Home of Hospital OS. Care that listens, learns, and breathes with you.",
  manifest: "/manifest.webmanifest",
  keywords: [
    "Nexura",
    "healthcare platform",
    "AI health",
    "telemedicine",
    "remote monitoring",
    "care plans",
    "patient experience",
  ],
  authors: [{ name: "Nexura" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Nexura — A Calmer Operating System for Health",
    description:
      "AI diagnostics, continuous monitoring, and human care — unified in one warm, intelligent platform.",
    siteName: "Nexura",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexura — A Calmer Operating System for Health",
    description:
      "AI diagnostics, continuous monitoring, and human care — unified in one warm, intelligent platform.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${fraunces.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        {/* Hydration-failure watchdog: if React never hydrates (a preview
            sandbox restart can kill a JS chunk mid-flight), framer-motion's
            inline `opacity: 0` entrance states would keep entire sections —
            e.g. the homepage hero — permanently invisible. This inline
            script runs even when NO hydration bundles load: after 4s it
            force-reveals everything unless HydrationWatchdog has flagged a
            successful hydration. Inline on purpose — never a lazy chunk. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{setTimeout(function(){if(!window.__nxHydrated){document.documentElement.classList.add('nx-force-visible');}},4000);}catch(e){}",
          }}
        />
        <HydrationWatchdog />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <BookingProvider>
            {children}
            <BookingModalLazy />
          </BookingProvider>
          {/* Single sonner viewport for the entire app — mounting more than one
              renders every toast twice. top-center clears the OS system bar
              (46px) and never overlaps the dock or the mobile back FAB. */}
          <SonnerToaster position="top-center" offset={56} richColors closeButton visibleToasts={3} />
          <CommandPalette />
          <PwaRegister />
          <ErrorSentinel />
          <HydrationWatchdog />
        </ThemeProvider>
      </body>
    </html>
  );
}
