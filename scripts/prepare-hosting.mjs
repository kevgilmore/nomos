import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const target = path.join(root, "platform", "functions", "site");
const fitnessExport = path.join(root, "apps", "fitness", ".next-production");
const fitnessHostingDirectory = path.join(root, "apps", "fitness", "out");
const staticApps = (await readdir(path.join(root, "apps"), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory() && !["home", "fitness"].includes(entry.name))
  .map((entry) => entry.name);

// Fitness uses a separate distDir so local dev and production builds cannot
// overwrite each other. Next writes the static export into that distDir;
// Firebase, however, deploys apps/fitness/out. Synchronize the exact build
// before either Hosting or the authenticated Function copy is prepared.
await rm(fitnessHostingDirectory, { recursive: true, force: true });
await cp(fitnessExport, fitnessHostingDirectory, { recursive: true });
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(path.join(root, "apps", "home", "out"), path.join(target, "home"), { recursive: true });
await cp(path.join(root, "apps", "fitness", "out"), path.join(target, "fitness"), { recursive: true });
for (const app of staticApps) {
  const exportDirectory = path.join(root, "apps", app, ".next-production");
  const hostingDirectory = path.join(root, "apps", app, "out");
  await rm(hostingDirectory, { recursive: true, force: true });
  await cp(exportDirectory, hostingDirectory, { recursive: true });
  await cp(hostingDirectory, path.join(target, app), { recursive: true });
}
await cp(path.join(root, "platform", "id", "out"), path.join(target, "id"), { recursive: true });
console.log("Prepared authenticated Hosting assets in platform/functions/site.");
