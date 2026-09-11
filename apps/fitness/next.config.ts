import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const production = process.env.NEXT_PUBLIC_NOMOS_ENV === "production";
const nextConfig = (phase: string): NextConfig => ({ ...(production ? { output: "export" as const, distDir: ".next-production" } : { distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next" }), trailingSlash: true, transpilePackages: ["@nomos/ui", "@nomos/auth", "@nomos/data", "@nomos/api"] });
export default nextConfig;
