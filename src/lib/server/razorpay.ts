import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import type { BillingPeriod, PlanId } from "@/lib/plans";
import { PLANS, toPaise } from "@/lib/plans";
import { getPlanRef, savePlanRef } from "./billing-store";
import { ConfigurationError } from "./http";

const TRIAL_DAYS = 14;
/** Razorpay requires a finite number of cycles; 100 is effectively unlimited. */
const TOTAL_CYCLES = 100;

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

export function razorpayConfig(): RazorpayConfig {
  const keyId = process.env.RAZORPAY_KEY_ID ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new ConfigurationError(
      "Payments are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the environment."
    );
  }
  return { keyId, keySecret, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET };
}

let client: Razorpay | null = null;

function api(config: RazorpayConfig): Razorpay {
  client ??= new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
  return client;
}

/** Include the amount in the cache key: Razorpay plans cannot be edited, so a
 *  price change must create a new plan rather than reuse the old one. */
function planKey(planId: PlanId, period: BillingPeriod, amountPaise: number): string {
  return `${planId}_${period}_${amountPaise}`;
}

const PLAN_ENV: Record<string, string> = {
  counter_6m: "RAZORPAY_PLAN_COUNTER_6M",
  counter_12m: "RAZORPAY_PLAN_COUNTER_12M",
  multi_6m: "RAZORPAY_PLAN_MULTI_6M",
  multi_12m: "RAZORPAY_PLAN_MULTI_12M",
};

/** Resolve a Razorpay plan id, creating the plan once if no id is pinned. */
export async function getOrCreatePlanId(planId: PlanId, period: BillingPeriod): Promise<string> {
  const definition = PLANS.find((p) => p.id === planId);
  if (!definition) throw new Error("Unknown plan.");
  const amount = toPaise(definition.prices[period]);
  const baseKey = `${planId}_${period}`;
  const key = planKey(planId, period, amount);

  const pinned = process.env[PLAN_ENV[baseKey]]?.trim();
  if (pinned) return pinned;

  const cached = await getPlanRef(key);
  if (cached) return cached.planId;

  const isYearly = period === "12m";
  const plan = await api(razorpayConfig()).plans.create({
    period: isYearly ? "yearly" : "monthly",
    interval: isYearly ? 1 : 6,
    item: {
      name: `Loyalkard ${definition.name}`,
      amount,
      currency: "INR",
      description: `${definition.name} — ${isYearly ? "yearly" : "6 months"}`,
    },
    notes: { planId, period },
  });
  await savePlanRef({ key, planId: plan.id, createdAt: new Date().toISOString() });
  return plan.id;
}

export async function createSubscription(input: {
  planId: PlanId;
  period: BillingPeriod;
  businessId: string;
}): Promise<{ subscriptionId: string; keyId: string }> {
  const config = razorpayConfig();
  const plan_id = await getOrCreatePlanId(input.planId, input.period);
  const start_at = Math.floor(Date.now() / 1000) + TRIAL_DAYS * 86_400;
  const subscription = await api(config).subscriptions.create({
    plan_id,
    start_at,
    total_count: TOTAL_CYCLES,
    customer_notify: true,
    notes: { businessId: input.businessId, planId: input.planId, period: input.period },
  });
  return { subscriptionId: subscription.id, keyId: config.keyId };
}

/** Constant-time HMAC check of the raw webhook body. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  // Only the webhook secret is needed here — key id/secret are for outbound API calls.
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
