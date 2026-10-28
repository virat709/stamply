import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/select";
import { getClaims } from "@/lib/server/cards-cookie";
import { reviewSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;
const BONUS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // one bonus stamp per customer per 7 days

/** Submit a review from a customer's card. Enforced server-side:
 *  - possession cookie required (no anonymous review spam),
 *  - max one review per customer per hour,
 *  - the 4★+ bonus stamp at most once per 7 days and never on a full card
 *    (so reviews can't farm a free card). */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review." }, { status: 400 });

    const store = getStore();
    const card = await store.getCard(String(body.cardId ?? ""));
    if (!card) return NextResponse.json({ error: "Stamp card not found." }, { status: 404 });

    const claim = getClaims(req)[card.businessId];
    if (!claim || claim.cardId !== card.id || claim.token !== card.ownerToken) {
      return NextResponse.json({ error: "Card verification failed." }, { status: 401 });
    }

    const reviews = await store.listReviews(card.businessId);
    const mine = reviews.filter((r) => r.customerId === card.customerId);
    const lastMine = mine[0];
    if (lastMine && Date.now() - +new Date(lastMine.createdAt) < HOUR_MS) {
      return NextResponse.json({ error: "You've just left a review — try again later." }, { status: 429 });
    }

    const business = await store.getBusiness(card.businessId);
    const max = business?.loyaltyRule.requiredStamps ?? 10;
    const bonusesInWindow = await store.countRecentBonuses(card.customerId, new Date(Date.now() - BONUS_WINDOW_MS).toISOString());
    const bonusEligible = parsed.data.rating >= 4 && bonusesInWindow === 0 && card.currentStamps < max;

    const { review, bonus } = await store.addReview(card.businessId, {
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      customerId: card.customerId,
      grantBonus: bonusEligible,
    });

    return NextResponse.json({
      feedback: review.autoReply,
      review: { id: review.id, rating: review.rating, comment: review.comment, createdAt: review.createdAt },
      bonusStamp: bonusEligible ? (typeof bonus === "object" ? { card: bonus } : undefined) : undefined,
      googleUrl: business?.profile?.googleReviewUrl || undefined,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? "Server error" }, { status: 500 });
  }
}
