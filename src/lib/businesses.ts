import type { Business } from "./types";

/** First console URL for an owner, or null when they still need onboarding.
 *  Used by sign-in and by the onboarding page so a partially completed signup
 *  can never trap the owner in the "name your restaurant" step. */
export function firstBusinessPath(businesses: Business[] | null | undefined): string | null {
  const first = businesses?.find((b) => Boolean(b?.id));
  return first ? `/dashboard/${first.id}` : null;
}
