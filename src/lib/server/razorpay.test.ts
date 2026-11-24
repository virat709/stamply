import { afterEach, describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "./razorpay";

const original = { ...process.env };

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...original };
});

function stubConfig() {
  vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_key");
  vi.stubEnv("RAZORPAY_KEY_SECRET", "test_secret");
  vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "webhook_secret");
}

describe("verifyWebhookSignature", () => {
  it("accepts a correctly signed raw body", () => {
    stubConfig();
    const raw = '{"event":"subscription.charged"}';
    const signature = createHmac("sha256", "webhook_secret").update(raw).digest("hex");
    expect(verifyWebhookSignature(raw, signature)).toBe(true);
  });

  it("rejects a tampered body with the old signature", () => {
    stubConfig();
    const signature = createHmac("sha256", "webhook_secret").update("{}").digest("hex");
    expect(verifyWebhookSignature('{"event":"subscription.charged"}', signature)).toBe(false);
  });

  it("rejects a missing signature or missing webhook secret", () => {
    stubConfig();
    expect(verifyWebhookSignature("{}", null)).toBe(false);
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "");
    expect(verifyWebhookSignature("{}", "anything")).toBe(false);
  });
});
