import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const productionEnvironment = { ...process.env, NEXT_PUBLIC_NOMOS_ENV: "production" };
const appEntries = (await readdir(path.join(repoRoot, "apps"), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !["home", "fitness"].includes(entry.name))
  .map((entry) => entry.name);

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
    "plan",
    "exercises",
  ];
  for (const route of routes) {
    await assertFile(path.join(fitnessOut, route, "index.html"), `${route} HTML`);
    await assertFile(path.join(fitnessOut, route, "index.txt"), `${route} client navigation payload`);
  }
  const entries = await readFile(path.join(fitnessOut, "plan", "index.html"), "utf8");
  const builtEntries = await readFile(path.join(fitnessBuild, "plan", "index.html"), "utf8");
  if (entries !== builtEntries) throw new Error("Production deploy check failed: Firebase Hosting output is not the current Fitness production export");
  if (!entries.includes("/_next/static/chunks/")) throw new Error("Production deploy check failed: Fitness HTML has no Next.js client chunks");
  const cssFiles = await readdir(path.join(fitnessOut, "_next", "static", "css"));
  const css = await Promise.all(cssFiles.filter((file) => file.endsWith(".css")).map((file) => readFile(path.join(fitnessOut, "_next", "static", "css", file), "utf8")));
  if (!css.some((stylesheet) => stylesheet.includes(".size-11{") && stylesheet.includes(".z-40{"))) {
    throw new Error("Production deploy check failed: Fitness CSS is missing shared UI utilities; the isolated build likely lost the platform/ui @source path");
  }
}

async function validateHostingConfig() {
  const config = JSON.parse(await readFile(path.join(repoRoot, "firebase.json"), "utf8"));
  const defaultSite = config.hosting?.find((site) => site.target === "default");
  if (!defaultSite || defaultSite.public !== "platform/base/out") throw new Error("Production deploy check failed: Firebase default Hosting target must use platform/base/out");
  const fitness = config.hosting?.find((site) => site.target === "fitness");
  if (!fitness) throw new Error("Production deploy check failed: Firebase Hosting target 'fitness' is missing");
  if (fitness.public !== "apps/fitness/out") throw new Error("Production deploy check failed: Fitness Hosting public directory is not apps/fitness/out");
  if (fitness.cleanUrls !== false) throw new Error("Production deploy check failed: Fitness Hosting cleanUrls must be false");
  if (fitness.trailingSlash !== true) throw new Error("Production deploy check failed: Fitness Hosting trailingSlash must be true");
  if (fitness.rewrites?.some((rewrite) => rewrite.source === "**")) throw new Error("Production deploy check failed: Fitness Hosting must not have a catch-all rewrite");
}

await run(pnpmCommand, ["--filter", "@nomos/home", "build"]);
await run(pnpmCommand, ["--filter", "@nomos/base", "build"]);
await run(pnpmCommand, ["--filter", "@nomos/fitness", "build"]);
for (const app of appEntries) await run(pnpmCommand, ["--filter", `@nomos/${app}`, "build"]);
await run(pnpmCommand, ["--filter", "@nomos/id", "build"]);
await run(process.execPath, [path.join(repoRoot, "scripts", "prepare-hosting.mjs")]);
await run("npm", ["--prefix", "platform/functions", "run", "build"]);
await run("npm", ["--prefix", "apps/fitness/functions", "run", "build"]);
await validateFitnessExport();
await validateHostingConfig();
console.log("Production Hosting build verified: static HTML, client navigation payloads, chunks, and Firebase config are ready.");
