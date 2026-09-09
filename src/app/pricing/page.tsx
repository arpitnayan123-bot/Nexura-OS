import type { Metadata } from "next";
import { PricingPage } from "@/components/investors/pricing-page";

export const metadata: Metadata = {
  title: "Pricing — Nexura OS",
  description: "Simple, transparent SaaS pricing for Indian healthcare. Hospital OS, Clinic OS, Pharmacy POS, Patient Portal.",
};

export const viewport = { themeColor: "#FAF7F2", width: "device-width", initialScale: 1 };

export default function PricingRoute() { return <PricingPage />; }
