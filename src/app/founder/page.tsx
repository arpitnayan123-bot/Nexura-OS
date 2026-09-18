import type { Metadata } from "next";
import { FounderStory } from "@/components/site/founder-story";

export const metadata: Metadata = {
  title: "The Founder — Arpit Nayan · Nexura OS",
  description:
    "The story of Arpit Nayan — a student from Bihar who walked into a hospital and decided to build the operating system Indian healthcare deserves.",
};

export const viewport = { themeColor: "#08080A", width: "device-width", initialScale: 1 };

export default function FounderPage() {
  return <FounderStory />;
}
