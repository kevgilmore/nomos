import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

const root = path.resolve(import.meta.dirname, "..");
const fileEnv = parseEnv(await readFile(path.join(root, ".env"), "utf8"));
// Match the CLI: inherited environment variables take precedence over .env.
const env = { ...fileEnv, ...process.env };
const name = env.HEVY_API_KEY ? "HEVY_API_KEY" : "HEVY_API_TOKEN";
const key = env[name];
if (!key) {
  console.error("No Hevy credential configured.");
  process.exit(1);
}
if (/^cf(?:at|ut|k)_/.test(key)) {
  console.error(`${name} contains a Cloudflare credential, not a Hevy API key. No request sent.`);
  process.exit(1);
}
console.log(`Variable: ${name}`);
console.log(`Source: ${Object.hasOwn(process.env, name) ? "shell environment" : "root .env"}`);
console.log(`Credential fingerprint: ${createHash("sha256").update(key).digest("hex").slice(0, 16)}`);
console.log(`Node: ${process.version}; platform: ${process.platform}`);
try {
  const response = await fetch("https://api.hevyapp.com/v1/routines?page=1&pageSize=1", {
    headers: { "api-key": key, "content-type": "application/json" },
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  console.log(`Hevy HTTP status: ${response.status}`);
  // Never print the credential or returned workout/account data.
  await response.body?.cancel();
  if (!response.ok) process.exitCode = 1;
} catch {
  console.error("Hevy request failed before a response was received.");
  process.exitCode = 1;
}
