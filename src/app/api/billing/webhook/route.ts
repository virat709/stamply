import { NextResponse } from "next/server";
import { canTransition, dedupeKey, STATUS_BY_EVENT } from "@/lib/server/billing-policy";
import { claimWebhookEvent, getBillingRecord, saveBillingRecord } from "@/lib/server/billing-store";
import { serverError, jsonNoStore } from "@/lib/server/http";
import { verifyWebhookSignature } from "@/lib/server/razorpay";
import type { BillingPeriod, PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function unixToISO(value: unknown): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return new Date(value * 1000).toISOString();
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }
    const root = asRecord(body);
    const event = root?.event;
    const nextStatus = typeof event === "string" ? STATUS_BY_EVENT[event] : undefined;
    if (!nextStatus) return jsonNoStore({ received: true });

    const entity = asRecord(asRecord(asRecord(root?.payload)?.subscription)?.entity);
    if (!entity || typeof entity.id !== "string") return jsonNoStore({ received: true });

    const notes = asRecord(entity.notes) ?? {};
    const businessId = notes.businessId;
    if (typeof businessId !== "string" || !/^[A-Za-z0-9_-]{1,120}$/.test(businessId)) {
      return jsonNoStore({ received: true });
    }

    const currentEnd = unixToISO(entity.current_end) ?? unixToISO(entity.end_at);
    const claimed = await claimWebhookEvent(
      dedupeKey({
        eventIdHeader: req.headers.get("x-razorpay-event-id"),
        subscriptionId: entity.id,
        event: String(event),
        status: nextStatus,
        currentEnd,
      })
    );
    if (!claimed) return jsonNoStore({ received: true });

    const existing = await getBillingRecord(businessId);
    // Never let a webhook for an unknown subscription overwrite a real record.
    const matches = existing?.subscriptionId === entity.id || existing?.subscriptionId === "pending";
    if (!existing || !matches) return jsonNoStore({ received: true });
    if (!canTransition(existing.status, nextStatus)) return jsonNoStore({ received: true });

    await saveBillingRecord({
      ...existing,
      subscriptionId: entity.id,
      status: nextStatus,
      planId: (typeof notes.planId === "string" ? notes.planId : existing.planId) as PlanId,
      period: (typeof notes.period === "string" ? notes.period : existing.period) as BillingPeriod,
      currentEnd: currentEnd ?? existing.currentEnd,
      updatedAt: new Date().toISOString(),
    });
    return jsonNoStore({ received: true });
  } catch (e) {
    return serverError("billing:webhook", e);
  }
}
