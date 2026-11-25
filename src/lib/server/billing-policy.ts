import type { SubscriptionStatus } from "./billing-store";

/** Razorpay webhook events we understand, mapped to our local status. */
export const STATUS_BY_EVENT: Record<string, SubscriptionStatus> = {
  "subscription.created": "created",
  "subscription.authenticated": "created",
  "subscription.activated": "active",
  "subscription.charged": "active",
  "subscription.resumed": "active",
  "subscription.pending": "created",
  "subscription.halted": "cancelled",
  "subscription.cancelled": "cancelled",
  "subscription.paused": "cancelled",
  "subscription.completed": "cancelled",
  "subscription.expired": "expired",
};

/** Webhooks can arrive out of order. Never let a late event resurrect a dead
 *  subscription, and never replay creation/cancellation twice. */
export function canTransition(
  current: SubscriptionStatus | undefined,
  next: SubscriptionStatus
): boolean {
  if (!current) return true;
  if (current === "pending") return next !== "pending";
  if (current === "expired") return false;
  if (current === "cancelled") return next === "expired";
  if (current === "created") return next !== "created";
  // Active can stay active (a renewal updates the period end), or end.
  return true;
}

/** A stable key for one webhook delivery. The provider event id is best; when
 *  absent, include the period end so each renewal is distinct. */
export function dedupeKey(input: {
  eventIdHeader?: string | null;
  subscriptionId: string;
  event: string;
  status: SubscriptionStatus;
  currentEnd?: string;
}): string {
  if (input.eventIdHeader && /^[A-Za-z0-9_-]{1,120}$/.test(input.eventIdHeader)) {
    return input.eventIdHeader;
  }
  return `${input.subscriptionId}:${input.event}:${input.status}:${input.currentEnd ?? ""}`;
}
