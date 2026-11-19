import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type DocumentReference, type Firestore, type Transaction } from "firebase-admin/firestore";
import { randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Business, BusinessStats, Customer, Review, StampCard, StampToken, VerificationRequest } from "@/lib/types";
import { autoFeedback } from "@/lib/review-feedback";
import { adminCredentials, firebasePrivateKey } from "./config";
import {
  businessKey, cardIdFor, customerIdForPhone, newStampCode, normalizePhone, safeDecode,
  stampGuard, tokenDocId, TOKEN_TTL_MS, VERIFICATION_TTL_MS, type Store,
} from "./store";

// Production store: Firebase Admin SDK. Requires a service account in env:
//   FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY
// Writes bypass security rules by design — the rules deny all client access
// to these collections (businesses stays publicly readable).
// Owner identity comes from Firebase Id tokens verified here against
// Google's PUBLIC JWKs — signature, issuer and audience all checked, and no
// service account is needed for verification (killer for local dev too).

const credentials = adminCredentials();
const projectId = credentials.projectId;
const clientEmail = credentials.clientEmail;
const privateKey = firebasePrivateKey(credentials.privateKey);

let fsDb: Firestore | null = null;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function ensureApps(): void {
  const dataApp =
    clientEmail && privateKey && projectId
      ? getApps().find((a: App) => a.name === "loyalkard-data") ??
        initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, "loyalkard-data")
      : null;
  fsDb = dataApp ? getFirestore(dataApp) : null;

  if (projectId) {
    // Firebase's public signing keys for Id tokens.
    jwks =
      jwks ??
      createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
  }
}

ensureApps();

export function hasFirestore(): boolean {
  return fsDb !== null;
}

export function dataDb(): Firestore {
  if (!fsDb) throw new Error("Server data store is not configured. Add FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY to .env.local (Firebase console → Project settings → Service accounts → Generate key).");
  return fsDb;
}

const verifiedTokenCache = new Map<string, { uid: string; exp: number }>();

export async function requireOwner(req: Request): Promise<string> {
  if (!projectId || !jwks) throw new Error("Owner auth is not configured.");
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) throw new Error("Sign in required.");

  // Fast-path in-memory cache to eliminate repetitive remote JWKS round trips
  const cached = verifiedTokenCache.get(bearer);
  const nowSec = Math.floor(Date.now() / 1000);
  if (cached && cached.exp > nowSec) {
    return cached.uid;
  }

  const { payload } = await jwtVerify(bearer, jwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  const uid = (payload as { user_id?: string; sub?: string }).user_id ?? payload.sub;
  if (!uid) throw new Error("Invalid owner token.");

  const tokenExp = typeof (payload as Record<string, unknown>).exp === "number" ? ((payload as Record<string, unknown>).exp as number) : nowSec + 300;
  verifiedTokenCache.set(bearer, { uid, exp: Math.min(tokenExp, nowSec + 300) });
  if (verifiedTokenCache.size > 1000) {
    const firstKey = verifiedTokenCache.keys().next().value;
    if (firstKey) verifiedTokenCache.delete(firstKey);
  }

  return uid;
}

function maxStamps(b?: Business | null): number {
  return b?.loyaltyRule.requiredStamps ?? 10;
}

function newOwnerToken(): string {
  return randomBytes(24).toString("hex");
}

function clean<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

const NOT_JOINED_MSG = "This customer hasn't joined your stamp card yet — ask them to scan your counter QR first.";

/** Apply one stamp inside a transaction. All reads happen before writes, so
 *  concurrent stamps/approvals cannot double-count. */
async function stampInTx(
  tx: Transaction,
  d: Firestore,
  cardRef: DocumentReference,
  businessId: string,
  customerId: string,
  max: number,
  now: string,
  createIfMissing: boolean
): Promise<StampCard | string> {
  const snap = await tx.get(cardRef);
  if (!snap.exists) {
    if (!createIfMissing) return NOT_JOINED_MSG;
    const data = {
      businessId,
      customerId,
      currentStamps: 1,
      totalRedemptions: 0,
      updatedAt: now,
      lastStampAt: now,
      ownerToken: newOwnerToken(),
    };
    tx.set(cardRef, data);
    tx.set(d.collection("visits").doc(), { customerId, businessId, timestamp: now, type: "stamp_added" });
    return { id: cardRef.id, ...data } as StampCard;
  }
  const existing = snap.data() as StampCard;
  try {
    stampGuard(existing, max);
  } catch (e) {
    return (e as Error).message;
  }
  const nextStamps = existing.currentStamps + 1;
  tx.update(cardRef, { currentStamps: nextStamps, updatedAt: now, lastStampAt: now });
  tx.set(d.collection("visits").doc(), { customerId, businessId, timestamp: now, type: "stamp_added" });
  return { ...existing, id: cardRef.id, currentStamps: nextStamps, updatedAt: now, lastStampAt: now };
}

class FirestoreStore implements Store {
  mode = "firestore" as const;

  async getBusiness(id: string): Promise<Business | null> {
    if (!id) return null;
    const canonical = businessKey(id);
    const snap = await dataDb().collection("businesses").doc(canonical).get();
    if (snap.exists) return { id: snap.id, ...snap.data() } as Business;
    if (canonical !== id) {
      // Legacy mixed-case document ids.
      const snapRaw = await dataDb().collection("businesses").doc(id).get();
      if (snapRaw.exists) return { id: snapRaw.id, ...snapRaw.data() } as Business;
    }
    return null;
  }
  async listBusinesses(): Promise<Business[]> {
    const snap = await dataDb().collection("businesses").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Business));
  }
  async listBusinessesByOwner(ownerId: string): Promise<Business[]> {
    const snap = await dataDb().collection("businesses").where("ownerId", "==", ownerId).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Business));
  }
  async createBusiness(ownerId: string, name: string): Promise<Business> {
    let id = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "venue";
    while ((await dataDb().collection("businesses").doc(id).get()).exists) {
      id = `${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "venue"}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const b: Business = {
      id,
      name: name.trim(),
      ownerId,
      loyaltyRule: { requiredStamps: 10, rewardDescription: "Free coffee of your choice", expiresAt: null, minSpend: null },
      profile: { reservationsEnabled: false },
      createdAt: new Date().toISOString(),
    };
    await dataDb().collection("businesses").doc(id).set(b);
    return b;
  }
  async seedDemo(): Promise<void> {
    const ref = dataDb().collection("businesses").doc("demo-cafe");
    if (!(await ref.get()).exists) {
      await ref.set({
        id: "demo-cafe",
        name: "Demo Café",
        loyaltyRule: { requiredStamps: 10, rewardDescription: "Free coffee of your choice", expiresAt: null, minSpend: null },
        profile: { reservationsEnabled: false },
        createdAt: new Date().toISOString(),
      });
    }
  }
  async saveBusiness(b: Business, ownerId: string): Promise<void> {
    const existing = await this.getBusiness(b.id);
    if (!existing) throw new Error("Business not found.");
    if (existing.ownerId && existing.ownerId !== ownerId) throw new Error("Not your business console.");
    // Never mass-assign the client payload: ownerId/createdAt must not be
    // mutable through the dashboard API.
    const data: Record<string, unknown> = {
      name: b.name ?? existing.name,
      loyaltyRule: b.loyaltyRule ?? existing.loyaltyRule,
    };
    if (b.profile !== undefined) data.profile = b.profile;
    if (b.logoUrl !== undefined) data.logoUrl = b.logoUrl;
    await dataDb().collection("businesses").doc(businessKey(b.id)).set(data, { merge: true });
  }

  async findCustomerByPhone(phone: string): Promise<Customer | null> {
    const raw = normalizePhone(phone);
    if (!raw) return null;
    const snap = await dataDb().collection("customers").where("phoneNumber", "==", raw).limit(1).get();
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as Customer;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 7) {
      // Exact digits only (handles a stored number missing the leading +).
      // Never suffix-match: similar numbers can belong to different people.
      for (const cand of [digits, `+${digits}`]) {
        if (cand !== raw) {
          const s = await dataDb().collection("customers").where("phoneNumber", "==", cand).limit(1).get();
          if (!s.empty) {
            return { id: s.docs[0].id, ...s.docs[0].data() } as Customer;
          }
        }
      }
    }
    return null;
  }
  async findCustomerByEmail(email: string): Promise<Customer | null> {
    const snap = await dataDb().collection("customers").where("email", "==", email.toLowerCase()).limit(1).get();
    return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Customer);
  }
  async createCustomer(input: { name?: string; phoneNumber: string }): Promise<Customer> {
    return (await this.registerCustomer(input)).customer;
  }
  async registerCustomer(input: { name?: string; phoneNumber: string }): Promise<{ customer: Customer; created: boolean }> {
    const now = new Date().toISOString();
    const phoneNumber = normalizePhone(input.phoneNumber);
    const data = clean({
      name: input.name,
      phoneNumber,
      email: "",
      createdAt: now,
      lastVisitedAt: now,
    });
    // Deterministic id: concurrent joins for the same phone converge on one
    // customer document instead of creating duplicates.
    const ref = dataDb().collection("customers").doc(customerIdForPhone(phoneNumber));
    try {
      await ref.create(data);
      return { customer: { id: ref.id, ...data }, created: true };
    } catch {
      const snap = await ref.get();
      if (snap.exists) return { customer: { id: snap.id, ...(snap.data() as object) } as Customer, created: false };
      throw new Error("Could not create the customer record.");
    }
  }

  async getCard(cardId: string): Promise<StampCard | null> {
    if (!cardId) return null;
    let snap = await dataDb().collection("stampCards").doc(cardId).get();
    if (snap.exists) return { id: snap.id, ...snap.data() } as StampCard;
    const decoded = safeDecode(cardId);
    if (decoded !== cardId) {
      snap = await dataDb().collection("stampCards").doc(decoded).get();
      if (snap.exists) return { id: snap.id, ...snap.data() } as StampCard;
    }
    const target = decoded || cardId;
    const parts = target.split("__");
    if (parts.length >= 2) {
      const norm = `${parts[0].toLowerCase()}__${parts.slice(1).join("__")}`;
      if (norm !== target) {
        snap = await dataDb().collection("stampCards").doc(norm).get();
        if (snap.exists) return { id: snap.id, ...snap.data() } as StampCard;
      }
    }
    return null;
  }
  async getCardFor(businessId: string, customerId: string): Promise<StampCard | null> {
    const bId = businessKey(businessId);
    const snap = await dataDb().collection("stampCards").where("businessId", "==", bId).where("customerId", "==", customerId).limit(1).get();
    return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as StampCard);
  }
  async getOrCreateCard(businessId: string, customerId: string): Promise<StampCard> {
    const bId = businessKey(businessId);
    const ref = dataDb().collection("stampCards").doc(cardIdFor(bId, customerId));
    const data = { businessId: bId, customerId, currentStamps: 0, totalRedemptions: 0, updatedAt: new Date().toISOString(), ownerToken: newOwnerToken() };
    // Transaction: two simultaneous joins must not overwrite each other's card
    // (and its ownerToken).
    return dataDb().runTransaction(async (tx: Transaction) => {
      const snap = await tx.get(ref);
      if (snap.exists) return { id: snap.id, ...snap.data() } as StampCard;
      tx.set(ref, data);
      return { id: ref.id, ...data } as StampCard;
    });
  }

  /** Counter code + stamp in ONE transaction: the token is only consumed
   *  after the card passes the same guards addStamp uses. */
  async stampWithToken(businessId: string, code: string, customerId: string): Promise<StampCard | string> {
    const d = dataDb();
    const bId = businessKey(businessId);
    const tokenRef = d.collection("stampTokens").doc(tokenDocId(bId, code));
    const cardRef = d.collection("stampCards").doc(cardIdFor(bId, customerId));
    const business = await this.getBusiness(bId);
    const max = maxStamps(business);
    const now = new Date().toISOString();
    try {
      return await d.runTransaction(async (tx: Transaction) => {
        const tSnap = await tx.get(tokenRef);
        if (!tSnap.exists) return "Invalid code. Ask staff for the current code.";
        const t = tSnap.data() as StampToken;
        if (t.used || t.invalidated) return "This code has already been used.";
        if (+new Date(t.expiresAt) < Date.now()) return "This code has expired.";
        const card = await stampInTx(tx, d, cardRef, bId, customerId, max, now, true);
        if (typeof card === "string") return card;
        tx.update(tokenRef, { used: true, usedByCustomerId: customerId });
        return card;
      });
    } catch (e) {
      return (e as Error).message;
    }
  }

  async addStamp(businessId: string, customerId: string): Promise<StampCard | string> {
    const d = dataDb();
    const bId = businessKey(businessId);
    const cardRef = d.collection("stampCards").doc(cardIdFor(bId, customerId));
    const business = await this.getBusiness(bId);
    const max = maxStamps(business);
    const now = new Date().toISOString();
    try {
      return await d.runTransaction(async (tx: Transaction) =>
        stampInTx(tx, d, cardRef, bId, customerId, max, now, false)
      );
    } catch (e) {
      return (e as Error).message;
    }
  }

  async redeemReward(businessId: string, cardId: string): Promise<StampCard | string> {
    const d = dataDb();
    const bId = businessKey(businessId);
    const card = await this.getCard(cardId);
    if (!card) return "No stamp card found for this customer.";
    if (card.businessId !== bId) return "This card belongs to a different restaurant.";
    const business = await this.getBusiness(bId);
    const max = maxStamps(business);
    const now = new Date().toISOString();
    // Use the resolved document id, not the raw URL/pasted value: getCard can
    // resolve encoded or differently-cased ids.
    const ref = d.collection("stampCards").doc(card.id);
    try {
      const result = await d.runTransaction(async (tx: Transaction) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return "No stamp card found for this customer.";
        const fresh = snap.data() as StampCard;
        if (fresh.currentStamps < max) return `Not enough stamps yet (${fresh.currentStamps}/${max}).`;
        tx.update(ref, { currentStamps: 0, totalRedemptions: fresh.totalRedemptions + 1, updatedAt: now });
        return { ...fresh, id: ref.id, currentStamps: 0, totalRedemptions: fresh.totalRedemptions + 1, updatedAt: now };
      });
      if (typeof result !== "string") {
        // Audit log after the commit so a transaction retry can't duplicate it.
        await d.collection("visits").add({ customerId: card.customerId, businessId: bId, timestamp: now, type: "reward_redeemed" }).catch(() => {});
      }
      return result;
    } catch (e) {
      return (e as Error).message;
    }
  }

  async createToken(businessId: string): Promise<StampToken> {
    const d = dataDb();
    const bId = businessKey(businessId);
    // Rotate: retire every live code for this business before issuing a new
    // one, so a screenshot of an old QR cannot be reused. `invalidated` is
    // deliberately separate from `used` so the console doesn't claim a
    // customer collected a stamp when staff simply refreshed.
    const existing = await d.collection("stampTokens").where("businessId", "==", bId).get();
    const batch = d.batch();
    let writes = 0;
    for (const doc of existing.docs) {
      const t = doc.data() as StampToken;
      if (!t.used && !t.invalidated) {
        batch.update(doc.ref, { invalidated: true });
        writes++;
      }
    }
    if (writes > 0) await batch.commit();

    let code = newStampCode();
    while ((await d.collection("stampTokens").doc(tokenDocId(bId, code)).get()).exists) {
      code = newStampCode();
    }
    const token: StampToken = {
      code,
      businessId: bId,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      used: false,
    };
    await d.collection("stampTokens").doc(tokenDocId(bId, code)).set(token);
    return token;
  }
  async getToken(businessId: string, code: string): Promise<StampToken | null> {
    const snap = await dataDb().collection("stampTokens").doc(tokenDocId(businessId, code)).get();
    return snap.exists ? (snap.data() as StampToken) : null;
  }

  async createVerification(businessId: string, customerId: string, name: string, phone: string): Promise<VerificationRequest> {
    const d = dataDb();
    const now = new Date().toISOString();
    const data = {
      businessId: businessKey(businessId),
      customerId,
      name: name || "Guest",
      phone,
      status: "pending" as const,
      createdAt: now,
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS).toISOString(),
    };
    const ref = await d.collection("verificationRequests").add(clean(data));
    return { id: ref.id, ...data };
  }
  async getVerification(id: string): Promise<VerificationRequest | null> {
    const snap = await dataDb().collection("verificationRequests").doc(id).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as VerificationRequest) : null;
  }
  async listPendingVerifications(businessId: string): Promise<VerificationRequest[]> {
    const cutoff = Date.now();
    const snap = await dataDb()
      .collection("verificationRequests")
      .where("businessId", "==", businessKey(businessId))
      .where("status", "==", "pending")
      .limit(200)
      .get();
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as VerificationRequest))
      .filter((v) => +new Date(v.expiresAt) >= cutoff)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async approveVerification(businessId: string, id: string): Promise<StampCard | string> {
    const d = dataDb();
    const bId = businessKey(businessId);
    const ref = d.collection("verificationRequests").doc(id);
    const business = await this.getBusiness(bId);
    const max = maxStamps(business);
    const now = new Date().toISOString();
    try {
      // Status check, card stamp and status write all commit together, so two
      // simultaneous approvals cannot both grant a stamp.
      return await d.runTransaction(async (tx: Transaction) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return "Verification request not found.";
        const v = snap.data() as VerificationRequest;
        if (businessKey(v.businessId) !== bId) return "Verification request not found.";
        if (v.status !== "pending") return "This request was already handled.";
        if (+new Date(v.expiresAt) < Date.now()) {
          tx.update(ref, { status: "rejected" });
          return "This request has expired — ask the customer to scan again.";
        }
        const cardRef = d.collection("stampCards").doc(cardIdFor(bId, v.customerId));
        const card = await stampInTx(tx, d, cardRef, bId, v.customerId, max, now, false);
        if (typeof card === "string") return card;
        tx.update(ref, { status: "approved" });
        return card;
      });
    } catch (e) {
      return (e as Error).message;
    }
  }

  async getStats(businessId: string): Promise<BusinessStats> {
    const d = dataDb();
    const bId = businessKey(businessId);
    const [cardsSnap, visitsSnap] = await Promise.all([
      d.collection("stampCards").where("businessId", "==", bId).limit(5000).get(),
      d.collection("visits").where("businessId", "==", bId).limit(5000).get(),
    ]);
    const cardMap = new Map(cardsSnap.docs.map((doc) => [doc.data().customerId, doc.data() as StampCard]));
    const allVisits = visitsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as { customerId: string; timestamp: string; type: "stamp_added" | "reward_redeemed" }) }));
    const stamps = allVisits.filter((v) => v.type === "stamp_added").length;
    const redemptions = allVisits.filter((v) => v.type === "reward_redeemed").length;
    const business = await this.getBusiness(bId);
    const required = maxStamps(business);

    // Group visits once instead of scanning the whole list per customer.
    const visitsByCustomer = new Map<string, typeof allVisits>();
    for (const v of allVisits) {
      const list = visitsByCustomer.get(v.customerId);
      if (list) list.push(v);
      else visitsByCustomer.set(v.customerId, [v]);
    }

    // One batched read per 500 customers instead of one round-trip per customer.
    const customerIds = [...cardMap.keys()];
    const snaps = [];
    for (let i = 0; i < customerIds.length; i += 500) {
      const refs = customerIds.slice(i, i + 500).map((cid) => d.collection("customers").doc(cid));
      snaps.push(...(await d.getAll(...refs)));
    }

    const customers: Customer[] = [];
    for (const c of snaps) {
      if (!c.exists) continue;
      const card = cardMap.get(c.id);
      const customerVisits = (visitsByCustomer.get(c.id) ?? []).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      const totalStamps = customerVisits.filter((v) => v.type === "stamp_added").length;
      customers.push({
        id: c.id,
        ...(c.data() as object),
        currentStamps: card?.currentStamps ?? 0,
        totalStamps,
        totalRedemptions: card?.totalRedemptions ?? 0,
        history: customerVisits.map((v) => ({ id: v.id, timestamp: v.timestamp, type: v.type })),
      } as Customer);
    }
    customers.sort((a, b) => (b.lastVisitedAt ?? "").localeCompare(a.lastVisitedAt ?? ""));

    return {
      totalCustomers: customers.length,
      totalVisits: stamps,
      totalRedemptions: redemptions,
      redemptionRate: Math.min(100, Math.round((redemptions / Math.max(1, stamps / required)) * 100)),
      customers,
    };
  }

  async addReview(businessId: string, input: { rating: number; comment?: string; customerId: string; grantBonus?: boolean }): Promise<{ review: Review; bonus: StampCard | string | null }> {
    const d = dataDb();
    const bId = businessKey(businessId);
    const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
    const business = await this.getBusiness(bId);
    const cSnap = await d.collection("customers").doc(input.customerId).get();
    const customer = cSnap.exists ? ({ id: cSnap.id, ...cSnap.data() } as Customer) : null;

    // Try the bonus first so the stored review records whether it actually
    // landed. A cooldown/full-card failure must not burn the 7-day allowance.
    let bonus: StampCard | string | null = null;
    if (rating >= 4 && input.grantBonus !== false) bonus = await this.addStamp(bId, input.customerId);

    const review = clean({
      businessId: bId,
      customerId: input.customerId,
      customerName: customer?.name,
      customerContact: (customer?.phoneNumber || customer?.email) || undefined,
      rating,
      comment: input.comment || undefined,
      autoReply: autoFeedback(business?.name ?? "us", rating),
      bonusGranted: typeof bonus === "object" ? true : undefined,
      createdAt: new Date().toISOString(),
    }) as Omit<Review, "id">;
    const ref = await d.collection("reviews").add(review);
    return { review: { ...review, id: ref.id }, bonus };
  }
  async listReviews(businessId: string): Promise<Review[]> {
    const snap = await dataDb()
      .collection("reviews")
      .where("businessId", "==", businessKey(businessId))
      .limit(500)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Review)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getLastReviewFor(businessId: string, customerId: string): Promise<Review | null> {
    const snap = await dataDb()
      .collection("reviews")
      .where("businessId", "==", businessKey(businessId))
      .where("customerId", "==", customerId)
      .limit(50)
      .get();
    if (snap.empty) return null;
    const reviews = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Review));
    reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return reviews[0] ?? null;
  }
  async countRecentBonuses(businessId: string, customerId: string, sinceISO: string): Promise<number> {
    const snap = await dataDb()
      .collection("reviews")
      .where("businessId", "==", businessKey(businessId))
      .where("customerId", "==", customerId)
      .limit(100)
      .get();
    return snap.docs.filter((doc) => {
      const r = doc.data() as Review;
      return (r.bonusGranted ?? r.rating >= 4) && r.createdAt >= sinceISO;
    }).length;
  }
}

export const firestoreStore = new FirestoreStore();
