import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

// The workspace keeps shared Firebase client configuration in the repository
// root, while this app is executed from platform/id. Load that file for local
// development; production deploys can still provide explicit environment
// variables at build time.
const rootEnv = path.resolve(__dirname, "../../.env");
if (fs.existsSync(rootEnv)) {
  for (const line of fs.readFileSync(rootEnv, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const nextConfig: NextConfig = {
  ...(process.env.NEXT_PUBLIC_NOMOS_ENV === "production" ? { output: "export" as const } : {}),
  trailingSlash: true,
  transpilePackages: ["@nomos/auth", "@nomos/ui"],
};

export default nextConfig;
