import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";


export async function setup(repoRoot) {
  if (!["linux", "darwin"].includes(process.platform)) throw new Error("Run setup inside Ubuntu/WSL or macOS.");
  if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Node.js 22+ required. Run: bash scripts/install.sh");
  const { packageManager } = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
  if (!/^pnpm@\d+\.\d+\.\d+$/.test(packageManager)) throw new Error("Expected an exact pnpm version in package.json");
  const env = { ...process.env, PATH: path.dirname(process.execPath) + ":" + (process.env.PATH ?? "") };
  console.log("Installing workspace dependencies using " + packageManager);
  execFileSync("npm", ["exec", "--yes", "--package=" + packageManager, "--", "pnpm", "install", "--frozen-lockfile"], { cwd: repoRoot, env, stdio: "inherit" });
  execFileSync(process.execPath, [path.join(repoRoot, ".agents/skills/new-app/scripts/sync-app-registry.mjs")], { cwd: repoRoot, env, stdio: "inherit" });
  try {
    await writeFile(path.join(repoRoot, ".env"), "# Optional integration credentials (never commit real keys).\n# OPENAI_API_KEY=\n# HEVY_API_TOKEN=\n", { flag: "wx", mode: 0o600 });
  } catch (error) { if (error.code !== "EEXIST") throw error; }
  console.log("Setup complete. Run nomos dev.");
}
