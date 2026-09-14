import { execFileSync } from "node:child_process";
import { access, rename, rm } from "node:fs/promises";
import path from "node:path";

const appRoot = process.cwd();
const localApiRoute = path.join(appRoot, "app", "api", "ai", "[...path]");
const hiddenApiRoute = path.join(appRoot, ".nomos-local-ai-route");
const production = process.env.NEXT_PUBLIC_NOMOS_ENV !== "development";
let hidden = false;

try {
  let hasLocalApiRoute = true;
  try { await access(localApiRoute); } catch { hasLocalApiRoute = false; }
  if (production && hasLocalApiRoute) {
    await rename(localApiRoute, hiddenApiRoute);
    hidden = true;
  }
  await Promise.all([".next", ".next-dev", ".next-production"].map((directory) => rm(path.join(appRoot, directory), { recursive: true, force: true })));
  const nextCommand = process.platform === "win32" ? "next.cmd" : "next";
  execFileSync(path.join(appRoot, "node_modules", ".bin", nextCommand), ["build"], { cwd: appRoot, env: process.env, stdio: "inherit" });
} finally {
  if (hidden) await rename(hiddenApiRoute, localApiRoute);
}
