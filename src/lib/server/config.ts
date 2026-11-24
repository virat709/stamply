/** Server-side configuration diagnostics. Never expose values, only names.
 *
 *  Firebase service accounts are configured with several common naming
 *  conventions across tutorials and dashboards, so accept all of them. */

const PROJECT_ID_NAMES = [
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_ADMIN_PROJECT_ID",
  "GOOGLE_PROJECT_ID",
  "GCP_PROJECT_ID",
];

const SERVICE_ACCOUNT_NAMES = [
  "FIREBASE_SERVICE_ACCOUNT",
  "FIREBASE_SERVICE_ACCOUNT_JSON",
  "FIREBASE_SERVICE_ACCOUNT_BASE64",
  "GOOGLE_APPLICATION_CREDENTIALS_JSON",
  "GOOGLE_SERVICE_ACCOUNT",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "GCP_SERVICE_ACCOUNT_JSON",
];

const CLIENT_EMAIL_NAMES = [
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_ADMIN_EMAIL",
  "FIREBASE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_CLIENT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GCP_CLIENT_EMAIL",
];

const PRIVATE_KEY_NAMES = [
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  "GCP_PRIVATE_KEY",
];

export const CREDENTIAL_ENV_NAMES = [
  ...new Set([...PROJECT_ID_NAMES, ...SERVICE_ACCOUNT_NAMES, ...CLIENT_EMAIL_NAMES, ...PRIVATE_KEY_NAMES]),
];

/** Trim whitespace and remove quotes that some dashboards wrap values in. */
const clean = (value?: string): string | undefined => {
  let trimmed = value?.trim();
  if (!trimmed) return undefined;
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed || undefined;
};

const firstEnv = (names: string[]): string | undefined => {
  for (const name of names) {
    const value = clean(process.env[name]);
    if (value) return value;
  }
  return undefined;
};

type ServiceAccount = { clientEmail?: string; privateKey?: string };

function serviceAccountSource(): { name?: string; raw?: string } {
  for (const name of SERVICE_ACCOUNT_NAMES) {
    const raw = firstEnv([name]);
    if (raw) return { name, raw };
  }
  return {};
}

/** Parse a service account from JSON, quoted JSON, or base64-encoded JSON. */
function parseServiceAccount(raw?: string): ServiceAccount | undefined {
  if (!raw) return undefined;
  const candidates = [raw];
  try {
    candidates.push(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    /* not base64 */
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        client_email?: string;
        private_key?: string;
        clientEmail?: string;
        privateKey?: string;
      };
      const clientEmail = clean(parsed.client_email ?? parsed.clientEmail);
      const privateKey = clean(parsed.private_key ?? parsed.privateKey);
      if (clientEmail || privateKey) return { clientEmail, privateKey };
    } catch {
      /* try the next representation */
    }
  }
  return undefined;
}

/** Resolved admin credentials, regardless of which naming convention was used. */
export function adminCredentials(): { projectId?: string; clientEmail?: string; privateKey?: string } {
  const sa = parseServiceAccount(serviceAccountSource().raw);
  return {
    projectId: firstEnv(PROJECT_ID_NAMES),
    clientEmail: firstEnv(CLIENT_EMAIL_NAMES) ?? sa?.clientEmail,
    privateKey: firstEnv(PRIVATE_KEY_NAMES) ?? sa?.privateKey,
  };
}

export function firebasePrivateKey(raw?: string): string | undefined {
  return raw?.replace(/\\n/g, "\n");
}

const CREDENTIAL_NAME_PATTERN = /FIREBASE|GOOGLE|GCP|SERVICE[_ -]?ACCOUNT|PRIVATE[_ -]?KEY|CLIENT[_ -]?EMAIL|APPLICATION[_ -]?CREDENTIALS/i;

/** Diagnostic view of the runtime environment. Contains NAMES only — never values,
 *  including resolved credentials. Safe to serialize to a public endpoint. */
export function credentialStatus() {
  const source = serviceAccountSource();
  const parsed = parseServiceAccount(source.raw);
  return {
    presentCredentialVars: CREDENTIAL_ENV_NAMES.filter((name) => firstEnv([name]) !== undefined),
    credentialLikeVars: Object.keys(process.env)
      .filter((name) => CREDENTIAL_NAME_PATTERN.test(name) && firstEnv([name]) !== undefined)
      .sort(),
    serviceAccountVar: source.name,
    malformedServiceAccount: !!source.raw && !parsed,
  };
}

/** Human-readable descriptions of missing credential groups (names only). */
export function missingServerEnv(): string[] {
  const credentials = adminCredentials();
  const status = credentialStatus();
  const missing: string[] = [];
  if (!credentials.projectId) {
    missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID (or FIREBASE_PROJECT_ID / FIREBASE_ADMIN_PROJECT_ID / GOOGLE_PROJECT_ID)");
  }
  if (status.malformedServiceAccount) {
    missing.push(`${status.serviceAccountVar} is set but is not valid JSON (or base64 JSON) — check quotes and line breaks`);
  }
  if (!credentials.clientEmail) {
    missing.push("FIREBASE_ADMIN_CLIENT_EMAIL (or FIREBASE_CLIENT_EMAIL / FIREBASE_SERVICE_ACCOUNT)");
  }
  if (!credentials.privateKey) {
    missing.push("FIREBASE_ADMIN_PRIVATE_KEY (or FIREBASE_PRIVATE_KEY / FIREBASE_SERVICE_ACCOUNT)");
  }
  return missing;
}

export function storeConfigMessage(): string {
  const missing = missingServerEnv();
  if (missing.length === 0) return "Server data store is ready.";
  return `Server data store is not configured. Missing or empty: ${missing.join("; ")}. Add them to the Production environment and redeploy. For a single-instance self-host you can instead set LOYALKARD_ALLOW_FILE_STORE=1.`;
}
