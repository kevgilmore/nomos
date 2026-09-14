import type { NextConfig } from "next";
const production = process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_NOMOS_ENV !== "development";
const nextConfig: NextConfig = { ...(production ? { output: "export" as const, distDir: ".next-production" } : { distDir: ".next-dev" }), trailingSlash: true, transpilePackages: ["@nomos/ai", "@nomos/api", "@nomos/auth", "@nomos/data", "@nomos/ui"] };
export default nextConfig;
