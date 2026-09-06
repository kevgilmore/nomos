import type { NextConfig } from "next";

const nextConfig: NextConfig = { output: "export", distDir: "out", transpilePackages: ["@nomos/ui", "@nomos/auth", "@nomos/data", "@nomos/api"], devIndicators: false };
export default nextConfig;
