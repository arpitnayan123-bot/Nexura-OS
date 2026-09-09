import type { Metadata } from "next";
import { NxApp } from "@/components/nx/nx-app";

export const metadata: Metadata = {
  title: "Hospital OS — the operating system for hospitals · by Nexura",
  description:
    "The operating system that coordinates the entire hospital: command center, universal patient records, patient journey orchestration, intelligent work queues, bed lifecycle management, orders & results, medication safety, automations, analytics and Nexura Intelligence.",
};

export default function HospitalOSPage() {
  return <NxApp />;
}
