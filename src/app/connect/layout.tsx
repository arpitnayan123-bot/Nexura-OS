import type { Metadata } from "next";

/* /connect is an authenticated care-coordination surface. Its pages are
   client components, so the noindex directive lives here (server layout). */
export const metadata: Metadata = {
  title: "Nexura Connect",
  robots: { index: false, follow: false },
};

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
