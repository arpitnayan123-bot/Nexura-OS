import type { Metadata, Viewport } from "next";
import { DiyApp } from "@/components/diy/app";

export const metadata: Metadata = {
  title: "Nexura DIY · Your calm wellness roadmap",
  description:
    "Tell it like it is — one chat builds a safe, realistic wellness roadmap. Free in beta, no sign-in, Hinglish welcome. Not a diagnosis.",
};

export const viewport: Viewport = {
  themeColor: "#F7EFE3",
  width: "device-width",
  initialScale: 1,
};

export default function DiyPage() {
  return <DiyApp />;
}
