import type { Metadata } from "next";
import { GlobalPage } from "@/components/site/global-page";

export const metadata: Metadata = {
  title: "Nexura OS Global — India's Most Trusted Medical Tourism Destination",
  description:
    "Discover India's NABH & JCI accredited hospitals. Transparent USD pricing for cardiac surgery, orthopaedics, oncology, IVF, transplants and more. Save up to 90% vs USA / UK / UAE. Free cost estimate in 24 hours.",
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
      "India's most trusted hospitals. Transparent pricing. Expert care. Save up to 90% on world-class treatment.",
    siteName: "Nexura OS",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function GlobalRoute() {
  return <GlobalPage />;
}
