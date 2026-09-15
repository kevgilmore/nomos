#!/usr/bin/env node

import { existsSync, readFileSync, readlinkSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import net from "node:net";
import { homedir } from "node:os";
import { randomBytes } from "node:crypto";
import { deploymentReporter, deploymentMessage } from "./deploy-report.mjs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const envFile = path.join(repoRoot, ".env");
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}
const baseRoot = path.join(repoRoot, "platform", "base");
const idRoot = path.join(repoRoot, "platform", "id");
const appsRoot = path.join(repoRoot, "apps");
const stateDirectory = path.join(repoRoot, ".nomos-dev");
const statePath = path.join(stateDirectory, "servers.json");
const ngrokConfigPath = path.join(repoRoot, "platform", "infra", "ngrok.json");
// Bind all local interfaces so localhost works from a host browser when the CLI
// is running inside WSL, a container, or another local VM.
const hostname = "0.0.0.0";
const firstPort = 3000;

function manifestPort(app) {
  try {
    const manifest = JSON.parse(readFileSync(path.join(app.directory, "app.manifest.json"), "utf8"));
    const match = typeof manifest.href === "string" && manifest.href.match(/^http:\/\/localhost:(\d+)$/);
    if (match) return Number(match[1]);
  } catch {}
  return null;
}

async function findRunnableApps(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const apps = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      apps.push(...await findRunnableApps(entryPath));
      continue;
    }
    if (entry.name !== "package.json") continue;
    const packageJson = JSON.parse(await readFile(entryPath, "utf8"));
    if (packageJson.private !== true || typeof packageJson.scripts?.dev !== "string") continue;
    apps.push({
      name: packageJson.name ?? path.basename(path.dirname(entryPath)),
      directory: path.dirname(entryPath)
    });
  }
  return apps;
}

function printHelp() {
  console.log("Usage: nomos setup | nomos dev [-d <app>] | nomos stop | nomos deploy | nomos create-app <slug> [Display Name]");
  console.log("Starts Home, ID, Base, and every runnable app under apps/.");
  console.log("Home runs on 3000, ID on 3001, Base on 3002, and products from 3003.");
  console.log("Deploy builds every production app, validates static navigation, then deploys Hosting and Functions.");
  console.log("Pass -d <app> after dev to expose any local app through ngrok.");
  console.log("create-app scaffolds a complete authenticated product app, Hosting target, and custom domain mapping.");
}

function createAppCommand(args) {
  execFileSync(process.execPath, [path.join(repoRoot, ".agents", "skills", "new-app", "scripts", "create-app.mjs"), ...args], { cwd: repoRoot, stdio: "inherit" });
}

function parseDevArgs(args) {
  let ngrokApp = null;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "-d") {
      ngrokApp = args[++index];
      if (!ngrokApp) throw new Error("Dev option -d requires an app name, for example: nomos dev -d fitness");
      continue;
    }
    if (argument === "--domain") {
      ngrokApp = args[++index];
      if (!ngrokApp) throw new Error("Dev option --domain requires an app name, for example: nomos dev --domain fitness");
      continue;
    }
    throw new Error(`Unknown dev option: ${argument}`);
  }
  return ngrokApp;
}

async function loadNgrokConfig() {
  let config;
  try {
    config = JSON.parse(await readFile(ngrokConfigPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw new Error(`Could not read ngrok configuration (${error instanceof Error ? error.message : error})`);
  }
  return config ?? {};
}

async function waitForPort(port, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await portIsBusy(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Local app did not start listening on port ${port}`);
}

async function startNgrokTunnel(appName, serverRows) {
  const normalizedName = appName.toLowerCase().replace(/^@nomos\//, "");
  const target = serverRows.find(({ app }) => {
    const packageName = app.name.toLowerCase().replace(/^@nomos\//, "");
    return packageName === normalizedName || path.basename(app.directory).toLowerCase() === normalizedName;
  });
  if (!target) {
    const available = serverRows.map(({ app }) => app.name.replace(/^@nomos\//, "")).join(", ");
    throw new Error(`No runnable app found for '${appName}'. Available apps: ${available}`);
  }

  const config = await loadNgrokConfig();
  const configured = config[normalizedName] ?? Object.values(config).find((entry) => typeof entry?.domain === "string");
  let domain = null;
  if (configured) {
    if (typeof configured.domain !== "string") throw new Error(`Invalid ngrok domain for '${appName}'`);
    domain = configured.domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!domain || domain.includes("/")) throw new Error(`Invalid ngrok domain for '${appName}'`);
  }

  const userNgrok = path.join(homedir(), ".local", "bin", "ngrok");
  const ngrokCommand = process.env.NGROK_BIN
    ?? (existsSync(userNgrok) ? userNgrok : process.platform === "win32" ? "ngrok.exe" : "ngrok");
  try { execFileSync(ngrokCommand, ["version"], { stdio: "ignore" }); } catch { throw new Error("ngrok CLI is not installed or is not on PATH"); }

  await waitForPort(target.port);
  console.log(domain
    ? `Exposing ${normalizedName} at https://${domain} (reserved domain ${configured.domainId ?? "configured"})`
    : `Exposing ${normalizedName} through ngrok; the public URL will appear below.`);
  const ngrokArgs = ["http", String(target.port)];
  if (domain) ngrokArgs.push("--url", `https://${domain}`);
  ngrokArgs.push("--log", "stdout");
  const tunnel = spawn(ngrokCommand, ngrokArgs, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });

  await new Promise((resolve, reject) => {
    let settled = false;
    const stop = () => {
      if (!tunnel.killed) tunnel.kill("SIGTERM");
    };
    const finish = (error) => {
      if (settled) return;
      settled = true;
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
      if (error) reject(error); else resolve();
    };
    tunnel.once("error", (error) => finish(new Error(`Could not start ngrok: ${error.message}`)));
    tunnel.once("exit", (code, signal) => finish(signal ? new Error(`ngrok stopped with ${signal}`) : code ? new Error(`ngrok exited with code ${code}`) : null));
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
}

async function deployCommand() {
  let reporter;
  try { reporter = await deploymentReporter(); }
  catch (error) { console.error(`[deploy] ${error.message}; deployment will continue without ticket updates.`); }
  let diagnostic = "";
  async function run(command, args, env) {
    await new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd: repoRoot, env, stdio: ["inherit", "pipe", "pipe"] });
      child.stdout.on("data", chunk => { process.stdout.write(chunk); diagnostic = (diagnostic + chunk.toString()).slice(-24000); });
      child.stderr.on("data", chunk => { process.stderr.write(chunk); diagnostic = (diagnostic + chunk.toString()).slice(-24000); });
      child.once("error", reject);
      child.once("close", (code, signal) => code === 0 ? resolve() : reject(new Error(`Deployment step ${command} failed (${signal || code}).`)));
    });
  }
  let failure;
  try {
  const node = process.execPath;
  const packageManager = process.env.npm_execpath
    ? { command: process.execPath, prefix: [process.env.npm_execpath] }
    : process.platform === "win32"
      ? { command: "corepack.cmd", prefix: ["pnpm"] }
      : { command: "corepack", prefix: ["pnpm"] };
  await run(node, [path.join(repoRoot, "scripts", "build-hosting.mjs")], { ...process.env, NOMOS_PACKAGE_MANAGER: JSON.stringify(packageManager), NEXT_PUBLIC_NOMOS_ENV: "production" });
  const firebaseCommand = process.platform === "win32" ? "npx.cmd" : "npx";
  const firebaseConfig = JSON.parse(readFileSync(path.join(repoRoot, "firebase.json"), "utf8"));
  const hostingTargets = (firebaseConfig.hosting ?? []).map((site) => site.target).filter((target) => target && target !== "default");
  await run(firebaseCommand, ["--yes", "firebase-tools", "deploy", "--only", [...hostingTargets.map((target) => `hosting:${target}`), "functions"].join(",")], { ...process.env, NEXT_PUBLIC_NOMOS_ENV: "production" });
  } catch (error) { failure = error; }
  if (reporter?.enabled) {
    try { await reporter.finish(await deploymentMessage(failure, diagnostic, repoRoot)); }
    catch (error) { console.error(`[deploy] Deployment ${failure ? "failed" : "succeeded"}, but ticket notification failed: ${error.message}`); }
  }
  if (failure) throw failure;
}

function portIsBusy(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
  });
}

function stopGroup(pid) {
  try { process.kill(-pid, "SIGTERM"); return true; } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

function isNomosPath(value) {
  return value === repoRoot || value.startsWith(`${repoRoot}/`);
}

function processGroupFor(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    // The comm field is wrapped in parentheses and may itself contain spaces.
    return Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[2]);
  } catch {
    return null;
  }
}

function nomosProcessGroupsOnPorts() {
  const groups = new Set();
  for (const entry of readdirSync("/proc", { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
    try {
      const pid = Number(entry.name);
      const command = readFileSync(`/proc/${pid}/cmdline`, "utf8").replaceAll("\0", " ");
      const workingDirectory = readlinkSync(`/proc/${pid}/cwd`);
      if (!command.includes("next dev") || (!isNomosPath(workingDirectory) && !command.split(" ").some(isNomosPath))) continue;
      const port = Number(command.match(/--port\s+(\d+)/)?.[1]);
      if (!Number.isInteger(port) || port < firstPort || port >= firstPort + 32) continue;
      const group = processGroupFor(pid);
      if (group) groups.add(group);
    } catch {}
  }
  return groups;
}

function nomosListenerGroupsOnPorts() {
  const groups = new Set();
  try {
    const listeners = execFileSync("ss", ["-ltnpH"], { encoding: "utf8" });
    for (const line of listeners.split("\n")) {
      const port = Number(line.match(/\s(?:\*|[\d.]+):([0-9]+)\s/)?.[1]);
      if (!Number.isInteger(port) || port < firstPort || port >= firstPort + 32) continue;
      for (const pidText of line.matchAll(/pid=(\d+)/g)) {
        const pid = Number(pidText[1]);
        const command = readFileSync(`/proc/${pid}/cmdline`, "utf8").replaceAll("\0", " ");
        const processName = readFileSync(`/proc/${pid}/comm`, "utf8").trim();
        const workingDirectory = readlinkSync(`/proc/${pid}/cwd`);
        if (!(`${command} ${processName}`).includes("next") || !isNomosPath(workingDirectory)) continue;
        const group = processGroupFor(pid);
        if (group) groups.add(group);
      }
    }
  } catch {}
  return groups;
}

async function stopCommand() {
  const pids = new Set();
  try {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    for (const server of state.servers ?? []) {
      if (!Number.isInteger(server.pid)) continue;
      // A stale PID must never be able to terminate an unrelated process.
      const command = readFileSync(`/proc/${server.pid}/cmdline`, "utf8").replaceAll("\0", " ");
      if (command.includes("next dev") && command.includes(repoRoot)) pids.add(server.pid);
    }
  } catch (error) {
    // The launcher removes state after Ctrl+C, and an interrupted write can
    // leave a partial JSON file. In either case, scan the running processes.
    if (error?.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
  }
  for (const group of nomosProcessGroupsOnPorts()) pids.add(group);
  for (const group of nomosListenerGroupsOnPorts()) pids.add(group);
  if (pids.size === 0) { console.log("No Nomos development servers found."); return; }
  for (const pid of pids) stopGroup(pid);
  await import("node:fs/promises").then(({ rm }) => rm(statePath, { force: true }));
  console.log(`Stopped ${pids.size} Nomos development process group${pids.size === 1 ? "" : "s"}.`);
}

const command = process.argv[2];
if (command === "create-app") {
  try { createAppCommand(process.argv.slice(3)); }
  catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(1); }
  process.exit(0);
}
if (command === "setup") {
  try {
    if (process.argv.length > 3) throw new Error("Usage: nomos setup");
    await import("./setup.mjs").then(({ setup }) => setup(repoRoot));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
  process.exit(0);
}
if (command === "stop") {
  await stopCommand();
  process.exit(0);
}
if (command === "deploy") {
  try {
    if (process.argv.length > 3) throw new Error("ngrok is a development option; use `nomos dev -d <app>`");
    await deployCommand();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
  process.exit(0);
}
if (command !== "dev") {
  printHelp();
  process.exit(command ? 1 : 0);
}

let ngrokApp = null;
try {
  ngrokApp = parseDevArgs(process.argv.slice(3));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const apps = [
  ...(await findRunnableApps(idRoot)),
  ...(await findRunnableApps(baseRoot)),
  ...(await findRunnableApps(appsRoot))
].sort((left, right) => {
  if (left.name === "@nomos/home") return -1;
  if (right.name === "@nomos/home") return 1;
  if (left.directory === idRoot) return -1;
  if (right.directory === idRoot) return 1;
  if (left.directory === baseRoot) return -1;
  if (right.directory === baseRoot) return 1;
  return left.name.localeCompare(right.name);
});
if (apps.length === 0) {
  console.error("No runnable apps found.");
  process.exit(1);
}

const missingDependencies = apps.filter((app) => !existsSync(path.join(app.directory, "node_modules", ".bin", "next")));
if (missingDependencies.length > 0) {
  console.error(`Missing Next.js dependencies for: ${missingDependencies.map((app) => app.name).join(", ")}`);
  console.error("Run nomos setup, then retry nomos dev.");
  process.exit(1);
}

const children = [];
const serverRows = apps.map((app, index) => {
  const port = manifestPort(app) ?? firstPort + index;
  const label = app.directory === idRoot
    ? "ID"
    : app.directory === baseRoot
    ? "Base"
    : app.name.replace(/^@nomos\//, "").replace(/(^|-)([a-z])/g, (_, separator, letter) => `${separator}${letter.toUpperCase()}`);
  return { app, label, port, status: "starting", url: `http://localhost:${port}` };
});

const exposedSlug = ngrokApp?.toLowerCase().replace(/^@nomos\//, "") ?? null;
const ngrokConfig = ngrokApp ? await loadNgrokConfig() : {};
const exposedEntry = exposedSlug ? ngrokConfig[exposedSlug] ?? Object.values(ngrokConfig).find((entry) => typeof entry?.domain === "string") : null;
const exposedDomain = typeof exposedEntry?.domain === "string"
  ? exposedEntry.domain.replace(/^https?:\/\//, "").replace(/\/$/, "")
  : null;
const exposedUrl = exposedDomain ? `https://${exposedDomain}` : null;
if (ngrokApp && !exposedUrl) {
  console.error(`A configured reserved domain is required for authenticated ngrok previews. Add '${exposedSlug}' to platform/infra/ngrok.json.`);
  process.exit(1);
}
const previewEnv = exposedSlug && exposedUrl ? {
  NEXT_PUBLIC_NOMOS_ENV: "development",
  [`NEXT_PUBLIC_NOMOS_${exposedSlug.toUpperCase()}_URL`]: exposedUrl,
  NEXT_PUBLIC_NOMOS_DEV_PUBLIC_URL: exposedUrl,
  NEXT_PUBLIC_NOMOS_PREVIEW_ORIGIN: exposedUrl,
  NEXT_PUBLIC_NOMOS_ID_URL: "https://id.nomos.codes",
  NOMOS_PREVIEW_SESSION_SECRET: randomBytes(32).toString("base64url"),
} : {};

const occupied = (await Promise.all(serverRows.map(async (row) => ({ row, busy: await portIsBusy(row.port) })))).filter((entry) => entry.busy);
if (occupied.length > 0) {
  console.error("Nomos cannot start because these ports are already in use:");
  for (const { row } of occupied) console.error(`  ${row.port} (${row.label})`);
  console.error("Run `nomos stop`, then retry `nomos dev`.");
  process.exit(1);
}

const supportsAnsi = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
const green = (value) => supportsAnsi ? `\x1b[32m${value}\x1b[0m` : value;
const yellow = (value) => supportsAnsi ? `\x1b[33m${value}\x1b[0m` : value;
const red = (value) => supportsAnsi ? `\x1b[31m${value}\x1b[0m` : value;
const rowText = (row) => {
  const symbol = row.status === "ready" ? green("●") : row.status === "failed" ? red("●") : yellow("○");
  return `  ${symbol} ${row.label.padEnd(10)} ${row.url}`;
};
const renderRows = (refresh = false) => {
  if (refresh && supportsAnsi) process.stdout.write(`\x1b[${serverRows.length}A`);
  for (const row of serverRows) process.stdout.write(`\x1b[2K\r${rowText(row)}\n`);
};

console.log("\nNomos dev");
console.log("Press Ctrl+C to stop\n");
renderRows();

for (const row of serverRows) {
  const { app, port } = row;
  const slug = app.name.replace(/^@nomos\//, "");
  const appEnv = slug === exposedSlug ? previewEnv : { NEXT_PUBLIC_NOMOS_ENV: "development" };
  const nextBinary = path.join(app.directory, "node_modules", ".bin", "next");
  const child = spawn(nextBinary, ["dev", "--hostname", hostname, "--port", String(port)], {
    cwd: app.directory,
    env: { ...process.env, ...appEnv, NOMOS_ROOT: repoRoot, NOMOS_APP_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true
  });
  child.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("Ready in")) {
      row.status = "ready";
      renderRows(true);
    }
  });
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  child.once("error", () => {
    row.status = "failed";
    renderRows(true);
  });
  child.once("exit", (code) => {
    if (code && row.status !== "ready") {
      row.status = "failed";
      renderRows(true);
    }
  });
  children.push(child);
}

await import("node:fs/promises").then(async ({ mkdir, writeFile }) => {
  await mkdir(stateDirectory, { recursive: true });
  await writeFile(statePath, JSON.stringify({ servers: children.map((child, index) => ({ pid: child.pid, app: serverRows[index].app.name, port: serverRows[index].port })) }, null, 2) + "\n");
});

function shutdown(signal) {
  for (const child of children) {
    try { process.kill(-child.pid, signal); } catch {}
  }
  void import("node:fs/promises").then(({ rm }) => rm(statePath, { force: true }));
}
// The launcher receives Ctrl+C as SIGINT, but detached Next processes need a
// graceful SIGTERM so webpack can finish its cache write before exiting.
process.once("SIGINT", () => shutdown("SIGTERM"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
if (ngrokApp) {
  try {
    await startNgrokTunnel(ngrokApp, serverRows);
  } catch (error) {
    shutdown("SIGTERM");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
await Promise.all(children.map((child) => new Promise((resolve) => child.once("exit", resolve))));
