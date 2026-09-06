import { getAdminPublicCollection, serializeFirestoreValue } from "./db.js";
import { onRequest } from "firebase-functions/v2/https";
import { approvedEmails, approvedSessionUser } from "./auth.js";

const DATASET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
type PublicDatasetItem = { id: string; name?: string; level?: string | null; muscles?: string[]; description?: string; summary?: string | null; panPGymEquipment?: string[] };
function isPanPGymMachineItem(item: PublicDatasetItem) {
  return (item.summary || "").split(" · ")[0].trim().toLowerCase() === "machine" && (item.panPGymEquipment || []).length > 0;
}

function jsonError(res: { status: (status: number) => { json: (body: unknown) => void } }, status: number, message: string) {
  res.status(status).json({ error: message });
}

/** Authenticated access to platform-owned public datasets. */
export const dataApi = onRequest({ region: "europe-west2", secrets: ["NOMOS_APPROVED_EMAILS"], cors: false, invoker: "public" }, async (req, res) => {
  if (!await approvedSessionUser(req)) { jsonError(res, 401, "Authentication required"); return; }
  if (req.method !== "GET" && req.method !== "PATCH") { jsonError(res, 405, "Method not allowed"); return; }
  const path = req.path.replace(/^\/api\/data/, "");
  const match = path.match(/^\/public\/([^/]+)(?:\/([^/]+))?\/?$/);
  if (!match || !DATASET_PATTERN.test(match[1])) { jsonError(res, 404, "Dataset not found"); return; }
  try {
    const collection = getAdminPublicCollection(match[1]);
    if (req.method === "PATCH") {
      if (!match[2] || match[1] !== "fitnessExercises" || typeof req.body?.supportedByPanPGym !== "boolean") { jsonError(res, 400, "A supportedByPanPGym boolean is required"); return; }
      const document = collection.doc(decodeURIComponent(match[2]));
      const snapshot = await document.get();
      if (!snapshot.exists) { jsonError(res, 404, "Document not found"); return; }
      await document.update({ supportedByPanPGym: req.body.supportedByPanPGym, panPGymManualOverride: true });
      const updated = await document.get();
      res.json({ item: { id: updated.id, ...serializeFirestoreValue(updated.data()) as object } });
      return;
    }
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
    const muscle = typeof req.query.muscle === "string" ? req.query.muscle.trim() : "";
    const panPGym = req.query.panPGym === "true";
    const equipment = typeof req.query.equipment === "string" ? req.query.equipment.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean) : [];
    const filtering = Boolean(search || muscle || equipment.length);
    let orderedCollection = collection;
    if (panPGym) orderedCollection = orderedCollection.where("supportedByPanPGym", "==", true) as typeof collection;
    if (muscle) orderedCollection = orderedCollection.where("muscles", "array-contains", muscle) as typeof collection;
    const snapshot = await orderedCollection.orderBy("name").limit(filtering ? 500 : limit + 1).offset(filtering ? 0 : offset).get();
    const allItems: PublicDatasetItem[] = snapshot.docs.map((document) => ({ id: document.id, ...serializeFirestoreValue(document.data()) as object }));
    const candidates = filtering
      ? allItems.filter((item) => (!muscle || (item.muscles || []).some((value) => value.toLowerCase() === muscle.toLowerCase())) && (!equipment.length || equipment.some((value) => value === "machine" ? isPanPGymMachineItem(item) : (item.summary || "").split(" · ")[0].trim().toLowerCase() === value)) && (!search || [item.name, item.level, ...(item.muscles || []), item.description].filter(Boolean).join(" ").toLowerCase().includes(search)))
      : allItems;
    const items = filtering ? candidates.slice(offset, offset + limit) : candidates.slice(0, limit);
    res.json({ items, hasMore: filtering ? offset + items.length < candidates.length : snapshot.size > limit, nextOffset: offset + items.length, ...(filtering ? { total: candidates.length } : {}) });
  } catch (error) {
    console.error(error);
    jsonError(res, 500, error instanceof Error ? error.message : "Unable to load dataset");
  }
});
