/** Server-side configuration diagnostics. Never expose values, only names. */

export const REQUIRED_SERVER_ENV = [
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
] as const;

export function missingServerEnv(): string[] {
  return REQUIRED_SERVER_ENV.filter((name) => !process.env[name]?.trim());
}

export function storeConfigMessage(): string {
  const missing = missingServerEnv();
  if (missing.length === 0) return "Server data store is ready.";
  return `Server data store is not configured. Missing or empty environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Set them in the deployment environment and redeploy (Vercel reads env vars at build/runtime of each deployment). For a single-instance self-host you can instead set LOYALKARD_ALLOW_FILE_STORE=1.`;
}
