import { NextResponse } from "next/server";

/** Public 500 body. Internal error text (Firestore paths, project ids, stack
 *  traces) must never reach the browser — log it instead. */
export const GENERIC_ERROR = "Something went wrong. Please try again.";

export function logServerError(scope: string, error: unknown): void {
  // Vercel captures stdout/stderr; keep one structured line per failure.
  console.error(`[api:${scope}]`, error);
}

export function serverError(scope: string, error: unknown): NextResponse {
  logServerError(scope, error);
  return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
}

/** JSON response that browsers and CDNs must not cache. */
export function jsonNoStore<T>(body: T, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
