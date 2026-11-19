import { initializeApp, getApps, getApp, type FirebaseApp } from "@firebase/app";
import { getAuth, type Auth } from "@firebase/auth";

// The browser uses Firebase Auth only. All data access goes through /api/*
// (Firestore security rules deny direct client access), which keeps the
// Firestore SDK out of the customer bundle and owner identity server-verified.

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

/** The localStorage demo (accounts + data on the device) is only for local
 *  development. A production deploy without Firebase keys must fail loudly
 *  instead of pretending to be a real multi-tenant service. */
export const isDemoMode = !isFirebaseConfigured && process.env.NODE_ENV !== "production";
export const isDemoModeBlocked = !isFirebaseConfigured && process.env.NODE_ENV === "production";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(config);
  auth = getAuth(app);
}

export { app, auth };
