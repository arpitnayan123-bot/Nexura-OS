import type { MetadataRoute } from "next";

/* Public routes only — private application surfaces (/portal, /connect,
   /global/dashboard, /api) are deliberately excluded from both this sitemap
   and robots.txt Allow. See public/robots.txt. */
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nexura-os.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/pricing",
    "/founder",
    "/investors",
    "/know-your-health",
    "/hospital",
    "/clinic",
    "/care",
    "/labs",
    "/vitals",
    "/emergency",
    "/diy",
    "/predictive",
    "/pharmacy",
    "/global",
    "/compliance",
  ];
  return routes.map((r) => ({
    url: `${SITE}${r}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: r === "" ? 1 : 0.7,
  }));
}
