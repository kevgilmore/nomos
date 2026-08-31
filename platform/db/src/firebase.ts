import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

const firebaseEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  const missing = Object.entries(firebaseEnv).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) throw new Error(`Missing Firebase environment variables: ${missing.join(", ")}`);
  return initializeApp(firebaseEnv);
}
