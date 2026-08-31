import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, setDoc, type DocumentData, type Firestore, type QueryConstraint } from "firebase/firestore";
import { getFirebaseApp } from "./firebase";

export type FirestoreRecord = Record<string, unknown>;

/** Returns the shared browser Firestore instance, initialized on first use. */
export function getFirestoreDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

function pathSegments(path: string) {
  const segments = path.split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) throw new Error("Invalid Firestore path");
  return segments;
}

export async function getFirestoreDocument<T extends FirestoreRecord>(path: string): Promise<(T & { id: string }) | null> {
  const reference = doc(getFirestoreDb(), ...pathSegments(path));
  const snapshot = await getDoc(reference);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() as T } : null;
}

export async function listFirestoreDocuments<T extends FirestoreRecord>(path: string, constraints: QueryConstraint[] = []): Promise<Array<T & { id: string }>> {
  const reference = collection(getFirestoreDb(), ...pathSegments(path));
  const snapshot = await getDocs(query(reference, ...constraints));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() as T }));
}

export async function setFirestoreDocument<T extends FirestoreRecord>(path: string, value: T, merge = true): Promise<void> {
  await setDoc(doc(getFirestoreDb(), ...pathSegments(path)), value as DocumentData, { merge });
}

export { collection, limit, orderBy, query };
export { getFirebaseApp } from "./firebase";
