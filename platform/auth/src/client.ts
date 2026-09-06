import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getRedirectResult, GoogleAuthProvider, signInWithCredential, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";

// Firebase web configuration is public client configuration. Keep environment
// variables as overrides, but include the project defaults so static builds
// (including Firebase Hosting deploys) can initialize Auth without a local .env.
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCMpyoT3rI5exQjdNKS1r_1nXey0P6_leQ",
  authDomain: "nomos-2aafe.firebaseapp.com",
  projectId: "nomos-2aafe",
  storageBucket: "nomos-2aafe.firebasestorage.app",
  messagingSenderId: "830566979292",
  appId: "1:830566979292:web:e1bb060308a81a0d680619",
};

function firebaseConfig() {
  const production = process.env.NEXT_PUBLIC_NOMOS_ENV === "production";
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: production
      ? "id.nomos.codes"
      : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
  };
  return Object.values(config).every(Boolean) ? config : null;
}

export async function signInWithGoogleCredential(googleCredential: string) {
  const config = firebaseConfig();
  if (!config) throw new Error("Firebase client configuration is missing");
  const app = getApps().length ? getApp() : initializeApp(config);
  const result = await signInWithCredential(getAuth(app), GoogleAuthProvider.credential(googleCredential));
  return result.user.getIdToken();
}

export async function signInWithGooglePopup() {
  const config = firebaseConfig();
  if (!config) throw new Error("Firebase client configuration is missing");
  const app = getApps().length ? getApp() : initializeApp(config);
  const result = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
  return result.user.getIdToken();
}

export async function signInWithGoogleRedirect() {
  const config = firebaseConfig();
  if (!config) throw new Error("Firebase client configuration is missing");
  const app = getApps().length ? getApp() : initializeApp(config);
  await signInWithRedirect(getAuth(app), new GoogleAuthProvider());
}

export async function completeGoogleRedirect() {
  const config = firebaseConfig();
  if (!config) throw new Error("Firebase client configuration is missing");
  const app = getApps().length ? getApp() : initializeApp(config);
  const result = await getRedirectResult(getAuth(app));
  return result ? result.user.getIdToken() : null;
}

export async function signOutFirebaseUser() {
  if (!firebaseConfig() || !getApps().length) return;
  await signOut(getAuth(getApp()));
}
