import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Static export is for Firebase Hosting production builds. Local development
  // needs the Next server so the local SSO middleware can run before rendering.
  ...(process.env.NEXT_PUBLIC_NOMOS_ENV === "production" ? { output: "export" as const } : {}),
  trailingSlash: true,
  transpilePackages: ["@nomos/api", "@nomos/auth", "@nomos/data", "@nomos/ui"],
};
export default nextConfig;
