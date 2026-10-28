import { hasFirestore, firestoreStore } from "./store-firestore";
import { fileStore } from "./store-file";
import type { Store } from "./store";

/** Firestore-backed store when a service account is configured; otherwise a
 *  single-file local store so the whole server-side flow still works with
 *  zero extra setup (great for local dev — same trust guarantees within
 *  one server process). */
export function getStore(): Store {
  return hasFirestore() ? firestoreStore : fileStore;
}

export { hasFirestore };
