import type { Metadata } from "next";
import { HospitalProfile } from "@/components/site/hospital-profile";

export const metadata: Metadata = {
  title: "Hospital Profile — Nexura Global",
  description: "View hospital details, procedures, surgeons, and reviews.",
};

export default function HospitalProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return <HospitalProfile />;
}
