import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentation.ts is enabled by default in Next.js 15+
  // output: "standalone" enables minimal Docker image (copies only needed files)
  output: "standalone",
};

export default nextConfig;
