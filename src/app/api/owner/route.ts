import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/select";
import { requireOwner } from "@/lib/server/store-firestore";

export const dynamic = "force-dynamic";

/** Owner gateway. Every call must carry a Firebase ID token (Header:
 *  Authorization: Bearer …) verified server-side; every business-scoped
 *  action re-checks that the caller owns that business (or that it's an
 *  ownerless demo business). */
async function guard(req: Request, businessId?: string): Promise<{ uid: string } | NextResponse> {
  try {
    const uid = await requireOwner(req);
    if (businessId) {
      const store = getStore();
      const business = await store.getBusiness(businessId);
      if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });
      if (business.ownerId && business.ownerId !== uid) {
        return NextResponse.json({ error: "This console belongs to another restaurant." }, { status: 403 });
      }
    }
    return { uid };
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? "Sign in required." }, { status: 401 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "";
  const businessId = url.searchParams.get("businessId") ?? undefined;

  try {
    if (kind === "businesses") {
      const g = await guard(req);
      if (g instanceof NextResponse) return g;
      const businesses = await getStore().listBusinessesByOwner(g.uid);
      return NextResponse.json({ businesses });
    }
    const g = businessId ? await guard(req, businessId) : NextResponse.json({ error: "businessId required." }, { status: 400 });
    if (g instanceof NextResponse) return g;
    const store = getStore();

    switch (kind) {
      case "token-status": {
        const token = await store.getToken(businessId!, url.searchParams.get("code") ?? "");
        return NextResponse.json({ token });
      }
      case "verifications":
        return NextResponse.json({ requests: await store.listPendingVerifications(businessId!) });
      case "stats":
        return NextResponse.json({ stats: await store.getStats(businessId!) });
      case "reviews":
        return NextResponse.json({ reviews: await store.listReviews(businessId!) });
      default:
        return NextResponse.json({ error: "Unknown kind." }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const businessId = body.businessId ? String(body.businessId) : undefined;
    const g = businessId ? await guard(req, businessId) : await guard(req);
    if (g instanceof NextResponse) return g;
    const { uid } = g;
    const store = getStore();

    switch (action) {
      case "create-business": {
        const name = String(body.name ?? "").trim();
        if (!name) return NextResponse.json({ error: "Enter your restaurant's name." }, { status: 400 });
        await store.seedDemo();
        const business = await store.createBusiness(uid, name);
        return NextResponse.json({ business });
      }
      case "save-business": {
        const b = body.business as Record<string, unknown>;
        if (!b || typeof b.id !== "string") return NextResponse.json({ error: "Invalid business." }, { status: 400 });
        await store.saveBusiness(b as never, uid);
        return NextResponse.json({ ok: true });
      }
      case "seed-demo": {
        await store.seedDemo();
        return NextResponse.json({ ok: true });
      }
      case "mint-token": {
        const token = await store.createToken(businessId!);
        return NextResponse.json({ token });
      }
      case "add-stamp-contact": {
        // manual stamp: look up by phone/email then stamp
        const contact = body.contact as { phoneNumber?: string; email?: string };
        const customer = contact.email
          ? await store.findCustomerByEmail(contact.email)
          : await store.findCustomerByPhone(contact.phoneNumber ?? "");
        if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
        const res = await store.addStamp(businessId!, customer.id);
        if (typeof res !== "string") return NextResponse.json({ card: res });
        return NextResponse.json({ card: await store.getCardFor(businessId!, customer.id), error: res });
      }
      case "add-stamp-customer": {
        const res = await store.addStamp(businessId!, String(body.customerId ?? ""));
        if (typeof res !== "string") return NextResponse.json({ card: res });
        return NextResponse.json({ error: res }, { status: 400 });
      }
      case "lookup-card": {
        // redeem step 1: checkout staff verify a card (via link/code or customer contact)
        const raw = String(body.input ?? "").trim();
        let cardId: string | null = null;
        let customerId: string | null = null;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.cardId === "string") cardId = parsed.cardId;
        } catch { /* not json */ }
        if (!cardId) {
          const m = raw.match(/\/card\/([A-Za-z0-9_-]+)/);
          if (m) cardId = m[1];
        }
        if (!cardId && /^[A-Za-z0-9_-]+$/.test(raw)) cardId = raw;
        if (!cardId && raw.includes("@")) {
          customerId = (await store.findCustomerByEmail(raw))?.id ?? null;
        }
        if (!cardId && raw) {
          customerId = (await store.findCustomerByPhone(raw))?.id ?? null;
        }
        let card = cardId ? await store.getCard(cardId) : null;
        if (!card && customerId) card = await store.getCardFor(businessId!, customerId);
        if (!card) return NextResponse.json({ error: raw.includes("@") || /[0-9]{5,}/.test(raw) ? "No customer found with that phone or email — check for typos (include the country code like +1)." : "This card doesn't exist. Double-check the code you pasted." }, { status: 404 });
        if (card.businessId !== businessId) return NextResponse.json({ error: "This card belongs to a different restaurant, not yours." }, { status: 403 });
        return NextResponse.json({ card: { id: card.id, currentStamps: card.currentStamps, totalRedemptions: card.totalRedemptions, customerId: card.customerId } });
      }
      case "redeem": {
        // Accept either a card id or a customer id.
        let cardId = body.cardId ? String(body.cardId) : "";
        if (!cardId && body.customerId) {
          const c = await store.getCardFor(businessId!, String(body.customerId));
          if (!c) return NextResponse.json({ error: "No stamp card found for this customer." }, { status: 404 });
          cardId = c.id;
        }
        const res = await store.redeemReward(businessId!, cardId);
        if (typeof res !== "string") return NextResponse.json({ card: res });
        return NextResponse.json({ error: res }, { status: 400 });
      }
      case "accept-verification": {
        const res = await store.approveVerification(businessId!, String(body.verificationId ?? ""));
        if (typeof res !== "string") return NextResponse.json({ ok: true, card: res });
        return NextResponse.json({ error: res }, { status: 400 });
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? "Server error" }, { status: 500 });
  }
}
