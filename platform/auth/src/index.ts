export type SessionUser = { id: string; name: string; email: string; avatarUrl?: string };
export interface AuthAdapter { getUser(): Promise<SessionUser | null>; signOut(): Promise<void>; }

export const LOCAL_IDENTITY_ORIGIN = "http://localhost:3001";
export const LOCAL_RETURN_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://localhost:3005",
  "http://localhost:3006",
  "http://localhost:3007",
  "http://localhost:3008",
] as const;
export const LOCAL_DEV_USER: SessionUser = {
  id: "local-kevin",
  name: "Kevin",
  email: "kgilmore.me@gmail.com",
};

const ngrokDevelopmentSuffixes = [".ngrok-free.dev", ".ngrok.app", ".ngrok.io"] as const;

export function isLocalDevelopmentHost(hostname: string): boolean {
  if (["localhost", "127.0.0.1"].includes(hostname)) return true;
  if (process.env.NEXT_PUBLIC_NOMOS_ENV === "production") return false;
  try {
    if (process.env.NEXT_PUBLIC_NOMOS_DEV_PUBLIC_URL && new URL(process.env.NEXT_PUBLIC_NOMOS_DEV_PUBLIC_URL).hostname === hostname) return true;
  } catch {}
  return ngrokDevelopmentSuffixes.some((suffix) => hostname.endsWith(suffix) && hostname.length > suffix.length);
}

export const LOCAL_SESSION_COOKIES = {
  home: "nomos_home_session",
  fitness: "nomos_fitness_session",
  base: "nomos_base_session",
  template: "nomos_template_session",
  finance: "nomos_finance_session",
  goals: "nomos_goals_session",
  time: "nomos_time_session",
} as const;
export function getLocalSessionCookie(slug: string) {
  return LOCAL_SESSION_COOKIES[slug as keyof typeof LOCAL_SESSION_COOKIES] ?? `nomos_${slug}_session`;
}

function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

async function previewSignature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createPreviewSession(user: SessionUser, secret: string) {
  const payload = base64UrlEncode(JSON.stringify({ user, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  return `${payload}.${await previewSignature(payload, secret)}`;
}

export async function verifyPreviewSession(value: string | undefined, secret: string): Promise<SessionUser | null> {
  if (!value || !secret) return null;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;
  const expected = await previewSignature(payload, secret);
  if (expected.length !== signature.length) return null;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  if (difference !== 0) return null;
  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as { user?: SessionUser; expiresAt?: number };
    return decoded.user && typeof decoded.expiresAt === "number" && decoded.expiresAt > Date.now() ? decoded.user : null;
  } catch { return null; }
}

// NODE_ENV is not a deployment selector: local `next start` and some wrappers
// can set it to production. Only an explicit public deployment flag switches
// links away from the local ports.
const production = process.env.NEXT_PUBLIC_NOMOS_ENV === "production" || (typeof window !== "undefined" && (window.location.hostname === "nomos.codes" || window.location.hostname.endsWith(".nomos.codes")));
const defaultUrls = production
  ? { home: "https://nomos.codes", id: "https://id.nomos.codes", base: "https://base.nomos.codes", fitness: "https://fitness.nomos.codes", template: "https://template.nomos.codes", finance: "https://finance.nomos.codes", goals: "https://goals.nomos.codes", time: "https://time.nomos.codes" }
  : { home: "http://localhost:3000", id: "http://localhost:3001", base: "http://localhost:3002", fitness: "http://localhost:3003", template: "http://localhost:3004", finance: "http://localhost:3005", goals: "http://localhost:3006", time: "http://localhost:3007" };

export const NOMOS_URLS = {
  home: process.env.NEXT_PUBLIC_NOMOS_HOME_URL ?? defaultUrls.home,
  id: process.env.NEXT_PUBLIC_NOMOS_ID_URL ?? defaultUrls.id,
  base: process.env.NEXT_PUBLIC_NOMOS_BASE_URL ?? defaultUrls.base,
  fitness: process.env.NEXT_PUBLIC_NOMOS_FITNESS_URL ?? defaultUrls.fitness,
  template: process.env.NEXT_PUBLIC_NOMOS_TEMPLATE_URL ?? defaultUrls.template,
  finance: process.env.NEXT_PUBLIC_NOMOS_FINANCE_URL ?? defaultUrls.finance,
  goals: process.env.NEXT_PUBLIC_NOMOS_GOALS_URL ?? defaultUrls.goals,
  time: process.env.NEXT_PUBLIC_NOMOS_TIME_URL ?? defaultUrls.time,
} as const;

export const PRODUCTION_RETURN_ORIGINS = [
  "https://nomos.codes",
  "https://base.nomos.codes",
  "https://fitness.nomos.codes",
  "https://template.nomos.codes",
  "https://finance.nomos.codes",
  "https://goals.nomos.codes",
  "https://time.nomos.codes",
] as const;

export function validateLocalReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const localHost = ["localhost", "127.0.0.1"].includes(url.hostname);
    const ngrokHost = isLocalDevelopmentHost(url.hostname) && !localHost;
    if ((localHost && url.protocol !== "http:") || (ngrokHost && url.protocol !== "https:")) return null;
    if (url.username || url.password) return null;
    if (ngrokHost) return url.toString();
    const port = url.port ? Number(url.port) : 80;
    const canonicalOrigin = `http://localhost${url.port ? `:${url.port}` : ""}`;
    if (!Number.isInteger(port) || port < 3000 || port > 3099) return null;
    return `${canonicalOrigin}${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function validateProductionReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const nomosDomain = url.protocol === "https:" && (url.hostname === "nomos.codes" || url.hostname.endsWith(".nomos.codes"));
    const knownOrigin = PRODUCTION_RETURN_ORIGINS.includes(url.origin as typeof PRODUCTION_RETURN_ORIGINS[number]);
    let previewOrigin = "";
    try { previewOrigin = process.env.NEXT_PUBLIC_NOMOS_PREVIEW_ORIGIN ? new URL(process.env.NEXT_PUBLIC_NOMOS_PREVIEW_ORIGIN).origin : ""; } catch {}
    const configuredPreview = !!previewOrigin && url.origin === previewOrigin;
    if ((!knownOrigin && !nomosDomain && !configuredPreview) || url.username || url.password) return null;
    return url.toString();
  } catch { return null; }
}

// The identity UI may display a sign-in action for an ngrok URL, but the
// server remains the security boundary and accepts only NOMOS_PREVIEW_ORIGIN.
export function validateIdentityReturnTo(value: string | null | undefined): string | null {
  const production = validateProductionReturnTo(value);
  if (production) return production;
  if (!value) return null;
  try {
    const url = new URL(value);
    const ngrok = url.protocol === "https:" && ngrokDevelopmentSuffixes.some((suffix) => url.hostname.endsWith(suffix));
    return ngrok && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
}

export function buildLocalSignInUrl(returnTo: string): string {
  const safeReturnTo = validateLocalReturnTo(returnTo) ?? LOCAL_RETURN_ORIGINS[0];
  return `${NOMOS_URLS.id}/sign-in?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function buildLocalSignInUrlForRequest(pathname: string, search: string, localPort: number): string {
  const origin = process.env.NEXT_PUBLIC_NOMOS_DEV_PUBLIC_URL ?? `http://localhost:${localPort}`;
  return buildLocalSignInUrl(`${origin}${pathname}${search}`);
}
