import type { Metadata, Viewport } from "next";
import { LazyPharmacia } from "@/components/pharmacy/lazy-pharmacia";

export const metadata: Metadata = {
  title: "Nexura Pharmacia — AI-Powered Pharmacy OS",
  description:
    "World-class AI-powered pharmacy operating system — 5 years ahead of Marg ERP. Dark-mode-first, Schedule H compliant, AI prescription reading, drug interaction checker, demand forecasting.",
};

export const viewport: Viewport = {
  themeColor: "#0D0F12",
  width: "device-width",
  initialScale: 1,
};

export default function PharmacyPage() {
  return <LazyPharmacia />;
}
