// Automated feedback shown to a customer right after they submit a review.
// Each star rating gets its own message theme, with a couple of variants so
// repeat reviewers don't always see the same line:
//  1★ bad food / bad visit  -> apology + manager escalation
//  2★ fell short            -> apology + concrete improvement promise
//  3★ good food, service lags -> balanced thanks + we'll fix service
//  4★ great visit           -> invite back for that missing star
//  5★ perfect               -> delight + see you again soon
// Rating >= 4 is considered positive: the customer is nudged to post the
// review publicly on Google.

interface RatingFeedback {
  variants: (business: string) => string;
}

const FEEDBACK: Record<number, RatingFeedback> = {
  5: {
    variants: (b) =>
      pick([
        `Wow, a perfect 5 — you just made the whole team's day! So happy the food and service both hit the mark at ${b}. See you again soon! ☕`,
        `Thank you for the 5 stars from all of us at ${b}! It means the world — we'll keep everything exactly as you loved it. See you next time! 🎉`,
        `Five stars! 🌟 The chef is smiling. Come back soon to ${b} — your next visit's on us to make it just as perfect.`,
      ]),
  },
  4: {
    variants: (b) =>
      pick([
        `Thank you for the great 4 stars! Glad you enjoyed ${b} — we're determined to earn that final star next visit, so come back and let us pamper you. 😊`,
        `Really appreciate the 4 stars! Almost perfect — what was missing, tell us next time. ${b} is worth recommending, and we'd love to host you again soon.`,
        `Lovely — thank you for the 4 stars! One more star is waiting for your next visit at ${b}. Save us a table-sized hello! ⭐`,
      ]),
  },
  3: {
    variants: (b) =>
      pick([
        `Thanks for the honest 3 stars. Glad the food hit the spot — our service clearly needs work, and we're retraining our floor team. Please give ${b} another chance! 🙏`,
        `We hear you: good food, but the service let you down at ${b}. Our manager has been informed and we're fixing this. Thank you for the honest feedback!`,
        `A fair 3 — food good, service not so much. We're sorry about the wait and we're tightening up. ${b} hopes to do much better on your next visit!`,
      ]),
  },
  2: {
    variants: (b) =>
      pick([
        `We're truly sorry your visit fell short at ${b}. Please send us a note or ask for the manager next time — we want to make it right, and we're acting on your feedback already.`,
        `Two stars tells us we let you down, and we're sorry. Your feedback has been escalated at ${b} for staff training. We'd really like the chance to do better.`,
      ]),
  },
  1: {
    variants: (b) =>
      pick([
        `One star — that's on us. Bad food and a bad experience is never acceptable, and we won't tolerate it. Your review has been sent to the owner and staff and we'll reach out to make amends. 🙏`,
        `We're very sorry about your 1-star experience at ${b}. Our serving and kitchen team will be reviewed for this. Please talk with the staff on your next visit — we'll make your next dish a good one.`,
      ]),
  },
};

// random pick keeps the replies feeling human when regulars review often
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function autoFeedback(businessName: string, rating: number): string {
  const pack = FEEDBACK[Math.min(5, Math.max(1, Math.round(rating)))] ?? FEEDBACK[3];
  return pack.variants(businessName);
}

export function isPositiveReview(rating: number): boolean {
  return rating >= 4;
}
