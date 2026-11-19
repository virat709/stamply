/** Server-side configuration diagnostics. Never expose values, only names.
 *
 *  Firebase service accounts are configured with several common naming
 *  conventions across tutorials and dashboards, so accept all of them. */

const firstEnv = (names: string[]): string | undefined => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
};

const SERVICE_ACCOUNT_NAMES = ["FIREBASE_SERVICE_ACCOUNT", "GOOGLE_APPLICATION_CREDENTIALS_JSON"];

function parsedServiceAccount(): { clientEmail?: string; privateKey?: string } {
  const raw = firstEnv([...SERVICE_ACCOUNT_NAMES]);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string; clientEmail?: string; privateKey?: string };
    return {
      clientEmail: parsed.client_email ?? parsed.clientEmail,
      privateKey: parsed.private_key ?? parsed.privateKey,
    };
  } catch {
    return {};
  }
}

/** Resolved admin credentials, regardless of which naming convention was used. */
export function adminCredentials(): { projectId?: string; clientEmail?: string; privateKey?: string } {
  const sa = parsedServiceAccount();
  return {
    projectId: firstEnv(["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_PROJECT_ID", "FIREBASE_ADMIN_PROJECT_ID"]),
    clientEmail: firstEnv(["FIREBASE_ADMIN_CLIENT_EMAIL", "FIREBASE_CLIENT_EMAIL"]) ?? sa.clientEmail,
    privateKey: firstEnv(["FIREBASE_ADMIN_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY"]) ?? sa.privateKey,
  };
}

export function firebasePrivateKey(raw?: string): string | undefined {
  return raw?.replace(/\\n/g, "\n");
}

/** Human-readable descriptions of missing credential groups (names only). */
export function missingServerEnv(): string[] {
  const c = adminCredentials();
  const missing: string[] = [];
  if (!c.projectId) missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID (or FIREBASE_PROJECT_ID / FIREBASE_ADMIN_PROJECT_ID)");
  if (!c.clientEmail) missing.push("FIREBASE_ADMIN_CLIENT_EMAIL (or FIREBASE_CLIENT_EMAIL / FIREBASE_SERVICE_ACCOUNT)");
  if (!c.privateKey) missing.push("FIREBASE_ADMIN_PRIVATE_KEY (or FIREBASE_PRIVATE_KEY / FIREBASE_SERVICE_ACCOUNT)");
  return missing;
}

export function storeConfigMessage(): string {
  const missing = missingServerEnv();
  if (missing.length === 0) return "Server data store is ready.";
  return `Server data store is not configured. Missing or empty: ${missing.join("; ")}. Add them to the Production environment and redeploy. For a single-instance self-host you can instead set LOYALKARD_ALLOW_FILE_STORE=1.`;
}
