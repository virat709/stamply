import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/select";
import { requireOwner } from "@/lib/server/store-firestore";
import { serverError, jsonNoStore } from "@/lib/server/http";
import { getBillingRecord, type SubscriptionStatus } from "@/lib/server/billing-store";
import type { BillingPeriod, PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

export interface BillingStatusItem {
  businessId: string;
  planId: PlanId | null;
  period: BillingPeriod | null;
  status: SubscriptionStatus | "none";
  currentEnd: string | null;
}

export type BillingStatusResponse = { subscriptions: BillingStatusItem[] };

export async function GET(req: Request) {
  try {
    let uid: string;
    try {
      uid = await requireOwner(req);
    } catch {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const businesses = await getStore().listBusinessesByOwner(uid);
    const subscriptions = await Promise.all(
      businesses.map(async (business): Promise<BillingStatusItem> => {
        const record = await getBillingRecord(business.id);
        return {
          businessId: business.id,
          planId: record?.planId ?? null,
          period: record?.period ?? null,
          status: record?.status ?? "none",
          currentEnd: record?.currentEnd ?? null,
        };
      })
    );
    return jsonNoStore({ subscriptions } satisfies BillingStatusResponse);
  } catch (e) {
    return serverError("billing:status", e);
  }
}
