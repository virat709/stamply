// Customer "possession" cookies: the ONLY way a browser can read card data.
// One cookie maps businessId -> { cardId, customerId, token }, and every card
// read validates the stored token against the server store.

import type { NextResponse } from "next/server";

export interface CardClaim {
  cardId: string;
  customerId: string;
  token: string;
}

const COOKIE_NAME = "loyalkard_cards";
const MAX_AGE = 60 * 60 * 24 * 365; // one year — loyalty cards live long

type CookieMap = Record<string, CardClaim>;

function parse(cookieValue: string | undefined): CookieMap {
  try {
    if (!cookieValue) return {};
    let v = cookieValue;
    // The runtime may encode the already-encoded value — decode until stable JSON.
    for (let i = 0; i < 3 && !v.startsWith("{"); i++) v = decodeURIComponent(v);
    return v.startsWith("{") ? (JSON.parse(v) as CookieMap) : {};
  } catch {
    return {};
  }
}

export function getClaims(req: Request): CookieMap {
  const raw = (req.headers.get("cookie") ?? "")
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(COOKIE_NAME + "="));
  return parse(raw?.slice(COOKIE_NAME.length + 1));
}

/** Write (or merge) a claim into the response cookie. */
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
