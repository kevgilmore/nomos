import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const productionEnvironment = { ...process.env, NEXT_PUBLIC_NOMOS_ENV: "production" };

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: productionEnvironment,
      stdio: "inherit",
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`${command} terminated with ${signal}`));
      else if (code) reject(new Error(`${command} exited with code ${code}`));
      else resolve();
    });
  });
}

async function assertFile(file, description) {
  try {
    await access(file, constants.F_OK);
  } catch {
    throw new Error(`Production deploy check failed: missing ${description} (${path.relative(repoRoot, file)})`);
  }
}

async function validateFitnessExport() {
  const fitnessBuild = path.join(repoRoot, "apps", "fitness", ".next-production");
  const fitnessOut = path.join(repoRoot, "apps", "fitness", "out");
  const routes = [
    "dashboard/overview",
    "dashboard/history",
    "workouts/plan",
    "workouts/exercises",
    "progress/trends",
    "exercises/library",
  ];
  for (const route of routes) {
    await assertFile(path.join(fitnessOut, route, "index.html"), `${route} HTML`);
    await assertFile(path.join(fitnessOut, route, "index.txt"), `${route} client navigation payload`);
  }
  const entries = await readFile(path.join(fitnessOut, "dashboard", "overview", "index.html"), "utf8");
  const builtEntries = await readFile(path.join(fitnessBuild, "dashboard", "overview", "index.html"), "utf8");
  if (entries !== builtEntries) throw new Error("Production deploy check failed: Firebase Hosting output is not the current Fitness production export");
  if (!entries.includes("/_next/static/chunks/")) throw new Error("Production deploy check failed: Fitness HTML has no Next.js client chunks");
}

async function validateHostingConfig() {
  const config = JSON.parse(await readFile(path.join(repoRoot, "firebase.json"), "utf8"));
  const fitness = config.hosting?.find((site) => site.target === "fitness");
  if (!fitness) throw new Error("Production deploy check failed: Firebase Hosting target 'fitness' is missing");
  if (fitness.public !== "apps/fitness/out") throw new Error("Production deploy check failed: Fitness Hosting public directory is not apps/fitness/out");
  if (fitness.cleanUrls !== false) throw new Error("Production deploy check failed: Fitness Hosting cleanUrls must be false");
  if (fitness.trailingSlash !== true) throw new Error("Production deploy check failed: Fitness Hosting trailingSlash must be true");
  if (fitness.rewrites?.some((rewrite) => rewrite.source === "**")) throw new Error("Production deploy check failed: Fitness Hosting must not have a catch-all rewrite");
}

await run(pnpmCommand, ["--filter", "@nomos/home", "build"]);
await run(pnpmCommand, ["--filter", "@nomos/fitness", "build"]);
await run(pnpmCommand, ["--filter", "@nomos/id", "build"]);
await run(process.execPath, [path.join(repoRoot, "scripts", "prepare-hosting.mjs")]);
await run("npm", ["--prefix", "functions", "run", "build"]);
await validateFitnessExport();
await validateHostingConfig();
console.log("Production Hosting build verified: static HTML, client navigation payloads, chunks, and Firebase config are ready.");
