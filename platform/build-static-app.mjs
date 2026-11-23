import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const appRoot = process.cwd();
const repoRoot = path.resolve(appRoot, "../..");
const tempRoot = await mkdtemp(path.join(repoRoot, ".nomos-static-build-"));
const buildRoot = path.join(tempRoot, "apps", path.basename(appRoot));

function copyFilter(source) {
  const relative = path.relative(appRoot, source);
  if (!relative) return true;
  const segments = relative.split(path.sep);
  if (segments[0] === "app" && segments[1] === "api" && segments[2] === "ai") return false;
  return !segments.includes("node_modules") && !segments.includes("out") && !segments.some((segment) => segment.startsWith(".next"));
}

try {
  await cp(appRoot, buildRoot, { recursive: true, filter: copyFilter });
  await symlink(path.join(appRoot, "node_modules"), path.join(buildRoot, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  await cp(path.join(repoRoot, "platform", "ui"), path.join(tempRoot, "platform", "ui"), { recursive: true });

  try {
    const buildNextEnvFile = path.join(buildRoot, "next-env.d.ts");
    const buildNextEnv = await readFile(buildNextEnvFile, "utf8");
    await writeFile(buildNextEnvFile, buildNextEnv.replace(/\.next(?:-dev)?\/types\/routes\.d\.ts/g, ".next-production/types/routes.d.ts"));
  } catch {}

  const nextCommand = process.platform === "win32" ? "next.cmd" : "next";
  execFileSync(path.join(buildRoot, "node_modules", ".bin", nextCommand), ["build"], {
    cwd: buildRoot,
    env: { ...process.env, NODE_ENV: "production", NEXT_PUBLIC_NOMOS_ENV: "production" },
    stdio: "inherit",
  });

  for (const directory of [".next-production"]) {
    await rm(path.join(appRoot, directory), { recursive: true, force: true });
    await cp(path.join(buildRoot, directory), path.join(appRoot, directory), { recursive: true });
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
