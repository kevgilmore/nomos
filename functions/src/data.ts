import { getAdminPublicCollection, serializeFirestoreValue } from "./db.js";
import { onRequest } from "firebase-functions/v2/https";
import { approvedEmails, approvedSessionUser } from "./auth.js";

const DATASET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
type PublicDatasetItem = { id: string; name?: string; level?: string | null; muscles?: string[]; description?: string };

function jsonError(res: { status: (status: number) => { json: (body: unknown) => void } }, status: number, message: string) {
  res.status(status).json({ error: message });
}

/** Authenticated, read-only access to platform-owned public datasets. */
export const dataApi = onRequest({ region: "europe-west2", secrets: [approvedEmails], cors: false, invoker: "public" }, async (req, res) => {
  if (!await approvedSessionUser(req)) { jsonError(res, 401, "Authentication required"); return; }
  if (req.method !== "GET") { jsonError(res, 405, "Method not allowed"); return; }
  const path = req.path.replace(/^\/api\/data/, "");
  const match = path.match(/^\/public\/([^/]+)(?:\/([^/]+))?\/?$/);
  if (!match || !DATASET_PATTERN.test(match[1])) { jsonError(res, 404, "Dataset not found"); return; }
  try {
    const collection = getAdminPublicCollection(match[1]);
    if (match[2]) {
      const snapshot = await collection.doc(decodeURIComponent(match[2])).get();
      if (!snapshot.exists) { jsonError(res, 404, "Document not found"); return; }
      res.json({ item: { id: snapshot.id, ...serializeFirestoreValue(snapshot.data()) as object } });
      return;
    }
    const requestedOffset = Number(req.query.offset || 0);
    const requestedLimit = Number(req.query.limit || 100);
    const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 100;
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const snapshot = await collection.orderBy("name").limit(search ? 500 : limit + 1).offset(search ? 0 : offset).get();
    const allItems: PublicDatasetItem[] = snapshot.docs.map((document) => ({ id: document.id, ...serializeFirestoreValue(document.data()) as object }));
    const candidates = search
      ? allItems.filter((item) => [item.name, item.level, ...(item.muscles || []), item.description].filter(Boolean).join(" ").toLowerCase().includes(search))
      : allItems;
    const items = search ? candidates.slice(offset, offset + limit) : candidates.slice(0, limit);
    res.json({ items, hasMore: search ? offset + items.length < candidates.length : snapshot.size > limit, nextOffset: offset + items.length, ...(search ? { total: candidates.length } : {}) });
  } catch (error) {
    console.error(error);
    jsonError(res, 500, error instanceof Error ? error.message : "Unable to load dataset");
  }
});
