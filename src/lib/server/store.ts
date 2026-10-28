import type {
  Business,
  BusinessStats,
  Customer,
  Review,
  StampCard,
  StampToken,
  VerificationRequest,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Server-side trust layer. Every loyalty mutation (stamps, tokens, redemptions,
// verification approvals) happens here — never in the browser — so security
// rules and client checks cannot be bypassed from DevTools.
//
// Two store backends:
//  - "firestore": Firebase Admin SDK (requires FIREBASE_ADMIN_* service-account
//    env vars). Production mode. Admin bypasses rules by design.
//  - "file": single JSON file (.data/db.json). Zero-config local mode so the
//    app runs fully through THIS code even without a service account.
// ---------------------------------------------------------------------------

export const STAMP_COOLDOWN_MS = 60_000;
export const COOLDOWN_MSG = "Stamp already added recently. Please wait a minute before adding another.";
export const CARD_FULL_MSG = "Reward already unlocked — redeem it first!";
export const VERIFICATION_TTL_MS = 5 * 60_000;

export function cardIdFor(businessId: string, customerId: string): string {
  return `${businessId}__${customerId}`;
}

export function normalizePhone(phone?: string): string {
  return (phone ?? "").replace(/[^0-9+]/g, "");
}

/** Shared preconditions for granting a stamp. Thrown inside transactions. */
export function stampGuard(c: { currentStamps: number; lastStampAt?: string }, max: number): void {
  if (c.currentStamps >= max) throw new Error(CARD_FULL_MSG);
  if (c.lastStampAt && Date.now() - +new Date(c.lastStampAt) < STAMP_COOLDOWN_MS) throw new Error(COOLDOWN_MSG);
}

export interface CollectOutcome {
  status: "registered" | "stamped" | "pending_verification";
  cardId: string;
  customerId: string;
  verificationId?: string;
  error?: string; // e.g. token expired/used — stamp didn't land
}

export interface Store {
  mode: "file" | "firestore";
  // businesses (owned by owners; identity info is visible to customers on /b)
  getBusiness(id: string): Promise<Business | null>;
  listBusinesses(): Promise<Business[]>;
  listBusinessesByOwner(ownerId: string): Promise<Business[]>;
  createBusiness(ownerId: string, name: string): Promise<Business>;
  seedDemo(): Promise<void>;
  saveBusiness(b: Business, ownerId: string): Promise<void>;
  // customers (server-only, never exposed to clients)
  findCustomerByPhone(phone: string): Promise<Customer | null>;
  findCustomerByEmail(email: string): Promise<Customer | null>;
  createCustomer(input: { name?: string; phoneNumber: string }): Promise<Customer>;
  // cards + stamps (all mutations atomic server-side)
  getCard(cardId: string): Promise<StampCard | null>;
  getCardFor(businessId: string, customerId: string): Promise<StampCard | null>;
  getOrCreateCard(businessId: string, customerId: string): Promise<StampCard>;
  /** Validate + consume a counter code and apply the stamp in one atomic op. */
  stampWithToken(businessId: string, code: string, customerId: string): Promise<StampCard | string>;
  addStamp(businessId: string, customerId: string): Promise<StampCard | string>;
  redeemReward(businessId: string, cardId: string): Promise<StampCard | string>;
  // counter tokens
  createToken(businessId: string): Promise<StampToken>;
  getToken(businessId: string, code: string): Promise<StampToken | null>;
  // staff verification of returning customers
  createVerification(businessId: string, customerId: string, name: string, phone: string): Promise<VerificationRequest>;
  getVerification(id: string): Promise<VerificationRequest | null>;
  listPendingVerifications(businessId: string): Promise<VerificationRequest[]>;
  /** Approve + stamp; returns error string when the request/stamp is invalid. */
  approveVerification(businessId: string, id: string): Promise<StampCard | string>;
  // stats + reviews
  getStats(businessId: string): Promise<BusinessStats>;
  /** Review rate limits are enforced by the caller (route). */
  addReview(businessId: string, input: { rating: number; comment?: string; customerId: string; grantBonus?: boolean }): Promise<{ review: Review; bonus: StampCard | string | null }>;
  listReviews(businessId: string): Promise<Review[]>;
  /** Number of bonus-stamp-earning reviews this customer left in the window. */
  countRecentBonuses(customerId: string, sinceISO: string): Promise<number>;
}
