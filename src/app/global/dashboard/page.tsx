import type { Metadata } from "next";
import { GlobalDashboard } from "@/components/site/global-dashboard";

export const metadata: Metadata = {
  title: "Nexura Global — Coordinator Dashboard | International Patient Desk",
  description:
    "Secure coordinator workspace for managing international medical tourism inquiries, cost estimates, patient journeys, and analytics. NABH & JCI accredited hospitals across India.",
  keywords: [
    "medical tourism coordinator",
    "international patient desk",
    "hospital tourism dashboard",
    "cost estimate generator",
    "patient journey kanban",
    "visa coordination",
  ],
  alternates: {
    canonical: "/global/dashboard",
  },
  openGraph: {
    title: "Nexura Global — Coordinator Dashboard",
    description:
      "Secure workspace for international patient coordinators. Manage inquiries, generate cost estimates, track patient journeys end-to-end.",
    siteName: "Nexura OS",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export const viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
};

export default function GlobalDashboardPage() {
  return <GlobalDashboard />;
}
