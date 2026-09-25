import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browsers still ask for /favicon.ico on their own; answer with the SVG app icon instead of a 404.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icon.svg" }];
  },
};

export default nextConfig;
