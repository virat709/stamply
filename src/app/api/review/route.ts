import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/select";
import { getClaims } from "@/lib/server/cards-cookie";
import { reviewSchema } from "@/lib/schemas";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { serverError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;
const BONUS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // one bonus per customer per business per 7 days

/** Submit a review from a customer's card. Enforced server-side:
 *  - possession cookie required (no anonymous review spam),
 *  - max one review per customer per business per hour,
 *  - the 4★+ bonus stamp at most once per 7 days per business and never on a
 *    full card (so reviews can't farm a free card). */
export async function POST(req: Request) {
  try {
    const limit = await rateLimit(`review:${clientIp(req)}`, 30, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many reviews from this device — try again shortly." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review." }, { status: 400 });

    const store = getStore();
    const card = await store.getCard(String(body.cardId ?? ""));
    if (!card) return NextResponse.json({ error: "Stamp card not found." }, { status: 404 });

    const claims = getClaims(req);
    const claim = claims[card.businessId] || claims[card.businessId.toLowerCase()];
    const sameCard = !!claim && (claim.cardId === card.id || claim.cardId.toLowerCase() === card.id.toLowerCase());
    if (!sameCard || !claim || claim.token !== card.ownerToken) {
      return NextResponse.json({ error: "Card verification failed." }, { status: 401 });
    }

    // Targeted lookups: never download the whole review history to enforce a
    // one-hour limit.
    const lastMine = await store.getLastReviewFor(card.businessId, card.customerId);
    if (lastMine && Date.now() - +new Date(lastMine.createdAt) < HOUR_MS) {
      return NextResponse.json({ error: "You've just left a review — try again later." }, { status: 429 });
    }

    const business = await store.getBusiness(card.businessId);
    const max = business?.loyaltyRule.requiredStamps ?? 10;
    const bonusesInWindow = await store.countRecentBonuses(
      card.businessId,
      card.customerId,
      new Date(Date.now() - BONUS_WINDOW_MS).toISOString()
    );
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
      // Only claim a bonus when the stamp actually landed. A cooldown/full card
      // does not consume the 7-day window any more.
      bonusStamp: typeof bonus === "object" ? { card: bonus } : undefined,
      googleUrl: business?.profile?.googleReviewUrl || undefined,
    });
  } catch (e) {
    return serverError("review", e);
  }
}
