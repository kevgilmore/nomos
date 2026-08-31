export type SessionUser = { id: string; name: string; email: string; avatarUrl?: string };
export interface AuthAdapter { getUser(): Promise<SessionUser | null>; signOut(): Promise<void>; }

export const LOCAL_IDENTITY_ORIGIN = "http://localhost:3001";
export const LOCAL_RETURN_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3002",
  "http://localhost:3003",
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
} as const;

// NODE_ENV is not a deployment selector: local `next start` and some wrappers
// can set it to production. Only an explicit public deployment flag switches
// links away from the local ports.
const production = process.env.NEXT_PUBLIC_NOMOS_ENV === "production";
const defaultUrls = production
  ? { home: "https://nomos.codes", id: "https://id.nomos.codes", base: "", fitness: "https://fitness.nomos.codes" }
  : { home: "http://localhost:3000", id: "http://localhost:3001", base: "http://localhost:3002", fitness: "http://localhost:3003" };

export const NOMOS_URLS = {
  home: process.env.NEXT_PUBLIC_NOMOS_HOME_URL ?? defaultUrls.home,
  id: process.env.NEXT_PUBLIC_NOMOS_ID_URL ?? defaultUrls.id,
  base: process.env.NEXT_PUBLIC_NOMOS_BASE_URL ?? defaultUrls.base,
  fitness: process.env.NEXT_PUBLIC_NOMOS_FITNESS_URL ?? defaultUrls.fitness,
} as const;

export const PRODUCTION_RETURN_ORIGINS = [
  "https://nomos.codes",
  "https://base.nomos.codes",
  "https://fitness.nomos.codes",
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
    const canonicalOrigin = `http://localhost${url.port ? `:${url.port}` : ""}`;
    if (!LOCAL_RETURN_ORIGINS.includes(canonicalOrigin as typeof LOCAL_RETURN_ORIGINS[number])) return null;
    return `${canonicalOrigin}${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export function validateProductionReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!PRODUCTION_RETURN_ORIGINS.includes(url.origin as typeof PRODUCTION_RETURN_ORIGINS[number]) || url.username || url.password) return null;
    return url.toString();
  } catch { return null; }
}

export function buildLocalSignInUrl(returnTo: string): string {
  const safeReturnTo = validateLocalReturnTo(returnTo) ?? LOCAL_RETURN_ORIGINS[0];
  return `${LOCAL_IDENTITY_ORIGIN}/sign-in?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function buildLocalSignInUrlForRequest(pathname: string, search: string, localPort: number): string {
  return buildLocalSignInUrl(`http://localhost:${localPort}${pathname}${search}`);
}
