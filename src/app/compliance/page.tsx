import type { Metadata } from "next";
import { CompliancePage } from "@/components/investors/compliance-page";

export const metadata: Metadata = {
  title: "Compliance — Nexura OS",
  description: "ABDM, DPDP 2023, NABH, CDSCO, IRDAI, GST — Nexura OS is built compliant from day one.",
};

export const viewport = { themeColor: "#0A0A0A", width: "device-width", initialScale: 1 };

export default function ComplianceRoute() { return <CompliancePage />; }
