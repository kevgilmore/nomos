export type AdminDocument = { id: string; data: Record<string, unknown> };
export declare function getAdminFirestore(): import("firebase-admin/firestore").Firestore;
export declare function getAdminCollection(path: string): import("firebase-admin/firestore").CollectionReference;
export declare function getAdminPublicCollection(dataset: string): import("firebase-admin/firestore").CollectionReference;
export declare function serializeFirestoreValue(value: unknown): unknown;
export declare function writeFirestoreDocuments(path: string, documents: AdminDocument[], options?: { merge?: boolean; batchSize?: number }): Promise<void>;
