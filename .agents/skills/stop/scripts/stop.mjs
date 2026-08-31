import { readFile, readdir, rm } from "node:fs/promises";
import { readFileSync, readlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const statePath = path.join(repoRoot, ".nomos-dev", "servers.json");
const firstPort = 3000;

function isNomosPath(value) {
  return value === repoRoot || value.startsWith(`${repoRoot}/`);
}

function processGroupFor(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    return Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[2]);
  } catch {
    return null;
  }
}

async function runningNomosGroups() {
  const groups = new Set();
  for (const entry of await readdir("/proc", { withFileTypes: true })) {
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

function listeningNomosGroups() {
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

let state;
try {
  state = JSON.parse(await readFile(statePath, "utf8"));
} catch (error) {
  if (error?.code === "ENOENT") {
    state = {};
  } else if (error instanceof SyntaxError) {
    state = {};
  } else {
    throw error;
  }
}

const servers = Array.isArray(state?.servers) ? state.servers : [];
const groups = new Set();
for (const server of servers) {
  if (!Number.isInteger(server.pid)) continue;
  try {
    const command = readFileSync(`/proc/${server.pid}/cmdline`, "utf8").replaceAll("\0", " ");
    if (command.includes("next dev") && command.includes(repoRoot)) groups.add(processGroupFor(server.pid) ?? server.pid);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

for (const group of await runningNomosGroups()) groups.add(group);
for (const group of listeningNomosGroups()) groups.add(group);
if (groups.size === 0) {
  await rm(statePath, { force: true });
  console.log("[stop] No Nomos development servers found.");
  process.exit(0);
}
for (const group of groups) {
  try { process.kill(-group, "SIGTERM"); } catch (error) { if (error?.code !== "ESRCH") throw error; }
}

await rm(statePath, { force: true });
console.log(`[stop] Stopped ${groups.size} Nomos development process group${groups.size === 1 ? "" : "s"}.`);
