import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/select";
import { requireOwner } from "@/lib/server/store-firestore";
import { businessSaveSchema, contactLookupSchema } from "@/lib/schemas";
import { serverError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

interface GuardResult {
  uid: string;
  /** Canonical (lower-cased) business id from the stored document. */
  businessId?: string;
}

function signInRequired() {
  return NextResponse.json({ error: "Sign in required." }, { status: 401 });
}

/** Owner gateway. Every call must carry a Firebase ID token (Header:
 *  Authorization: Bearer …) verified server-side; every business-scoped
 *  action re-checks that the caller owns that business. */
async function guard(req: Request, businessId?: string): Promise<GuardResult | NextResponse> {
  const store = getStore();
  if (businessId) {
    let business = await store.getBusiness(businessId);
    if (!business && businessId === "demo-cafe") {
      await store.seedDemo();
      business = await store.getBusiness(businessId);
    }
    if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

    if (!business.ownerId) {
      // Ownerless demo business. It is intentionally public in development,
      // but a production deployment must not expose an unauthenticated console
      // (mint tokens, redeem rewards, edit the profile) to the world.
      if (process.env.NODE_ENV === "production" && process.env.LOYALKARD_ALLOW_DEMO_CONSOLE !== "1") {
        return signInRequired();
      }
      return { uid: "demo", businessId: business.id };
    }

    try {
      const uid = await requireOwner(req);
      if (business.ownerId !== uid) {
        return NextResponse.json({ error: "This console belongs to another restaurant." }, { status: 403 });
      }
      return { uid, businessId: business.id };
    } catch {
      return signInRequired();
    }
  }

  try {
    const uid = await requireOwner(req);
    return { uid };
  } catch {
    return signInRequired();
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "";
  const businessId = url.searchParams.get("businessId") ?? undefined;

  try {
    if (kind === "token-status") {
      const code = url.searchParams.get("code") ?? "";
      if (!businessId || !code) return NextResponse.json({ token: null });
      const g = await guard(req, businessId);
      if (g instanceof NextResponse) return g;
      const token = await getStore().getToken(g.businessId ?? businessId, code.slice(0, 32));
      return NextResponse.json({ token });
    }

    if (kind === "businesses") {
      const g = await guard(req);
      if (g instanceof NextResponse) return g;
      const businesses = await getStore().listBusinessesByOwner(g.uid);
      return NextResponse.json({ businesses });
    }
    const g = businessId ? await guard(req, businessId) : NextResponse.json({ error: "businessId required." }, { status: 400 });
    if (g instanceof NextResponse) return g;
    const bId = g.businessId ?? businessId!;
    const store = getStore();

    switch (kind) {
      case "verifications":
        return NextResponse.json({ requests: await store.listPendingVerifications(bId) });
      case "stats":
        return NextResponse.json({ stats: await store.getStats(bId) });
      case "reviews":
        return NextResponse.json({ reviews: await store.listReviews(bId) });
      default:
        return NextResponse.json({ error: "Unknown kind." }, { status: 400 });
    }
  } catch (e) {
    return serverError("owner:get", e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const store = getStore();

    const businessId = typeof body.businessId === "string" && body.businessId ? body.businessId : undefined;
    const effectiveBusinessId =
      action === "save-business" && typeof body.business?.id === "string"
        ? body.business.id
        : businessId;

    const KNOWN_ACTIONS = new Set([
      "create-business", "save-business", "mint-token", "add-stamp-contact",
      "add-stamp-customer", "lookup-card", "redeem", "accept-verification",
    ]);
    const BUSINESS_ACTIONS = new Set([
      "save-business", "mint-token", "add-stamp-contact", "add-stamp-customer",
      "lookup-card", "redeem", "accept-verification",
    ]);
    if (!KNOWN_ACTIONS.has(action)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    if (BUSINESS_ACTIONS.has(action) && !effectiveBusinessId) {
      return NextResponse.json({ error: "businessId is required for this action." }, { status: 400 });
    }

    const g = effectiveBusinessId ? await guard(req, effectiveBusinessId) : await guard(req);
    if (g instanceof NextResponse) return g;
    const { uid } = g;
    // Always operate on the canonical business id from the database, never on
    // the casing the browser happened to send.
    const bId = g.businessId;

    switch (action) {
      case "create-business": {
        const name = String(body.name ?? "").trim();
        if (!name) return NextResponse.json({ error: "Enter your restaurant's name." }, { status: 400 });
        if (name.length > 80) return NextResponse.json({ error: "Restaurant name must be 80 characters or fewer." }, { status: 400 });
        const existing = await store.listBusinessesByOwner(uid);
        if (existing.length >= 10) {
          return NextResponse.json({ error: "You've reached the maximum of 10 businesses per account. Delete one to create another." }, { status: 429 });
        }
        await store.seedDemo();
        const business = await store.createBusiness(uid, name);
        return NextResponse.json({ business });
      }
      case "save-business": {
        const parsed = businessSaveSchema.safeParse(body.business);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid business." }, { status: 400 });
        }
        await store.saveBusiness({ ...parsed.data, id: bId ?? parsed.data.id } as never, uid);
        return NextResponse.json({ ok: true });
      }
      case "mint-token": {
        const token = await store.createToken(bId!);
        return NextResponse.json({ token });
      }
      case "add-stamp-contact": {
        const parsed = contactLookupSchema.safeParse(body.contact);
        if (!parsed.success) {
          return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter the customer's phone or email." }, { status: 400 });
        }
        const contact = parsed.data;
        const customer = contact.email
          ? await store.findCustomerByEmail(contact.email)
          : await store.findCustomerByPhone(contact.phoneNumber ?? "");
        if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
        // Only customers who joined THIS business can be stamped. This stops
        // one owner from probing whether a phone/email belongs to a customer
        // of another restaurant (and from creating phantom cards).
        const existingCard = await store.getCardFor(bId!, customer.id);
        if (!existingCard) return NextResponse.json({ error: "This customer hasn't joined your program yet." }, { status: 404 });
        const res = await store.addStamp(bId!, customer.id);
        if (typeof res !== "string") return NextResponse.json({ card: res });
        return NextResponse.json({ card: existingCard, error: res });
      }
      case "add-stamp-customer": {
        const customerId = String(body.customerId ?? "");
        if (!customerId) return NextResponse.json({ error: "customerId is required." }, { status: 400 });
        const existingCard = await store.getCardFor(bId!, customerId);
        if (!existingCard) return NextResponse.json({ error: "This customer hasn't joined your program yet." }, { status: 404 });
        const res = await store.addStamp(bId!, customerId);
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
        // If the raw input is mostly digits (7+), treat it as a phone number first.
        // This prevents numeric phone numbers being misidentified as cardIds.
        const looksLikePhone = /^[+\s\-()0-9]{7,}$/.test(raw) && /[0-9]{7,}/.test(raw);
        if (!cardId && raw.includes("@")) {
          customerId = (await store.findCustomerByEmail(raw))?.id ?? null;
        }
        if (!cardId && !customerId && looksLikePhone) {
          customerId = (await store.findCustomerByPhone(raw))?.id ?? null;
        }
        if (!cardId && !customerId && !looksLikePhone && /^[A-Za-z0-9_-]+$/.test(raw)) cardId = raw;
        if (!cardId && !customerId && raw) {
          customerId = (await store.findCustomerByPhone(raw))?.id ?? null;
        }
        let card = cardId ? await store.getCard(cardId) : null;
        if (!card && customerId) card = await store.getCardFor(bId!, customerId);
        // A card that belongs to another restaurant is reported exactly like a
        // missing card — otherwise owners could enumerate other tenants' cards.
        if (!card || card.businessId !== bId) {
          return NextResponse.json({ error: raw.includes("@") || /[0-9]{5,}/.test(raw) ? "No customer found with that phone or email — check for typos (include the country code like +1)." : "This card doesn't exist. Double-check the code you pasted." }, { status: 404 });
        }
        return NextResponse.json({ card: { id: card.id, currentStamps: card.currentStamps, totalRedemptions: card.totalRedemptions, customerId: card.customerId } });
      }
      case "redeem": {
        // Accept either a card id or a customer id, but never redeem a card
        // that belongs to another business.
        let cardId = typeof body.cardId === "string" ? body.cardId : "";
        if (!cardId && body.customerId) {
          const c = await store.getCardFor(bId!, String(body.customerId));
          if (!c) return NextResponse.json({ error: "No stamp card found for this customer." }, { status: 404 });
          cardId = c.id;
        }
        if (!cardId) return NextResponse.json({ error: "cardId or customerId is required." }, { status: 400 });
        const card = await store.getCard(cardId);
        if (!card || card.businessId !== bId) {
          return NextResponse.json({ error: "No stamp card found for this customer." }, { status: 404 });
        }
        const res = await store.redeemReward(bId!, card.id);
        if (typeof res !== "string") return NextResponse.json({ card: res });
        return NextResponse.json({ error: res }, { status: 400 });
      }
      case "accept-verification": {
        const res = await store.approveVerification(bId!, String(body.verificationId ?? ""));
        if (typeof res !== "string") return NextResponse.json({ ok: true, card: res });
        return NextResponse.json({ error: res }, { status: 400 });
      }
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (e) {
    return serverError("owner:post", e);
  }
}
