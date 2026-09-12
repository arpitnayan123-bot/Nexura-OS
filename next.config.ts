import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* STALENESS DEFENSE (L4): the preview gateway (*.space-z.ai) embeds this
     app through a proxy. HTML documents must NEVER be cached by browsers or
     intermediate layers — a cached document references old content-hashed
     assets, which is how "the preview shows an old version" happens even
     when the server is correct. Immutable hashed static assets stay cached
     forever (safe: their names change on every build). Rule order matters:
     the later /_next/static rule overrides the blanket no-store. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          /* Production-grade security headers (healthcare platform).
             frame-ancestors allows same-origin + the preview gateway
             (*.space-z.ai / *.z.ai) so the preview window keeps working
             while blocking arbitrary third-party embedding. */
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=(self)",
          },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://*.space-z.ai http://*.space-z.ai https://*.z.ai",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  /* Preview gateway embeds the app from *.space-z.ai — allow these origins
     in dev so Next 16 does not block cross-origin asset/router requests. */
  allowedDevOrigins: ["space-z.ai", "*.space-z.ai"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
