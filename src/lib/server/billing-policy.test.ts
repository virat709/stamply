import { describe, it, expect } from "vitest";
import { STATUS_BY_EVENT, canTransition, dedupeKey } from "./billing-policy";

describe("subscription status transitions", () => {
  it("allows a new subscription to become active", () => {
    expect(canTransition(undefined, "active")).toBe(true);
    expect(canTransition("created", "active")).toBe(true);
  });

  it("allows cancellation and expiry from active", () => {
    expect(canTransition("active", "cancelled")).toBe(true);
    expect(canTransition("active", "expired")).toBe(true);
  });

  it("allows a renewal to refresh an already active subscription", () => {
    expect(canTransition("active", "active")).toBe(true);
  });

  it("does not let a late active event resurrect a cancelled or expired subscription", () => {
    expect(canTransition("cancelled", "active")).toBe(false);
    expect(canTransition("expired", "active")).toBe(false);
  });

  it("does not replay creation or duplicate cancelled events", () => {
    expect(canTransition("created", "created")).toBe(false);
    expect(canTransition("cancelled", "cancelled")).toBe(false);
  });

  it("lets a pending checkout record be activated by its first webhook", () => {
    expect(canTransition("pending", "active")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("pending", "pending")).toBe(false);
  });
});

describe("webhook dedupe key", () => {
  const base = { subscriptionId: "sub_123", event: "subscription.charged", status: "active" as const };

  it("prefers the provider event id when present", () => {
    expect(dedupeKey({ ...base, eventIdHeader: "evt_abc" })).toBe("evt_abc");
  });

  it("distinguishes renewal charges by period end", () => {
    const first = dedupeKey({ ...base, currentEnd: "2026-06-01T00:00:00.000Z" });
    const renewal = dedupeKey({ ...base, currentEnd: "2026-12-01T00:00:00.000Z" });
    expect(first).not.toBe(renewal);
  });

  it("falls back to subscription, event, status and period end", () => {
    expect(dedupeKey(base)).toContain("sub_123");
    expect(dedupeKey(base)).toContain("subscription.charged");
  });

  it("maps the charged event to active", () => {
    expect(STATUS_BY_EVENT["subscription.charged"]).toBe("active");
  });
});
