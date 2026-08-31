import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getRedirectResult, GoogleAuthProvider, signInWithCredential, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";

function firebaseConfig() {
  const production = process.env.NEXT_PUBLIC_NOMOS_ENV === "production";
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: production ? "id.nomos.codes" : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
