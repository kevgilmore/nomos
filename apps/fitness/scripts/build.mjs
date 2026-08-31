import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const appRoot = path.resolve(import.meta.dirname, "..");
const apiDirectory = path.join(appRoot, "app", "api");
const nextEnvFile = path.join(appRoot, "next-env.d.ts");
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "nomos-fitness-build-"));
const hiddenApiDirectory = path.join(tempRoot, "api");
const production = process.env.NEXT_PUBLIC_NOMOS_ENV === "production";
const originalNextEnv = await readFile(nextEnvFile, "utf8");

function runNextBuild() {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const child = spawn(command, ["exec", "next", "build"], { cwd: appRoot, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`next build terminated with ${signal}`));
      else if (code) reject(new Error(`next build exited with code ${code}`));
      else resolve();
    });
  });
}

try {
  // Firebase Hosting serves the exported frontend and routes /api/* to the
  // deployed Functions. Next's static exporter cannot include route handlers,
  // but keeping them in the source tree preserves the local Next API.
  if (production) {
    // A running next dev server may have rewritten next-env.d.ts to point at
    // .next-dev. Keep production type generation isolated from that artifact.
    await writeFile(nextEnvFile, originalNextEnv.replace(/\.next(?:-dev)?\/types\/routes\.d\.ts/g, ".next-production/types/routes.d.ts"));
    await cp(apiDirectory, hiddenApiDirectory, { recursive: true });
    await rm(apiDirectory, { recursive: true, force: true });
  }
  await runNextBuild();
} finally {
  if (production) {
    await rm(apiDirectory, { recursive: true, force: true });
    await cp(hiddenApiDirectory, apiDirectory, { recursive: true });
    await writeFile(nextEnvFile, originalNextEnv);
  }
  await rm(tempRoot, { recursive: true, force: true });
}
