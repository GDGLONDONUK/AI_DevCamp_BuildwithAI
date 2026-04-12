/**
 * Firebase Admin SDK initialisation
 *
 * Used exclusively by Next.js API routes (server-side).
 * Never imported in client components — it contains privileged credentials.
 *
 * Required environment variables (set in .env.local AND in Vercel dashboard):
 *   FIREBASE_ADMIN_PROJECT_ID     — from Firebase Console → Project Settings → Service Accounts
 *   FIREBASE_ADMIN_CLIENT_EMAIL   — from the generated service account JSON
 *   FIREBASE_ADMIN_PRIVATE_KEY    — from the generated service account JSON (keep \n escaped)
 *
 * How to get a service account key:
 *   Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 */

import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin environment variables. " +
      "Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, " +
      "and FIREBASE_ADMIN_PRIVATE_KEY in .env.local and in your deployment environment."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
