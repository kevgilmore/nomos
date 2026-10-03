export type OfflineSyncState = "online" | "offline" | "syncing" | "error";

type QueueItem = { id: string; key: string; payload: unknown; createdAt: number };
type Handler = (payload: unknown) => Promise<void>;
type Listener = (state: OfflineSyncState, pending: number) => void;

const STORAGE_KEY = "nomos.offline.mutations.v1";
const handlers = new Map<string, Handler>();
const listeners = new Set<Listener>();
let flushing = false;
let lastError = false;

function readQueue(): QueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function writeQueue(queue: QueueItem[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch { /* Storage may be unavailable. */ }
}

function notify(state: OfflineSyncState) {
  for (const listener of listeners) listener(state, readQueue().length);
}

export function subscribeOfflineSync(listener: Listener) {
  listeners.add(listener);
  listener(navigator.onLine ? (lastError ? "error" : "online") : "offline", readQueue().length);
  return () => listeners.delete(listener);
}

export function registerOfflineMutationHandler(key: string, handler: Handler) {
  handlers.set(key, handler);
  void flushOfflineMutations();
  return () => handlers.delete(key);
}

export function enqueueOfflineMutation(key: string, payload: unknown) {
  const queue = readQueue();
  queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, key, payload, createdAt: Date.now() });
  writeQueue(queue);
  notify(navigator.onLine ? "syncing" : "offline");
  void flushOfflineMutations();
}

export async function flushOfflineMutations() {
  if (flushing || typeof window === "undefined" || !navigator.onLine) return;
  flushing = true;
  notify("syncing");
  try {
    let queue = readQueue();
    while (queue.length) {
      const item = queue[0];
      const handler = handlers.get(item.key);
      if (!handler) break;
      try {
        await handler(item.payload);
        queue = queue.slice(1);
        writeQueue(queue);
        lastError = false;
        notify(queue.length ? "syncing" : "online");
      } catch {
        lastError = true;
        notify("error");
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { lastError = false; void flushOfflineMutations(); });
  window.addEventListener("offline", () => notify("offline"));
}
