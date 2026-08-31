import type { NextConfig } from "next";

const nextConfig: NextConfig = { transpilePackages: ["@nomos/ui", "@nomos/auth", "@nomos/data", "@nomos/api"], devIndicators: false };
export default nextConfig;
