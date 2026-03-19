import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  // Sigma.js v3 and graphology are ESM-only — transpile for Next.js compatibility
  transpilePackages: [
    "sigma",
    "graphology",
    "graphology-layout-forceatlas2",
    "graphology-utils",
  ],
};

export default nextConfig;
