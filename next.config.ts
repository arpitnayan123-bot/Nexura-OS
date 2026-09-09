import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* Preview gateway embeds the app from *.space-z.ai — allow these origins
     in dev so Next 16 does not block cross-origin asset/router requests. */
  allowedDevOrigins: ["space-z.ai", "*.space-z.ai"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
