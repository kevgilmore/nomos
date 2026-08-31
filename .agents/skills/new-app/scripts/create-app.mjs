import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { syncAppRegistry } from "./sync-app-registry.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const appsDirectory = path.join(repoRoot, "apps");
const slug = (process.argv[2] || "").trim().toLowerCase();
const name = process.argv.slice(3).join(" ").trim() || slug.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");

if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error("Usage: pnpm create:app <slug> [Display Name]");
  process.exit(1);
}

const destination = path.join(appsDirectory, slug);
if (existsSync(destination)) {
  console.error(`apps/${slug} already exists; nothing was changed.`);
  process.exit(1);
}

const entries = await readdir(appsDirectory, { withFileTypes: true });
const manifests = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
  try { return JSON.parse(await readFile(path.join(appsDirectory, entry.name, "app.manifest.json"), "utf8")); }
  catch { return null; }
}));
const usedPorts = manifests.map((manifest) => manifest?.href?.match(/^http:\/\/localhost:(\d+)$/)?.[1]).filter(Boolean).map(Number);
const devPort = Math.max(3000, ...usedPorts) + 1;

const files = {
  "package.json": JSON.stringify({ name: `@nomos/${slug}`, version: "0.1.0", private: true, scripts: { predev: "node ../../.agents/skills/new-app/scripts/sync-app-registry.mjs", dev: "next dev", prebuild: "node ../../.agents/skills/new-app/scripts/sync-app-registry.mjs", build: "next build", start: "next start", typecheck: "tsc --noEmit" }, dependencies: { "@nomos/api": "workspace:*", "@nomos/auth": "workspace:*", "@nomos/data": "workspace:*", "@nomos/ui": "workspace:*", next: "^15.1.3", react: "^19.0.0", "react-dom": "^19.0.0" }, devDependencies: { "@tailwindcss/postcss": "^4.0.0", "@types/node": "^22.10.2", "@types/react": "^19.0.3", "@types/react-dom": "^19.0.2", tailwindcss: "^4.0.0", typescript: "^5.7.2" } }, null, 2) + "\n",
  "app/layout.tsx": `import type { Metadata } from "next";\nimport "./globals.css";\n\nexport const metadata: Metadata = { title: ${JSON.stringify(name)} };\n\nexport default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }\n`,
  "app/page.tsx": `export default function HomePage() { return <main><h1>${name}</h1><p>Built on the Nomos platform.</p></main>; }\n`,
  "app/globals.css": `@import "tailwindcss";\n@source "../../platform/ui/src";\n`,
  "next.config.ts": `import type { NextConfig } from "next";\nconst nextConfig: NextConfig = { transpilePackages: ["@nomos/api", "@nomos/auth", "@nomos/data", "@nomos/ui"] };\nexport default nextConfig;\n`,
  "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2017", lib: ["dom", "dom.iterable", "esnext"], strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "preserve", plugins: [{ name: "next" }], paths: { "@/*": ["./*"] } }, include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"] }, null, 2) + "\n",
  "next-env.d.ts": `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// NOTE: This file should not be edited\n`,
  "postcss.config.mjs": `const config = { plugins: { "@tailwindcss/postcss": {} } };\nexport default config;\n`,
  "lib/app-config.ts": `export const appConfig = { slug: ${JSON.stringify(slug)}, name: ${JSON.stringify(name)} } as const;\n`,
  "app.manifest.json": JSON.stringify({ slug, name, href: `http://localhost:${devPort}`, icon: "app", discoverable: true }, null, 2) + "\n"
};

for (const [relativePath, content] of Object.entries(files)) {
  const filePath = path.join(destination, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

await syncAppRegistry();
console.log(`Created apps/${slug} as @nomos/${slug} at http://localhost:${devPort}.`);
