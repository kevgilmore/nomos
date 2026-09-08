import { mkdir, readFile, writeFile, lstat, chmod } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const shellQuote = (value) => "'" + value.replaceAll("'", "'\\''") + "'";
if (!["linux", "darwin"].includes(process.platform)) throw new Error("Install inside Ubuntu/WSL or macOS.");
if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Run: bash scripts/install.sh");
const bin = path.join(os.homedir(), ".local/bin");
const launcher = path.join(bin, "nomos");
const marker = "# Managed by Nomos setup";
try {
  const stat = await lstat(launcher);
  if (!stat.isFile() || !(await readFile(launcher, "utf8")).includes(marker)) throw new Error(launcher + " already exists and is not managed by Nomos. Move it before retrying.");
} catch (error) { if (error.code !== "ENOENT") throw error; }
await mkdir(bin, { recursive: true });
await writeFile(launcher, "#!/bin/sh\n" + marker + "\nexport PATH=" + shellQuote(path.dirname(process.execPath)) + ':"$PATH"\nexec ' + shellQuote(process.execPath) + " " + shellQuote(path.join(repoRoot, "cli/cli.mjs")) + ' "$@"\n', { mode: 0o755 });
await chmod(launcher, 0o755);
const pathLine = 'export PATH="$HOME/.local/bin:$PATH"';
let bashProfile = ".profile";
for (const candidate of [".bash_profile", ".bash_login"]) {
  try { await lstat(path.join(os.homedir(), candidate)); bashProfile = candidate; break; }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
for (const profile of new Set([path.join(os.homedir(), bashProfile), path.join(os.homedir(), ".bashrc"), path.join(process.env.ZDOTDIR || os.homedir(), ".zshrc")])) {
  let content = "";
  try { content = await readFile(profile, "utf8"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (!content.includes(pathLine)) await writeFile(profile, content + "\n" + marker + "\n" + pathLine + "\n");
}
console.log("Nomos CLI installed. Run nomos setup, then nomos dev.");
if (!(process.env.PATH ?? "").split(":").includes(bin)) console.log("Open a new terminal first so nomos is on PATH.");
