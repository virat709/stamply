/** Public, client-safe pricing catalog. No secrets or server-only values here. */

export type BillingPeriod = "6m" | "12m";
export type PlanId = "counter" | "multi";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  note: string;
  description: string;
  featured: boolean;
  features: string[];
  /** Amount in INR, never paise. */
  prices: Record<BillingPeriod, number>;
}

export const BILLING_PERIODS: BillingPeriod[] = ["6m", "12m"];

export const PERIOD_LABELS: Record<BillingPeriod, string> = {
  "6m": "6 months",
  "12m": "Yearly",
};

export const PLANS: PlanDefinition[] = [
  {
    id: "counter",
    name: "Counter",
    note: "For one location",
    description: "Run your stamp card, rewards and reviews from a single counter.",
    featured: true,
    features: [
      "Digital stamp card and counter QR",
      "Staff-verified returning visits",
      "Reward QR and redemption log",
      "Google review prompts",
      "Customer CSV export",
      "Counter and community QR codes",
    ],
    prices: { "6m": 4999, "12m": 8999 },
  },
  {
    id: "multi",
    name: "Multi-location",
    note: "Up to 5 locations",
    description: "A shared setup for businesses running more than one location.",
    featured: false,
    features: [
      "Everything in Counter",
      "Multiple business locations",
      "Central owner access",
      "Onboarding and rollout support",
    ],
    prices: { "6m": 9999, "12m": 17999 },
  },
];

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function parsePlanId(value: unknown): PlanId | null {
  return value === "counter" || value === "multi" ? value : null;
}

export function parseBillingPeriod(value: unknown): BillingPeriod | null {
  return value === "6m" || value === "12m" ? value : null;
}

/** Convert INR to paise for the Razorpay API. */
export function toPaise(amountInINR: number): number {
  return Math.round(amountInINR * 100);
}
