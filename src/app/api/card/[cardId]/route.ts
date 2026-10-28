import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/select";
import { getClaims } from "@/lib/server/cards-cookie";
import { requireOwner } from "@/lib/server/store-firestore";

export const dynamic = "force-dynamic";

/** Read a stamp card. Allowed only for:
 *  - the customer's own device (possession cookie token matches), or
 *  - an authenticated owner of the business (dashboard redeem flow).
 *  Card data is never world-readable. */
export async function GET(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params;
    const store = getStore();
    const card = await store.getCard(cardId);
    if (!card) return NextResponse.json({ error: "Stamp card not found." }, { status: 404 });

    const claim = getClaims(req)[card.businessId];
    let allowed = claim?.cardId === cardId && claim?.token === card.ownerToken;
    if (!allowed) {
      try {
        const uid = await requireOwner(req);
        const business = await store.getBusiness(card.businessId);
        allowed = business?.ownerId === uid;
      } catch {
        /* not an owner — allowed stays false */
      }
    }
    if (!allowed) {
      return NextResponse.json({ error: "This card is private. It opens automatically on the device where you joined." }, { status: 401 });
    }

    const business = await store.getBusiness(card.businessId);
    if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });
    // Trim the business document to public fields only.
    return NextResponse.json({
      card: { id: card.id, currentStamps: card.currentStamps, totalRedemptions: card.totalRedemptions, businessId: card.businessId },
      business: {
        id: business.id,
        name: business.name,
        loyaltyRule: business.loyaltyRule,
        profile: business.profile ?? undefined,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? "Server error" }, { status: 500 });
  }
}
