import { NextResponse } from "next/server";
import { z } from "zod";
import { getStore } from "@/lib/server/select";
import { requireOwner } from "@/lib/server/store-firestore";
import { serverError, jsonNoStore } from "@/lib/server/http";
import { rateLimit, clientIp } from "@/lib/server/rate-limit";
import { getBillingRecord, saveBillingRecord } from "@/lib/server/billing-store";
import { createSubscription } from "@/lib/server/razorpay";

export const dynamic = "force-dynamic";

const schema = z.object({
  planId: z.enum(["counter", "multi"]),
  period: z.enum(["6m", "12m"]),
  businessId: z.string().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  try {
    let uid: string;
    try {
      uid = await requireOwner(req);
    } catch {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const limited = await rateLimit(`billing:${uid}:${clientIp(req)}`, 10, 600_000);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many checkout attempts. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
      );
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Choose a valid plan and billing period." }, { status: 422 });
    }

    const businesses = await getStore().listBusinessesByOwner(uid);
    const { planId, period, businessId } = parsed.data;
    const business = businessId
      ? businesses.find((b) => b.id === businessId)
      : businesses.length === 1
        ? businesses[0]
        : undefined;
    if (!business) {
      return NextResponse.json(
        { error: "Create a café in your dashboard first, then choose a plan." },
        { status: 400 }
      );
    }

    const existing = await getBillingRecord(business.id);
    if (existing?.status === "active") {
      return NextResponse.json(
        { error: "This café already has an active subscription. Contact us to change plans." },
        { status: 409 }
      );
    }

    // Record the intent before calling Razorpay. If the second save fails, the
    // webhook can still heal this record using the "pending" subscription id.
    await saveBillingRecord({
      businessId: business.id,
      planId,
      period,
      subscriptionId: "pending",
      status: "pending",
      updatedAt: new Date().toISOString(),
    });
    const checkout = await createSubscription({ planId, period, businessId: business.id });
    await saveBillingRecord({
      businessId: business.id,
      planId,
      period,
      subscriptionId: checkout.subscriptionId,
      status: "created",
      updatedAt: new Date().toISOString(),
    });
    return jsonNoStore(checkout);
  } catch (e) {
    return serverError("billing:subscribe", e);
  }
}
