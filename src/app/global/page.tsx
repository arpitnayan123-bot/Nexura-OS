import type { Metadata } from "next";
import { GlobalPage } from "@/components/site/global-page";

export const metadata: Metadata = {
  title: "Nexura OS Global — India's Most Trusted Medical Tourism Destination",
  description:
    "Discover India's NABH & JCI accredited hospital network. Transparent USD pricing for cardiac surgery, orthopaedics, oncology, IVF, transplants and more — typically a fraction of US prices. Free cost estimate on inquiry.",
  keywords: [
    "medical tourism India",
    "NABH accredited hospitals",
    "JCI accredited hospitals India",
    "cardiac surgery India",
    "IVF India",
    "kidney transplant India",
    "liver transplant India",
    "medical treatment India cost",
    "international patient care",
  ],
  alternates: {
    canonical: "/global",
    languages: { en: "/global", ar: "/global" },
  },
  openGraph: {
    title: "Nexura OS Global — Medical Tourism, India",
    description:
      "India's accredited hospital network. Transparent pricing. Expert care. Treatment costs typically a fraction of US prices.",
    siteName: "Nexura OS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function GlobalRoute() {
  return <GlobalPage />;
}
