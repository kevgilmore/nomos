import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const appRoot = path.resolve(import.meta.dirname, "..");
const nextEnvFile = path.join(appRoot, "next-env.d.ts");
const production = process.env.NEXT_PUBLIC_NOMOS_ENV === "production";
// Keep the isolated build under the repository root. Fitness globals.css uses
// a repository-relative Tailwind @source path for the shared UI package; a
// /tmp copy makes that path point outside the repository and silently drops
// shared utilities from the production CSS.
const tempRoot = production ? await mkdtemp(path.join(path.resolve(appRoot, "../.."), ".nomos-fitness-build-")) : null;
const buildRoot = production ? path.join(tempRoot, "apps", "fitness") : appRoot;

function productionCopyFilter(source) {
  const relative = path.relative(appRoot, source);
  if (!relative) return true;
  const segments = relative.split(path.sep);
  if (segments.includes("node_modules") || segments.includes("out") || segments.some((segment) => segment.startsWith(".next"))) return false;
  if (segments[0] === "app" && segments[1] === "api") return false;
  return true;
}

function runNextBuild(cwd) {
  return new Promise((resolve, reject) => {
    const command = path.join(appRoot, "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
    const child = spawn(command, ["build"], { cwd, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`next build terminated with ${signal}`));
      else if (code) reject(new Error(`next build exited with code ${code}`));
      else resolve();
    });
  });
}

try {
  if (production) {
    // Firebase Hosting serves the exported frontend and routes /api/* to the
    // deployed Functions. Next's static exporter cannot include route handlers,
    // so build an isolated copy without app/api. Never remove app/api from the
    // source tree: a running next dev server may be watching it.
    await cp(appRoot, buildRoot, { recursive: true, filter: productionCopyFilter });
    // Keep a build-only copy of shared UI sources inside the staged app. This
    // makes Tailwind's default scanner include every utility used by the
    // transpiled @nomos/ui components even when the app is built in isolation.
    const sharedUiSource = path.resolve(appRoot, "../../platform/ui");
    await cp(sharedUiSource, path.join(buildRoot, "components", "nomos-shared-ui"), { recursive: true });
    await symlink(path.join(appRoot, "node_modules"), path.join(buildRoot, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    const buildNextEnvFile = path.join(buildRoot, "next-env.d.ts");
    const buildNextEnv = await readFile(buildNextEnvFile, "utf8");
    await writeFile(buildNextEnvFile, buildNextEnv.replace(/\.next(?:-dev)?\/types\/routes\.d\.ts/g, ".next-production/types/routes.d.ts"));
  }
  await runNextBuild(buildRoot);
  if (production) {
    // Publish the isolated build artifacts only after the build succeeds.
    await rm(path.join(appRoot, ".next-production"), { recursive: true, force: true });
    await cp(path.join(buildRoot, ".next-production"), path.join(appRoot, ".next-production"), { recursive: true });
  }
} finally {
  if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
}
