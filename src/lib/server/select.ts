import { storeConfigMessage } from "./config";
import { ConfigurationError } from "./http";
import { hasFirestore, firestoreStore } from "./store-firestore";
import { fileStore } from "./store-file";
import type { Store } from "./store";

/** Firestore-backed store when a service account is configured.
 *
 *  The single-file local store is for development only. On a serverless
 *  production host the filesystem is read-only, so silently falling back to it
 *  turns every join/stamp/redeem into a 500 while looking "configured". Fail
 *  closed instead; self-hosted single-instance deployments can opt in with
 *  LOYALKARD_ALLOW_FILE_STORE=1. */
export function getStore(): Store {
  if (hasFirestore()) return firestoreStore;
  if (process.env.NODE_ENV === "production" && process.env.LOYALKARD_ALLOW_FILE_STORE !== "1") {
    throw new ConfigurationError(storeConfigMessage());
  }
  return fileStore;
}

export { hasFirestore };
