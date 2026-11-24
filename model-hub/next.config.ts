import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // model-hub lives inside a monorepo; pin tracing/root so parent lockfiles
  // and postcss configs do not leak into this app's build.
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
