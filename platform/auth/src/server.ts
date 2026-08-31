import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_DEV_USER, validateLocalReturnTo, type SessionUser } from "./index";

const CODE_TTL_MS = 60_000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Store = {
  codes: Record<string, { returnTo: string; user: SessionUser; expiresAt: number }>;
  sessions: Record<string, { user: SessionUser; expiresAt: number }>;
};

function storePath() {
  const root = process.env.NOMOS_ROOT || path.resolve(process.cwd(), "../..");
  return path.join(root, ".nomos-local-auth.json");
}

async function readStore(): Promise<Store> {
  try {
    return JSON.parse(await readFile(storePath(), "utf8")) as Store;
  } catch (error) {
    if (!(error instanceof Error) || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { codes: {}, sessions: {} };
  }
}

async function writeStore(store: Store) {
  const target = storePath();
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(store, null, 2), { mode: 0o600 });
  await rename(temporary, target);
}

function purgeExpired(store: Store, now = Date.now()) {
  for (const [key, value] of Object.entries(store.codes)) if (value.expiresAt <= now) delete store.codes[key];
  for (const [key, value] of Object.entries(store.sessions)) if (value.expiresAt <= now) delete store.sessions[key];
}

export async function createDevelopmentAuthCode(returnTo: string) {
  const safeReturnTo = validateLocalReturnTo(returnTo);
  if (!safeReturnTo) throw new Error("Invalid local return URL");
  const store = await readStore();
  purgeExpired(store);
  const code = randomBytes(32).toString("base64url");
  store.codes[code] = { returnTo: safeReturnTo, user: LOCAL_DEV_USER, expiresAt: Date.now() + CODE_TTL_MS };
  await writeStore(store);
  return code;
}

export async function exchangeDevelopmentAuthCode(code: string, returnTo: string) {
  const safeReturnTo = validateLocalReturnTo(returnTo);
  if (!code || !safeReturnTo) return null;
  const store = await readStore();
  purgeExpired(store);
  const entry = store.codes[code];
  if (!entry || entry.returnTo !== safeReturnTo) {
    await writeStore(store);
    return null;
  }
  delete store.codes[code];
  await writeStore(store);
  return { user: entry.user, returnTo: entry.returnTo };
}

export async function createLocalSession(user: SessionUser) {
  const store = await readStore();
  purgeExpired(store);
  const sessionId = randomBytes(32).toString("base64url");
  store.sessions[sessionId] = { user, expiresAt: Date.now() + SESSION_TTL_MS };
  await writeStore(store);
  return sessionId;
}

export async function getLocalSessionUser(sessionId: string | undefined) {
  if (!sessionId) return null;
  const store = await readStore();
  purgeExpired(store);
  await writeStore(store);
  return store.sessions[sessionId]?.user ?? null;
}

export async function clearLocalSession(sessionId: string | undefined) {
  if (!sessionId) return;
  const store = await readStore();
  delete store.sessions[sessionId];
  await writeStore(store);
}
