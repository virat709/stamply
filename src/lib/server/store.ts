import { createHash, randomBytes } from "node:crypto";
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
export const TOKEN_TTL_MS = 5 * 60_000;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Six-character counter code from a CSPRNG (32^6 ≈ 1.07 billion). */
export function newStampCode(): string {
  return Array.from(randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function cardIdFor(businessId: string, customerId: string): string {
  return `${businessId}__${customerId}`;
}

/** One canonical form for a business id. Used for token documents so a
 *  capitalised dashboard URL can never mint a code the join flow can't read. */
export function businessKey(businessId: string): string {
  return (businessId ?? "").trim().toLowerCase();
}

/** Document id for a counter code. Always canonical so mint/read/consume all
 *  agree on the same key. */
export function tokenDocId(businessId: string, code: string): string {
  return `${(code ?? "").trim().toUpperCase()}_${businessKey(businessId)}`;
}

/** Deterministic customer id derived from the normalised phone number. Two
 *  concurrent joins for the same number therefore resolve to the same
 *  document instead of creating duplicates. */
export function customerIdForPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `c_${digest.slice(0, 24)}`;
}

/** decodeURIComponent that never throws on a malformed route param. */
export function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
  /** Create only if the phone number is unknown. `created: false` means a
   *  concurrent request won the race — the caller must use the returning-
   *  customer (verification) flow, never grant a claim. */
  registerCustomer(input: { name?: string; phoneNumber: string }): Promise<{ customer: Customer; created: boolean }>;
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
  /** Most recent review this customer left for this business. */
  getLastReviewFor(businessId: string, customerId: string): Promise<Review | null>;
  /** Bonus stamps actually granted to this customer at this business inside
   *  the window. Failed bonus attempts must not consume the allowance. */
  countRecentBonuses(businessId: string, customerId: string, sinceISO: string): Promise<number>;
}
