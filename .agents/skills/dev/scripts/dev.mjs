import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const appsRoot = path.join(repoRoot, "apps");
const baseRoot = path.join(repoRoot, "platform", "base");
const requestedApp = process.argv.includes("--app") ? process.argv[process.argv.indexOf("--app") + 1] : null;
const portArgument = process.argv.includes("--port") ? Number(process.argv[process.argv.indexOf("--port") + 1]) : 3000;
const firstPort = Number.isInteger(portArgument) && portArgument > 0 ? portArgument : 3000;
const hostname = "127.0.0.1";
const stateDirectory = path.join(repoRoot, ".nomos-dev");
const statePath = path.join(stateDirectory, "servers.json");

async function findApps(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const apps = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      apps.push(...await findApps(entryPath));
      continue;
    }
    if (entry.name !== "package.json") continue;
    const packageJson = JSON.parse(await readFile(entryPath, "utf8"));
    if (packageJson.private !== true || typeof packageJson.scripts?.dev !== "string") continue;
    apps.push({ name: packageJson.name, directory: path.dirname(entryPath) });
  }
  return apps;
}

async function manifestPort(app, fallback) {
  try {
    const manifest = JSON.parse(await readFile(path.join(app.directory, "app.manifest.json"), "utf8"));
    const match = typeof manifest.href === "string" && manifest.href.match(/^http:\/\/localhost:(\d+)$/);
    if (match && firstPort === 3000) return Number(match[1]);
  } catch {}
  return fallback;
}

const discoveredApps = [...await findApps(baseRoot), ...await findApps(appsRoot)].sort((left, right) => left.name.localeCompare(right.name));
const apps = requestedApp ? discoveredApps.filter((app) => app.name === `@nomos/${requestedApp}` || path.basename(app.directory) === requestedApp) : discoveredApps;

if (apps.length === 0) {
  console.error(requestedApp ? `No runnable app found for '${requestedApp}'.` : "No runnable apps found under apps/.");
  process.exit(1);
}

const missingDependencies = apps.filter((app) => !existsSync(path.join(app.directory, "node_modules", ".bin", "next")));
if (missingDependencies.length > 0) {
  console.error(`[dev] Dependencies are missing for: ${missingDependencies.map((app) => app.name).join(", ")}.`);
  console.error("[dev] Run `pnpm install` once in a normal terminal, then run $dev again.");
  process.exit(1);
}

const children = [];
let nextPort = firstPort;
await mkdir(stateDirectory, { recursive: true });
for (const app of apps) {
  const port = await manifestPort(app, nextPort++);
  console.log(`[dev] ${app.name} → http://${hostname}:${port}`);
  const child = spawn(path.join(app.directory, "node_modules", ".bin", "next"), ["dev", "--hostname", hostname, "--port", String(port)], {
    cwd: app.directory,
    env: process.env,
    stdio: "inherit",
    detached: true
  });
  children.push(child);
}

await writeFile(statePath, JSON.stringify({ servers: children.map((child, index) => ({ pid: child.pid, app: apps[index].name, port: firstPort + index })) }, null, 2) + "\n");
console.log(`[dev] Started ${apps.length} app${apps.length === 1 ? "" : "s"}.`);

function shutdown(signal) {
  for (const child of children) {
    try { process.kill(-child.pid, signal); } catch {}
  }
  rmSync(statePath, { force: true });
}
// Let Next/webpack close cleanly so an interrupted cache write cannot corrupt
// the next development startup.
process.once("SIGINT", () => shutdown("SIGTERM"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

await Promise.all(children.map((child) => new Promise((resolve) => child.once("exit", resolve))));
await rm(statePath, { force: true });
