import { NextResponse } from "next/server";
import { credentialStatus, missingServerEnv } from "@/lib/server/config";
import { hasFirestore } from "@/lib/server/store-firestore";

export const dynamic = "force-dynamic";

/** Lightweight deployment diagnostic. Reports only variable NAMES, never
 *  values, so it is safe to hit in production when checking a new deploy. */
export async function GET() {
  const missing = missingServerEnv();
  const credentials = credentialStatus();
  const ready = hasFirestore() || process.env.LOYALKARD_ALLOW_FILE_STORE === "1";
  const res = NextResponse.json({
    ok: true,
    service: "loyalkard",
    timestamp: new Date().toISOString(),
    store: {
      mode: hasFirestore() ? "firestore" : process.env.LOYALKARD_ALLOW_FILE_STORE === "1" ? "file" : "unconfigured",
      ready,
      missingVars: missing,
      // Names only — useful for spotting credentials stored under a different
      // variable name in the hosting dashboard. Never include values.
      presentCredentialVars: credentials.presentCredentialVars,
      malformedServiceAccount: credentials.malformedServiceAccount,
    },
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
