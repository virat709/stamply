import { getBillingRecord } from "./billing-store";

/** Optional hard paywall. Off by default so existing cafés are not locked out
 *  when billing ships; set BILLING_ENFORCE=1 to require an active subscription
 *  for console actions. The public demo is always exempt. */
export function billingEnforced(): boolean {
  return process.env.BILLING_ENFORCE === "1";
}

export async function billingAllows(businessId: string): Promise<boolean> {
  if (!billingEnforced()) return true;
  if (businessId === "demo-cafe") return true;
  const record = await getBillingRecord(businessId);
  return record?.status === "active";
}
