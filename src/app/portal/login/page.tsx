import { PortalLogin } from "@/components/portal/portal-login";

export const metadata = {
  title: "Login · Nexura Patient Portal",
  description: "Secure phone-first login to your unified health record, blood tests at home, and AI insights.",
  robots: { index: false, follow: false }, // authenticated healthcare surface — never index
};

export default function PortalLoginPage() {
  return <PortalLogin />;
}
