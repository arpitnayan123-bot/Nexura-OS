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
