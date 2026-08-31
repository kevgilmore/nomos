import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminFirestore() {
  if (!getApps().length) initializeApp();
  return getFirestore();
}

function pathSegments(path) {
  const segments = path.split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) throw new Error("Invalid Firestore path");
  return segments;
}

export function getAdminCollection(path) {
  const segments = pathSegments(path);
  if (segments.length % 2 === 0) throw new Error("A collection path must have an odd number of segments");
  return getAdminFirestore().collection(segments.join("/"));
}

export function getAdminPublicCollection(dataset) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(dataset)) throw new Error("Invalid public dataset name");
  return getAdminCollection(`public/${dataset}/items`);
}

export function serializeFirestoreValue(value) {
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeFirestoreValue(item)]));
  return value;
}

export async function writeFirestoreDocuments(path, documents, { merge = true, batchSize = 400 } = {}) {
  const collection = getAdminCollection(path);
  for (let offset = 0; offset < documents.length; offset += batchSize) {
    const batch = getAdminFirestore().batch();
    for (const document of documents.slice(offset, offset + batchSize)) {
      if (!document.id) throw new Error("Every Firestore document must have an id");
      batch.set(collection.doc(document.id), document.data, { merge });
    }
    if (documents.length) await batch.commit();
  }
}
