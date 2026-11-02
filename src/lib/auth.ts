"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  type User,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { createBusiness, getBusiness, getOwnerBusinesses, saveBusiness, seedDemo } from "@/lib/db";
import type { Business } from "@/lib/types";

// One auth layer for both worlds:
//  - Firebase configured  -> real accounts via Firebase Auth
//  - demo (no keys)       -> accounts in localStorage (fine for demos, NOT production)

const SESSION_KEY = "stamply_session";

const DEMO_KEY = "stamply_demo_users_v1";

interface DemoUser {
  id: string;
  email: string;
  password: string; // demo only
}

function demoUsers(): DemoUser[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(window.localStorage.getItem(DEMO_KEY) ?? "[]") as DemoUser[];
}

function demoWrite(users: DemoUser[]) {
  window.localStorage.setItem(DEMO_KEY, JSON.stringify(users));
}

// LocalStorage session so the dashboard can guard itself after reloads.
// In Firebase mode the auth user is the source of truth; the session caches
// their uid for the splash frames while auth restores.
function setSession(uid: string) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ uid, ts: Date.now() }));
}

function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

/** Resolve the signed-in owner's uid, or null. A persistent auth listener
 *  keeps the cache live, so sign-in/out at any point in the SPA session is
 *  always reflected (a stale null here used to lock owners out of their own
 *  console and break post-Google-popup routing). */
let cachedOwner: { uid: string } | null | undefined;
let listenerStarted = false;

function startAuthListener(): void {
  if (listenerStarted || !auth) return;
  listenerStarted = true;
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  onAuthStateChanged(auth, (user) => {
    cachedOwner = user ? { uid: user.uid } : null;
    if (user) setSession(user.uid);
    else clearSession();
  });
}

export async function currentOwner(): Promise<string | null> {
  if (isFirebaseConfigured && auth) {
    startAuthListener();
    if (auth.currentUser) {
      cachedOwner = { uid: auth.currentUser.uid };
      setSession(auth.currentUser.uid);
      return auth.currentUser.uid;
    }
    if (typeof auth.authStateReady === "function") {
      await auth.authStateReady();
      const u = auth.currentUser as User | null;
      cachedOwner = u ? { uid: u.uid } : null;
      if (u) setSession(u.uid);
      else clearSession();
      return u ? u.uid : null;
    }
    if (cachedOwner !== undefined) return cachedOwner ? cachedOwner.uid : null;
    const authInstance = auth;
    // First call on this page load — await the listener's first event
    // (falls back to currentUser after 4s if devtools/network stalls).
    const user = await new Promise<User | null>((resolve) => {
      const unsub = onAuthStateChanged(authInstance, (u) => {
        unsub();
        resolve(u);
      });
      setTimeout(() => {
        unsub();
        resolve(authInstance.currentUser);
      }, 4000);
    });
    cachedOwner = user ? { uid: user.uid } : null;
    if (user) setSession(user.uid);
    return user ? user.uid : null;
  }
  try {
    const raw = window.localStorage.getItem(SESSION_KEY) as string | null;
    if (!raw) return null;
    const { uid } = JSON.parse(raw) as { uid: string };
    if (!demoUsers().some((u) => u.id === uid)) {
      clearSession();
      return null;
    }
    return uid;
  } catch {
    return null;
  }
}

export async function signOutOwner(): Promise<void> {
  cachedOwner = null;
  clearSession();
  if (isFirebaseConfigured && auth) await signOut(auth);
}

function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string }).code ?? "";
  switch (code) {
    case "auth/email-already-in-use": return "That email already has an account — sign in instead.";
    case "auth/invalid-email": return "That email doesn't look right.";
    case "auth/weak-password": return "Choose a password with at least 6 characters.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/user-not-found": return "Wrong email or password.";
    case "auth/too-many-requests": return "Too many tries — wait a moment and try again.";
    case "auth/popup-closed-by-user": return "Google sign-in was cancelled.";
    case "auth/cancelled-popup-request": return "Google sign-in was cancelled.";
    case "auth/operation-not-allowed": return "Google sign-in isn't enabled for this project yet in Firebase Console.";
    case "auth/unauthorized-domain": {
      const host = typeof window !== "undefined" ? window.location.hostname : "";
      return `Domain '${host || "current"}' is not authorized for Google sign-in in Firebase Console.`;
    }
    case "auth/account-exists-with-different-credential": return "This email is registered with email and password — use that sign-in instead.";
    default: return (e as Error).message?.replace("Firebase: ", "") ?? "Something went wrong.";
  }
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  uid?: string;
  business?: Business;
  redirecting?: boolean;
}

export async function signUpOwner(restaurantName: string, email: string, password: string): Promise<AuthResult> {
  email = email.trim().toLowerCase();
  const name = restaurantName.trim();
  if (!name) return { ok: false, error: "Enter your restaurant's name." };
  if (password.length < 6) return { ok: false, error: "Choose a password with at least 6 characters." };
  try {
    let uid: string;
    if (isFirebaseConfigured && auth) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
      cachedOwner = { uid };
      setSession(uid);
    } else {
      const users = demoUsers();
      if (users.some((u) => u.email === email)) {
        return { ok: false, error: "That email already has an account — sign in instead." };
      }
      uid = crypto.randomUUID();
      users.push({ id: uid, email, password });
      demoWrite(users);
      cachedOwner = { uid };
      setSession(uid);
    }
    const business = await createBusiness(uid, name);
    return { ok: true, uid, business };
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e) };
  }
}

export function isMobileBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && /Macintosh/.test(navigator.userAgent));
}

/** Google / Gmail one-tap sign-in for owners. Uses direct redirect on mobile
 *  browsers for guaranteed reliability, and popup with auto-redirect fallback
 *  on desktop. */
export async function signInOwnerWithGoogle(): Promise<AuthResult> {
  if (!isFirebaseConfigured || !auth) {
    return { ok: false, error: "Google sign-in needs the connected Firebase project." };
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  // On mobile browsers, popups fail or get blocked — redirect directly
  if (isMobileBrowser()) {
    try {
      await signInWithRedirect(auth, provider);
      return { ok: false, redirecting: true, error: "Redirecting to Google…" };
    } catch (e) {
      return { ok: false, error: friendlyAuthError(e) };
    }
  }

  // On desktop browsers, try popup first
  try {
    const cred = await signInWithPopup(auth, provider);
    cachedOwner = { uid: cred.user.uid };
    setSession(cred.user.uid);
    return { ok: true, uid: cred.user.uid };
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? "";
    if (code === "auth/popup-closed-by-user") {
      return { ok: false, error: "Google sign-in was cancelled." };
    }
    // Any other failure (popup blocked, cross-origin isolation, internal error, etc.): fall back to redirect
    try {
      await signInWithRedirect(auth, provider);
      return { ok: false, redirecting: true, error: "Redirecting to Google…" };
    } catch (redirectErr) {
      return { ok: false, error: friendlyAuthError(redirectErr) };
    }
  }
}

/** Called once on page load to collect the result of a signInWithRedirect()
 *  that may have happened on a previous page load. Returns null if there was
 *  no pending redirect. */
export async function handleGoogleRedirectResult(): Promise<AuthResult | null> {
  if (!isFirebaseConfigured || !auth) return null;
  try {
    const { getRedirectResult } = await import("firebase/auth");
    const result = await getRedirectResult(auth);
    if (!result) return null;
    cachedOwner = { uid: result.user.uid };
    setSession(result.user.uid);
    return { ok: true, uid: result.user.uid };
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e) };
  }
}

export async function signInOwner(email: string, password: string): Promise<AuthResult> {
  email = email.trim().toLowerCase();
  try {
    if (isFirebaseConfigured && auth) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      cachedOwner = { uid: cred.user.uid };
      setSession(cred.user.uid);
      return { ok: true, uid: cred.user.uid };
    }
    const user = demoUsers().find((u) => u.email === email);
    if (!user || user.password !== password) return { ok: false, error: "Wrong email or password." };
    cachedOwner = { uid: user.id };
    setSession(user.id);
    return { ok: true, uid: user.id };
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e) };
  }
}

export async function resetOwnerPassword(email: string): Promise<AuthResult> {
  email = email.trim().toLowerCase();
  if (!email) return { ok: false, error: "Please enter your email address." };
  try {
    if (isFirebaseConfigured && auth) {
      await sendPasswordResetEmail(auth, email);
      return { ok: true };
    }
    const user = demoUsers().find((u) => u.email === email);
    if (!user) return { ok: false, error: "No account found with that email." };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e) };
  }
}

/** Where should this owner land after sign-in? */
export async function firstDashboardPath(uid: string): Promise<string> {
  try {
    const businesses = await getOwnerBusinesses(uid);
    if (businesses && businesses.length > 0) return `/dashboard/${businesses[0].id}`;
  } catch {
    /* fallback to onboarding if fetching businesses failed */
  }
  return "/onboarding";
}

/** Used by /onboarding: create a business for an owner who somehow has none. */
export async function createRestaurantForOwner(uid: string, name: string): Promise<Business> {
  return createBusiness(uid, name);
}

/** Hardens the demo entry links (/dashboard/demo-cafe, /b/demo-cafe):
 *  in the old local-DB mode the demo business always existed; in Firebase
 *  mode it must be seeded into Firestore once so the links resolve. */
let demoSeeded = false;
export async function ensureDemoBusiness(): Promise<void> {
  if (demoSeeded) return;
  if (isFirebaseConfigured) {
    // Server mode: the demo doc is seeded by the server (rules deny all
    // client writes).
    await seedDemo();
    demoSeeded = true;
    return;
  }
  if (await getBusiness("demo-cafe")) {
    demoSeeded = true;
    return;
  }
  await saveBusiness({
    id: "demo-cafe",
    name: "Demo Café",
    loyaltyRule: { requiredStamps: 10, rewardDescription: "Free coffee of your choice", expiresAt: null, minSpend: null },
    createdAt: new Date().toISOString(),
  });
  demoSeeded = true;
}
