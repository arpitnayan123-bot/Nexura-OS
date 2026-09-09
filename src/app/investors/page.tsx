import type { Metadata } from "next";
import { InvestorDeck } from "@/components/investors/investor-deck";

export const metadata: Metadata = {
  title: "Nexura OS — Investor Deck",
  description: "India's first unified AI-native healthcare operating system. Building the infrastructure for 1.4 billion people.",
};

export const viewport = { themeColor: "#0A0A0A", width: "device-width", initialScale: 1 };

export default function InvestorsPage() { return <InvestorDeck />; }
