import type { Metadata, Viewport } from "next";
import { LazyClinicApp } from "@/components/clinic/lazy-app";

export const metadata: Metadata = {
  title: "Nexura Clinic — Simple Clinic OS",
  description:
    "A calm, simple clinic operating system — appointments, patients, quick consults, Rx & billing on one screen.",
};

export const viewport: Viewport = {
  themeColor: "#A16207",
  width: "device-width",
  initialScale: 1,
};

export default function ClinicPage() {
  return <LazyClinicApp />;
}
