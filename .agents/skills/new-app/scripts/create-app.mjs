import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { syncAppRegistry } from "./sync-app-registry.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const appsDirectory = path.join(repoRoot, "apps");
const slug = (process.argv[2] || "").trim().toLowerCase();

if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error("Usage: nomos create-app <slug> [Display Name]");
  process.exit(1);
}

const name = process.argv.slice(3).join(" ").trim() || slug.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");

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
  "package.json": JSON.stringify({ name: `@nomos/${slug}`, version: "0.1.0", private: true, scripts: { predev: "node ../../.agents/skills/new-app/scripts/sync-app-registry.mjs", dev: "next dev", prebuild: "node ../../.agents/skills/new-app/scripts/sync-app-registry.mjs", build: "node ../../platform/build-static-app.mjs", start: "next start", typecheck: "tsc --noEmit" }, dependencies: { "@nomos/ai": "workspace:*", "@nomos/api": "workspace:*", "@nomos/auth": "workspace:*", "@nomos/data": "workspace:*", "@nomos/ui": "workspace:*", next: "^15.1.3", react: "^19.0.0", "react-dom": "^19.0.0" }, devDependencies: { "@tailwindcss/postcss": "^4.0.0", "@types/node": "^22.10.2", "@types/react": "^19.0.3", "@types/react-dom": "^19.0.2", tailwindcss: "^4.0.0", typescript: "^5.7.2" } }, null, 2) + "\n",
  "app/layout.tsx": `import type { Metadata } from "next";\nimport { Figtree } from "next/font/google";\nimport { NomosProductShell } from "@nomos/ui";\nimport "./globals.css";\n\nexport const metadata: Metadata = { title: ${JSON.stringify(name)}, description: ${JSON.stringify(`${name} · Nomos`)}, icons: { icon: "/nomos-mark.png", apple: "/nomos-mark.png" } };\nexport { nomosViewport as viewport } from "@nomos/ui/viewport";\n\nconst figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });\n\nexport default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className={figtree.variable + " dark"} suppressHydrationWarning><body style={{ fontFamily: "Figtree, sans-serif" }}><NomosProductShell title=${JSON.stringify(name)} assistantPage=${JSON.stringify(name)} appSlug=${JSON.stringify(slug)}>{children}</NomosProductShell></body></html>; }\n`,
  "app/page.tsx": `import { Card, CardContent, CardHeader, CardTitle } from "@nomos/ui";\n\nexport default function HomePage() { return <main className="mx-auto max-w-6xl space-y-6"><header><p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--ring)]">${name.toUpperCase()}</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.05em] sm:text-6xl">${name}</h1><p className="mt-4 max-w-xl text-[var(--muted-foreground)]">A new Nomos workspace, ready for your product.</p></header><Card><CardHeader><CardTitle>Getting started</CardTitle></CardHeader><CardContent><p className="text-sm text-[var(--muted-foreground)]">Your ${name} app is connected to the shared Nomos platform.</p></CardContent></Card></main>; }\n`,
  "app/api/ai/[...path]/route.ts": `import { LOCAL_DEV_USER, getLocalSessionCookie } from "@nomos/auth";\nimport { handleLocalAiRequest } from "@nomos/ai/local";\nimport { NextRequest, NextResponse } from "next/server";\n\nasync function handle(request: NextRequest) {\n  if (!request.cookies.get(getLocalSessionCookie(${JSON.stringify(slug)}))?.value) return NextResponse.json({ error: "Authentication required" }, { status: 401 });\n  const body = request.method === "GET" || request.method === "DELETE" ? undefined : await request.json().catch(() => undefined);\n  const result = await handleLocalAiRequest({ method: request.method, path: request.nextUrl.pathname.replace(/^\\/api\\/ai/, "") || "/", userId: LOCAL_DEV_USER.id, appId: request.nextUrl.searchParams.get("appId") || (typeof body?.appId === "string" ? body.appId : undefined), body });\n  return result.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(result.body, { status: result.status });\n}\n\nexport const GET = handle;\nexport const POST = handle;\nexport const DELETE = handle;\n`,
  "app/globals.css": `@import "tailwindcss";\n@import "@nomos/ui/document.css";\n@source "../../../platform/ui/src";\n@custom-variant dark (&:is(.dark *));\n:root { color-scheme: light; --background:#f7f6fa; --foreground:#19171f; --card:#fff; --card-foreground:#19171f; --popover:#fff; --popover-foreground:#19171f; --muted:#efedf3; --muted-foreground:#6d6878; --border:#e1dee7; --input:#e1dee7; --primary:#33254f; --primary-foreground:#fff; --accent:#ebe5f7; --accent-foreground:#302047; --ring:#7655a6; --radius:.875rem; }\n.dark { color-scheme: dark; --background:#111014; --foreground:#f4f1f8; --card:#19171f; --card-foreground:#f4f1f8; --popover:#19171f; --popover-foreground:#f4f1f8; --muted:#24212b; --muted-foreground:#aaa3b5; --border:#302c39; --input:#383241; --primary:#7655a6; --primary-foreground:#fff; --accent:#292333; --accent-foreground:#f0eaf8; --ring:#a78bda; --radius:.875rem; }\n* { box-sizing:border-box; border-color:var(--border); } body { margin:0; color:var(--foreground); font-family:var(--font-figtree),Arial,Helvetica,sans-serif; } button:not(:disabled), [role="button"]:not([aria-disabled="true"]) { cursor:pointer; } button:disabled, [role="button"][aria-disabled="true"] { cursor:not-allowed; } :focus-visible { outline:3px solid color-mix(in srgb,var(--ring) 55%,transparent); outline-offset:2px; }\n`,
  "middleware.ts": `import { NextRequest, NextResponse } from "next/server";\nimport { buildLocalSignInUrlForRequest, getLocalSessionCookie } from "@nomos/auth";\nexport function middleware(request: NextRequest) { if (request.cookies.has(getLocalSessionCookie(${JSON.stringify(slug)})) || request.cookies.has("nomos_local_session")) return NextResponse.next(); return NextResponse.redirect(buildLocalSignInUrlForRequest(request.nextUrl.pathname, request.nextUrl.search, Number(process.env.NOMOS_APP_PORT) || ${devPort})); }\nexport const config = { matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"] };\n`,
  "next.config.ts": `import type { NextConfig } from "next";\nconst production = process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_NOMOS_ENV !== "development";\nconst nextConfig: NextConfig = { ...(production ? { output: "export" as const, distDir: ".next-production" } : { distDir: ".next-dev" }), trailingSlash: true, transpilePackages: ["@nomos/ai", "@nomos/api", "@nomos/auth", "@nomos/data", "@nomos/ui"] };\nexport default nextConfig;\n`,
  "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2017", skipLibCheck: true, lib: ["dom", "dom.iterable", "esnext"], strict: true, noEmit: true, esModuleInterop: true, module: "esnext", moduleResolution: "bundler", resolveJsonModule: true, isolatedModules: true, jsx: "preserve", plugins: [{ name: "next" }], paths: { "@/*": ["./*"] } }, include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"], exclude: ["node_modules"] }, null, 2) + "\n",
  "next-env.d.ts": `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// NOTE: This file should not be edited\n`,
  "postcss.config.mjs": `const config = { plugins: { "@tailwindcss/postcss": {} } };\nexport default config;\n`,
  "lib/app-config.ts": `export const appConfig = { slug: ${JSON.stringify(slug)}, name: ${JSON.stringify(name)} } as const;\n`,
  "app.manifest.json": JSON.stringify({ slug, name, href: `http://localhost:${devPort}`, productionHref: `https://${slug}.nomos.codes`, icon: "app", discoverable: true }, null, 2) + "\n"
};

for (const [relativePath, content] of Object.entries(files)) {
  const filePath = path.join(destination, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}

await syncAppRegistry();
await mkdir(path.join(destination, "public"), { recursive: true });
for (const asset of ["nomos-mark.png", "pp.png", "openai.png", "claude.png"]) {
  const source = asset === "openai.png" || asset === "claude.png" ? path.join(repoRoot, "apps", "fitness", "public", asset) : path.join(repoRoot, "apps", "home", "public", asset);
  await copyFile(source, path.join(destination, "public", asset));
}

const firebaseCommand = process.platform === "win32" ? "firebase.cmd" : "firebase";
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const nodeCommand = process.execPath;
try {
  execFileSync(firebaseCommand, ["hosting:sites:create", `nomos-${slug}`, "--project", "nomos-2aafe"], { cwd: repoRoot, encoding: "utf8" });
} catch (error) {
  const output = `${error?.stdout ?? ""}\n${error?.stderr ?? ""}`;
  if (!/already exists|already been created/i.test(output)) {
    throw new Error(`Could not create Firebase Hosting site nomos-${slug}.`, { cause: error });
  }
  console.log(`Firebase Hosting site nomos-${slug} already exists.`);
}
execFileSync(firebaseCommand, ["target:apply", "hosting", slug, `nomos-${slug}`], { cwd: repoRoot, stdio: "ignore" });
const firebasercPath = path.join(repoRoot, ".firebaserc");
const firebaserc = JSON.parse(await readFile(firebasercPath, "utf8"));
const project = firebaserc.projects.default;
firebaserc.targets ??= {};
firebaserc.targets[project] ??= {};
firebaserc.targets[project].hosting ??= {};
firebaserc.targets[project].hosting[slug] = [`nomos-${slug}`];
await writeFile(firebasercPath, JSON.stringify(firebaserc, null, 2) + "\n");
const firebasePath = path.join(repoRoot, "firebase.json");
const firebaseConfig = JSON.parse(await readFile(firebasePath, "utf8"));
firebaseConfig.hosting ??= [];
if (!firebaseConfig.hosting.some((site) => site.target === slug)) firebaseConfig.hosting.push({ target: slug, public: `apps/${slug}/out`, cleanUrls: false, trailingSlash: true, ignore: ["firebase.json", "**/.*", "**/node_modules/**"], rewrites: [{ source: "/api/ai/**", function: { functionId: "aiApi", region: "europe-west2" } }, { source: "/api/auth/**", function: { functionId: "authApi", region: "europe-west2" } }] });
await writeFile(firebasePath, JSON.stringify(firebaseConfig, null, 2) + "\n");
execFileSync(pnpmCommand, ["install"], { cwd: repoRoot, stdio: "inherit" });
const productionEnvironment = { ...process.env, NEXT_PUBLIC_NOMOS_ENV: "production" };
execFileSync(pnpmCommand, ["--filter", `@nomos/${slug}`, "typecheck"], { cwd: repoRoot, stdio: "inherit" });
execFileSync(pnpmCommand, ["--filter", `@nomos/${slug}`, "build"], { cwd: repoRoot, env: productionEnvironment, stdio: "inherit" });
const outputDirectory = path.join(destination, ".next-production");
const entryHtml = await readFile(path.join(outputDirectory, "index.html"), "utf8").catch(() => "");
if (!entryHtml.includes("/_next/static/chunks/") || !entryHtml.includes("/_next/static/css/")) {
  throw new Error(`Production build verification failed for apps/${slug}: generated HTML is missing Next.js JS or CSS assets.`);
}
execFileSync(nodeCommand, [path.join(repoRoot, "cli", "cli.mjs"), "deploy"], { cwd: repoRoot, env: productionEnvironment, stdio: "inherit" });
try {
  const tokenPath = path.join(process.env.HOME ?? "", ".config", "configstore", "firebase-tools.json");
  const tokenConfig = JSON.parse(await readFile(tokenPath, "utf8"));
  const response = await fetch(`https://firebasehosting.googleapis.com/v1beta1/projects/${project}/sites/nomos-${slug}/domains`, { method: "POST", headers: { Authorization: `Bearer ${tokenConfig.tokens.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ site: `nomos-${slug}`, domainName: `${slug}.nomos.codes` }) });
  if (!response.ok && response.status !== 409) throw new Error(await response.text());
  console.log(response.status === 409 ? `Firebase custom domain mapping already exists for https://${slug}.nomos.codes.` : `Firebase custom domain mapping created for https://${slug}.nomos.codes.`);
} catch (error) {
  throw new Error(`Firebase custom domain mapping failed for ${slug}.nomos.codes.`, { cause: error });
}
execFileSync(nodeCommand, [path.join(repoRoot, "scripts", "configure-dns.mjs"), slug], { cwd: repoRoot, stdio: "inherit", env: process.env });

async function waitForUrl(url, description) {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status >= 500) throw new Error(`HTTP ${response.status}`);
      console.log(`${description} is responding (HTTP ${response.status}).`);
      return;
    } catch (error) {
      if (attempt === 20) throw error;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

try {
  await waitForUrl(`http://${slug}.nomos.codes/`, `http://${slug}.nomos.codes`);
  await waitForUrl(`https://${slug}.nomos.codes/`, `https://${slug}.nomos.codes`);
} catch (error) {
  throw new Error(`Hosting verification failed for ${slug}.nomos.codes.`, { cause: error });
}
console.log(`Created apps/${slug} as @nomos/${slug} at http://localhost:${devPort}. Hosting target: nomos-${slug}; custom domain: https://${slug}.nomos.codes.`);
