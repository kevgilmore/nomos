export const platformConfig = { name: "Nomos", supportEmail: "support@example.com" } as const;
export { platformApps, type PlatformApp } from "./apps.generated";
export { getFirebaseApp } from "./firebase";
export { getFirestoreDb, getFirestoreDocument, listFirestoreDocuments, setFirestoreDocument } from "@nomos/db";
