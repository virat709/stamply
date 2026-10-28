// Customer "possession" cookies: the ONLY way a browser can read card data.
// One cookie maps businessId -> { cardId, customerId, token }, and every card
// read validates the stored token against the server store. A phone number
// typed in by a stranger can no longer reveal someone else's card.

import type { NextResponse } from "next/server";

export interface CardClaim {
  cardId: string;
  customerId: string;
  token: string;
}

const COOKIE_NAME = "stamply_cards";
const MAX_AGE = 60 * 60 * 24 * 365; // one year — loyalty cards live long

type CookieMap = Record<string, CardClaim>;

function parse(cookieValue: string | undefined): CookieMap {
  try {
    if (!cookieValue) return {};
    // The runtime may encode the already-encoded value — decode until stable JSON.
    let v = cookieValue;
    for (let i = 0; i < 3 && !v.startsWith("{"); i++) {
      v = decodeURIComponent(v);
    }
    return v.startsWith("{") ? (JSON.parse(v) as CookieMap) : {};
  } catch {
    return {};
  }
}

export function getClaims(req: Request): CookieMap {
  const header = req.headers.get("cookie") ?? "";
  const raw = header
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(COOKIE_NAME + "="));
  return parse(raw?.slice(COOKIE_NAME.length + 1));
}

export function setClaim(res: NextResponse, businessId: string, claim: CardClaim, existing: CookieMap): void {
  const map = { ...existing };
  map[businessId] = claim;
  res.cookies.set(COOKIE_NAME, encodeURIComponent(JSON.stringify(map)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

/** Merge a new claim with the claims already present in the request. */
export function mergeAndSetClaim(req: Request, res: NextResponse, businessId: string, claim: CardClaim): void {
  const map = getClaims(req);
  map[businessId] = claim;
  res.cookies.set(COOKIE_NAME, encodeURIComponent(JSON.stringify(map)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

/** Check a request is allowed to read a card: possession cookie token must
 *  match, OR an authenticated owner may look it up (dashboard). */
export function hasClaim(claims: CookieMap, businessId: string, cardId: string): boolean {
  return claims[businessId]?.cardId === cardId;
}
