import { PortalApp } from "@/components/portal/portal-app";

export const metadata = {
  title: "Patient Portal · Nexura OS",
  description:
    "Your unified health dashboard — appointments, blood tests at home, records, and AI-assisted report reading.",
  robots: { index: false, follow: false }, // authenticated healthcare surface — never index
};

export default function PortalPage() {
  return <PortalApp />;
}
