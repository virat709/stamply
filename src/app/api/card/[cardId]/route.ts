import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/select";
import { getClaims } from "@/lib/server/cards-cookie";
import { requireOwner } from "@/lib/server/store-firestore";
import { serverError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Read a stamp card. Allowed only for:
 *  - the customer's own device (matching possession-cookie token), or
 *  - an authenticated owner of the business (dashboard redeem flow).
 *  Card data is never world-readable. */
export async function GET(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    const store = getStore();
    const card = await store.getCard(cardId);
    if (!card) return NextResponse.json({ error: "Stamp card not found." }, { status: 404 });

    const business = await store.getBusiness(card.businessId);
    if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

    const claims = getClaims(req);
    const claim = claims[card.businessId] || claims[card.businessId.toLowerCase()];
    const sameCard =
      claim?.cardId === card.id ||
      claim?.cardId?.toLowerCase() === card.id.toLowerCase();
    let allowed = !!card.ownerToken && !!claim?.token && sameCard && claim?.token === card.ownerToken;

    if (!allowed) {
      try {
        const uid = await requireOwner(req);
        allowed = business.ownerId === uid;
      } catch {
        /* not an owner — allowed stays false */
      }
    }
    if (!allowed) {
      return NextResponse.json({ error: "This card is private. It opens automatically on the device where you joined." }, { status: 401 });
    }

    const res = NextResponse.json({
      card: {
        id: card.id,
        customerId: card.customerId,
        currentStamps: card.currentStamps,
        totalRedemptions: card.totalRedemptions,
        businessId: card.businessId,
      },
      // Trim the business document to public fields only.
      business: {
        id: business.id,
        name: business.name,
        loyaltyRule: business.loyaltyRule,
        profile: business.profile ?? undefined,
      },
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    return serverError("card:get", e);
  }
}
