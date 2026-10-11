import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let app: FirebaseApp | null = null;
if (isFirebaseConfigured) {
  app = getApps()[0] ?? initializeApp(firebaseConfig);
}

export function fbAuth(): Auth {
  if (!app) throw new Error("Firebase is not configured. Add the Firebase web app keys to .env.local.");
  return getAuth(app);
}

/**
 * Firestore handle, loaded lazily.
 *
 * Importing "firebase/firestore" executes protobufjs codegen (new Function)
 * at module scope, which the Cloudflare Workers runtime rejects while
 * handling requests (EvalError). The dynamic import keeps it out of the
 * server's module graph: these call sites only ever run in effects and
 * user callbacks, i.e. in the browser. The module is fetched once and
 * cached for every later caller.
 */
let dbPromise: Promise<Firestore> | null = null;

export function fbDb(): Promise<Firestore> {
  if (!app) throw new Error("Firebase is not configured. Add the Firebase web app keys to .env.local.");
  if (!dbPromise) {
    dbPromise = import("firebase/firestore").then((m) => m.getFirestore(app!));
  }
  return dbPromise;
}
