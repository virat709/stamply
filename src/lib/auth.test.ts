import { describe, it, expect, vi, beforeEach } from "vitest";

const { authState, authCallbacks } = vi.hoisted(() => ({
  authState: {
    currentUser: null as null | { uid: string },
    authStateReady: async () => {},
  },
  authCallbacks: [] as Array<(user: { uid: string } | null) => void>,
}));

vi.mock("@firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(async () => ({ user: { uid: "owner-1" } })),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  GoogleAuthProvider: class {},
  onAuthStateChanged: vi.fn((_auth, callback) => {
    authCallbacks.push(callback);
    return () => {};
  }),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  setPersistence: vi.fn(async () => {}),
  browserLocalPersistence: {},
  browserSessionPersistence: {},
}));

vi.mock("@/lib/firebase", () => ({
  auth: authState,
  isFirebaseConfigured: true,
  isDemoMode: false,
}));

vi.mock("@/lib/db", () => ({
  createBusiness: vi.fn(async () => ({ id: "cafe-1" })),
  getOwnerBusinesses: vi.fn(async () => []),
}));

describe("currentOwner immediately after a successful sign-in", () => {
  beforeEach(() => {
    authState.currentUser = null;
    authCallbacks.length = 0;
    vi.resetModules();
  });

  it("keeps the signed-in owner when Firebase publishes the user a beat late", async () => {
    const { signInOwner, currentOwner } = await import("./auth");

    const result = await signInOwner("owner@example.com", "password");
    expect(result.ok).toBe(true);

    // The listener still reports the pre-sign-in state while the Auth SDK
    // propagates the new user. Onboarding reads currentOwner() in this window.
    authCallbacks.forEach((callback) => callback(null));

    await expect(currentOwner()).resolves.toBe("owner-1");
  });
});
