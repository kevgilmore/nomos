import type { NextConfig } from "next";

const production = process.env.NEXT_PUBLIC_NOMOS_ENV === "production";
const nextConfig: NextConfig = { ...(production ? { output: "export" as const, distDir: ".next-production" } : { distDir: ".next-dev" }), trailingSlash: true, transpilePackages: ["@nomos/ui", "@nomos/auth", "@nomos/data", "@nomos/api"] };
export default nextConfig;
