import process from "node:process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const slug = (process.argv[2] || "").trim().toLowerCase();
if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error("Usage: node scripts/configure-dns.mjs <app-slug>");
  process.exit(1);
}

const envFile = await readFile(path.resolve(import.meta.dirname, "../.env"), "utf8").catch(() => "");
const fileEnv = Object.fromEntries(envFile.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
}));
const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || fileEnv.API_TOKEN;
if (!token) throw new Error("Cloudflare DNS is not configured: set CLOUDFLARE_API_TOKEN (or CF_API_TOKEN) with Zone DNS Edit access for nomos.codes.");

const api = "https://api.cloudflare.com/client/v4";
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const hostname = `${slug}.nomos.codes`;
const hostingSite = slug === "base" ? "nomos-2aafe" : `nomos-${slug}`;

async function cloudflare(path, init = {}) {
  const response = await fetch(api + path, { ...init, headers: { ...headers, ...init.headers } });
  const body = await response.json();
  if (!response.ok || body.success !== true) throw new Error(body.errors?.map((error) => error.message).join("; ") || `Cloudflare API request failed (${response.status})`);
  return body.result;
}

const firebaseTokenPath = path.join(process.env.HOME ?? "", ".config", "configstore", "firebase-tools.json");
const firebaseTokenConfig = JSON.parse(await readFile(firebaseTokenPath, "utf8").catch(() => "{}"));
const firebaseToken = process.env.FIREBASE_ACCESS_TOKEN || firebaseTokenConfig.tokens?.access_token;
if (!firebaseToken) throw new Error("Firebase CLI credentials are missing; sign in with `firebase login` before creating apps.");

async function firebase(pathname, init = {}) {
  const response = await fetch(`https://firebasehosting.googleapis.com/v1beta1/projects/nomos-2aafe/sites/${hostingSite}/domains${pathname}`, { ...init, headers: { Authorization: `Bearer ${firebaseToken}`, "x-goog-user-project": "nomos-2aafe", ...(init.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || `Firebase Hosting API request failed (${response.status})`);
  return body;
}

const domainResponse = await fetch(`https://firebasehosting.googleapis.com/v1beta1/projects/nomos-2aafe/sites/${hostingSite}/domains`, {
  method: "POST",
  headers: { Authorization: `Bearer ${firebaseToken}`, "Content-Type": "application/json", "x-goog-user-project": "nomos-2aafe" },
  body: JSON.stringify({ site: hostingSite, domainName: hostname }),
});
if (!domainResponse.ok && domainResponse.status !== 409) {
  const body = await domainResponse.json().catch(() => ({}));
  throw new Error(body.error?.message || `Firebase custom domain mapping failed (${domainResponse.status})`);
}
console.log(domainResponse.status === 409 ? `Firebase custom domain mapping already exists for ${hostname}.` : `Firebase custom domain mapping created for ${hostname}.`);

async function firebaseCertificateChallenge() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const body = await firebase("");
    const domain = body.domains?.find((item) => item.domainName === hostname);
    const challenge = domain?.provisioning?.certChallengeDns;
    if (challenge?.domainName && challenge.token) return challenge;
    if (domain?.provisioning?.certStatus === "CERT_ACTIVE") return null;
    if (attempt < 20) await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error(`Firebase has not provided an ACME certificate challenge for ${hostname} yet.`);
}

const zoneId = process.env.CLOUDFLARE_ZONE_ID || process.env.CF_ZONE_ID || (await cloudflare("/zones?name=nomos.codes&status=active&per_page=1"))[0]?.id;
if (!zoneId) throw new Error("Cloudflare zone nomos.codes was not found for this token.");

const records = await cloudflare(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(hostname)}&per_page=100`);
const desiredIp = "199.36.158.100";
const aRecord = records.find((item) => item.name === hostname && item.type === "A");
const conflictingRecord = records.find((item) => item.name === hostname && !["A", "CNAME"].includes(item.type));
if (conflictingRecord) throw new Error(`Cloudflare DNS has an incompatible ${conflictingRecord.type} record for ${hostname}.`);
if (aRecord?.content === desiredIp) {
  console.log(`Cloudflare DNS already configured: ${hostname} -> ${desiredIp}`);
} else {
  for (const record of records.filter((item) => item.name === hostname && ["A", "CNAME"].includes(item.type))) {
    await cloudflare(`/zones/${zoneId}/dns_records/${record.id}`, { method: "DELETE" });
  }
  const payload = { type: "A", name: hostname, content: desiredIp, ttl: 300, proxied: false };
  await cloudflare(`/zones/${zoneId}/dns_records`, { method: "POST", body: JSON.stringify(payload) });
  console.log(`${aRecord ? "Updated" : "Created"} Cloudflare DNS: ${hostname} -> ${desiredIp}`);
}

const challenge = await firebaseCertificateChallenge();
if (challenge) {
  const challengeRecords = await cloudflare(`/zones/${zoneId}/dns_records?type=TXT&name=${encodeURIComponent(challenge.domainName)}&per_page=100`);
  const existing = challengeRecords.find((item) => item.name === challenge.domainName && item.type === "TXT");
  const payload = { type: "TXT", name: challenge.domainName, content: challenge.token, ttl: 300 };
  if (existing) {
    if (existing.content !== challenge.token) await cloudflare(`/zones/${zoneId}/dns_records/${existing.id}`, { method: "PUT", body: JSON.stringify(payload) });
  } else {
    await cloudflare(`/zones/${zoneId}/dns_records`, { method: "POST", body: JSON.stringify(payload) });
  }
  console.log(`Configured Firebase certificate validation TXT record: ${challenge.domainName}`);
} else {
  console.log(`Firebase certificate is already active for ${hostname}.`);
}
