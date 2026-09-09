import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/site/theme-provider";
import { BookingProvider } from "@/components/site/booking-context";
import { BookingModal } from "@/components/site/booking-modal";

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

export const metadata: Metadata = {
  title: "Nexura — A Calmer Operating System for Health",
  description:
    "Nexura unifies AI diagnostics, continuous monitoring, and human care into one warm, intelligent health platform. Home of Hospital OS. Care that listens, learns, and breathes with you.",
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
        className={`${jakarta.variable} ${fraunces.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <BookingProvider>
            {children}
            <BookingModal />
          </BookingProvider>
          {/* Single sonner viewport for the entire app — mounting more than one
              renders every toast twice. top-center clears the OS system bar
              (46px) and never overlaps the dock or the mobile back FAB. */}
          <SonnerToaster position="top-center" offset={56} richColors closeButton visibleToasts={3} />
        </ThemeProvider>
      </body>
    </html>
  );
}
