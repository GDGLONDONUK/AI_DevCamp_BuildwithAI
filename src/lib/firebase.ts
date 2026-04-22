import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firestoreCacheKey = "__ai_devcamp_firestore__" as const;

/**
 * Reuses a single instance across HMR and duplicate modules so the instance created with
 * `ignoreUndefinedProperties` is always used when available.
 */
function getOrInitFirestore(): Firestore {
  const g = globalThis as typeof globalThis & { [K in typeof firestoreCacheKey]?: Firestore };
  const existing = g[firestoreCacheKey];
  if (existing) return existing;
  let db: Firestore;
  try {
    db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    // Already initialised (e.g. HMR) — same Firestore as first init, settings preserved
    db = getFirestore(app);
  }
  g[firestoreCacheKey] = db;
  return db;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getOrInitFirestore();
export const storage = getStorage(app);
export default app;
