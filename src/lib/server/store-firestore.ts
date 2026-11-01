import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore, type Transaction } from "firebase-admin/firestore";
import { randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Business, BusinessStats, Customer, Review, StampCard, StampToken, VerificationRequest } from "@/lib/types";
import { autoFeedback } from "@/lib/review-feedback";
import {
  cardIdFor, normalizePhone, stampGuard, VERIFICATION_TTL_MS, type Store,
} from "./store";

// Production store: Firebase Admin SDK. Requires a service account in env:
//   FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY
// Writes bypass security rules by design — the rules deny all client access
// to these collections (businesses stays publicly readable).
// Owner identity comes from Firebase Id tokens verified here against
// Google's PUBLIC JWKs — signature, issuer and audience all checked, and no
// service account is needed for verification (killer for local dev too).

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

let fsDb: Firestore | null = null;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function ensureApps(): void {
  const dataApp =
    clientEmail && privateKey && projectId
      ? getApps().find((a: App) => a.name === "stamply-data") ??
        initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, "stamply-data")
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

export async function requireOwner(req: Request): Promise<string> {
  if (!projectId || !jwks) throw new Error("Owner auth is not configured.");
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) throw new Error("Sign in required.");
  const { payload } = await jwtVerify(bearer, jwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  const uid = (payload as { user_id?: string; sub?: string }).user_id ?? payload.sub;
  if (!uid) throw new Error("Invalid owner token.");
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

class FirestoreStore implements Store {
  mode = "firestore" as const;

  async getBusiness(id: string): Promise<Business | null> {
    const snap = await dataDb().collection("businesses").doc(id).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as Business) : null;
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
    await dataDb().collection("businesses").doc(b.id).set(b, { merge: true });
  }

  async findCustomerByPhone(phone: string): Promise<Customer | null> {
    const snap = await dataDb().collection("customers").where("phoneNumber", "==", normalizePhone(phone)).limit(1).get();
    return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Customer);
  }
  async findCustomerByEmail(email: string): Promise<Customer | null> {
    const snap = await dataDb().collection("customers").where("email", "==", email.toLowerCase()).limit(1).get();
    return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Customer);
  }
  async createCustomer(input: { name?: string; phoneNumber: string }): Promise<Customer> {
    const now = new Date().toISOString();
    const data = clean({
      name: input.name,
      phoneNumber: normalizePhone(input.phoneNumber),
      email: "",
      createdAt: now,
      lastVisitedAt: now,
    });
    const ref = await dataDb().collection("customers").add(data);
    return { id: ref.id, ...data };
  }

  async getCard(cardId: string): Promise<StampCard | null> {
    const snap = await dataDb().collection("stampCards").doc(cardId).get();
    return snap.exists ? ({ id: snap.id, ...snap.data() } as StampCard) : null;
  }
  async getCardFor(businessId: string, customerId: string): Promise<StampCard | null> {
    const snap = await dataDb().collection("stampCards").where("businessId", "==", businessId).where("customerId", "==", customerId).limit(1).get();
    return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as StampCard);
  }
  async getOrCreateCard(businessId: string, customerId: string): Promise<StampCard> {
    const id = cardIdFor(businessId, customerId);
    const snap = await dataDb().collection("stampCards").doc(id).get();
    if (snap.exists) return { id: snap.id, ...snap.data() } as StampCard;
    const data = { businessId, customerId, currentStamps: 0, totalRedemptions: 0, updatedAt: new Date().toISOString(), ownerToken: newOwnerToken() };
    await dataDb().collection("stampCards").doc(id).set(data);
    return { id, ...data };
  }

  /** Counter code + stamp in ONE transaction: the token is only consumed
   *  after the card passes the same guards addStamp uses. */
  async stampWithToken(businessId: string, code: string, customerId: string): Promise<StampCard | string> {
    const d = dataDb();
    const tokenRef = d.collection("stampTokens").doc(`${code.toUpperCase()}_${businessId}`);
    const cardRef = d.collection("stampCards").doc(cardIdFor(businessId, customerId));
    const business = await this.getBusiness(businessId);
    const max = maxStamps(business);
    const now = new Date().toISOString();
    try {
      return await d.runTransaction(async (tx: Transaction) => {
        const tSnap = await tx.get(tokenRef);
        if (!tSnap.exists) return "Invalid code. Ask staff for the current code.";
        const t = tSnap.data() as StampToken;
        if (t.used) return "This code has already been used.";
        if (+new Date(t.expiresAt) < Date.now()) return "This code has expired.";
        const cSnap = await tx.get(cardRef);
        let next: StampCard;
        if (cSnap.exists) {
          const existing = cSnap.data() as StampCard;
          try {
            stampGuard(existing, max);
          } catch (e) {
            return (e as Error).message;
          }
          next = { ...existing, id: cardRef.id, currentStamps: existing.currentStamps + 1, updatedAt: now, lastStampAt: now };
          tx.update(cardRef, { currentStamps: next.currentStamps, updatedAt: now, lastStampAt: now });
        } else {
          next = { id: cardRef.id, businessId, customerId, currentStamps: 1, totalRedemptions: 0, updatedAt: now, lastStampAt: now, ownerToken: newOwnerToken() };
          tx.set(cardRef, { businessId, customerId, currentStamps: 1, totalRedemptions: 0, updatedAt: now, lastStampAt: now, ownerToken: next.ownerToken });
        }
        tx.update(tokenRef, { used: true, usedByCustomerId: customerId });
        return next;
      });
    } catch (e) {
      return (e as Error).message;
    }
  }

  async addStamp(businessId: string, customerId: string): Promise<StampCard | string> {
    const d = dataDb();
    const cardRef = d.collection("stampCards").doc(cardIdFor(businessId, customerId));
    const business = await this.getBusiness(businessId);
    const max = maxStamps(business);
    const now = new Date().toISOString();
    try {
      return await d.runTransaction(async (tx: Transaction) => {
        const snap = await tx.get(cardRef);
        if (!snap.exists) {
          const data = { businessId, customerId, currentStamps: 1, totalRedemptions: 0, updatedAt: now, lastStampAt: now, ownerToken: newOwnerToken() };
          tx.set(cardRef, data);
          return { id: cardRef.id, ...data } as StampCard;
        }
        const existing = snap.data() as StampCard;
        try {
          stampGuard(existing, max);
        } catch (e) {
          return (e as Error).message;
        }
        tx.update(cardRef, { currentStamps: existing.currentStamps + 1, updatedAt: now, lastStampAt: now });
        return { ...existing, id: cardRef.id, currentStamps: existing.currentStamps + 1, updatedAt: now, lastStampAt: now };
      });
    } catch (e) {
      return (e as Error).message;
    }
  }

  async redeemReward(businessId: string, cardId: string): Promise<StampCard | string> {
    const d = dataDb();
    const card = await this.getCard(cardId);
    if (!card) return "No stamp card found for this customer.";
    if (card.businessId !== businessId) return "This card belongs to a different restaurant.";
    const business = await this.getBusiness(businessId);
    const max = maxStamps(business);
    const now = new Date().toISOString();
    const ref = d.collection("stampCards").doc(cardId);
    try {
      return await d.runTransaction(async (tx: Transaction) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return "No stamp card found for this customer.";
        const fresh = snap.data() as StampCard;
        if (fresh.currentStamps < max) return `Not enough stamps yet (${fresh.currentStamps}/${max}).`;
        tx.update(ref, { currentStamps: 0, totalRedemptions: fresh.totalRedemptions + 1, updatedAt: now });
        d.collection("visits").add({ customerId: card.customerId, businessId, timestamp: now, type: "reward_redeemed" }).catch(() => {});
        return { ...fresh, id: cardId, currentStamps: 0, totalRedemptions: fresh.totalRedemptions + 1, updatedAt: now };
      });
    } catch (e) {
      return (e as Error).message;
    }
  }

  async createToken(businessId: string): Promise<StampToken> {
    const d = dataDb();
    const token: StampToken = {
      code: Math.random().toString(36).slice(2, 8).toUpperCase(),
      businessId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
      used: false,
    };
    await d.collection("stampTokens").doc(`${token.code}_${businessId}`).set(token);
    return token;
  }
  async getToken(businessId: string, code: string): Promise<StampToken | null> {
    const snap = await dataDb().collection("stampTokens").doc(`${code.toUpperCase()}_${businessId}`).get();
    return snap.exists ? (snap.data() as StampToken) : null;
  }

  async createVerification(businessId: string, customerId: string, name: string, phone: string): Promise<VerificationRequest> {
    const d = dataDb();
    const now = new Date().toISOString();
    const data = {
      businessId,
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
    const snap = await dataDb().collection("verificationRequests").where("businessId", "==", businessId).get();
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as VerificationRequest))
      .filter((v) => v.status === "pending" && +new Date(v.expiresAt) >= cutoff)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async approveVerification(businessId: string, id: string): Promise<StampCard | string> {
    const d = dataDb();
    const ref = d.collection("verificationRequests").doc(id);
    const snap = await ref.get();
    if (!snap.exists || (snap.data() as VerificationRequest).businessId !== businessId) return "Verification request not found.";
    const v = snap.data() as VerificationRequest;
    if (v.status !== "pending") return "This request was already handled.";
    if (+new Date(v.expiresAt) < Date.now()) {
      await ref.update({ status: "rejected" });
      return "This request has expired — ask the customer to scan again.";
    }
    const res = await this.addStamp(businessId, v.customerId);
    if (typeof res === "string") return res;
    await ref.update({ status: "approved" });
    return res;
  }

  async getStats(businessId: string): Promise<BusinessStats> {
    const d = dataDb();
    const [cardsSnap, visitsSnap] = await Promise.all([
      d.collection("stampCards").where("businessId", "==", businessId).get(),
      d.collection("visits").where("businessId", "==", businessId).get(),
    ]);
    const cardMap = new Map(cardsSnap.docs.map((doc) => [doc.data().customerId, doc.data() as StampCard]));
    const allVisits = visitsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as { customerId: string; timestamp: string; type: "stamp_added" | "reward_redeemed" }) }));
    const customerIds = new Set(cardsSnap.docs.map((doc) => doc.data().customerId));
    const stamps = visitsSnap.docs.filter((doc) => doc.data().type === "stamp_added").length;
    const redemptions = visitsSnap.docs.filter((doc) => doc.data().type === "reward_redeemed").length;
    const business = await this.getBusiness(businessId);
    const required = maxStamps(business);
    const customers: Customer[] = [];
    for (const cid of customerIds) {
      const c = await d.collection("customers").doc(cid).get();
      if (c.exists) {
        const card = cardMap.get(cid);
        const customerVisits = allVisits
          .filter((v) => v.customerId === cid)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        const totalStamps = customerVisits.filter((v) => v.type === "stamp_added").length;
        customers.push({
          id: c.id,
          ...(c.data() as object),
          currentStamps: card?.currentStamps ?? 0,
          totalStamps: totalStamps,
          totalRedemptions: card?.totalRedemptions ?? 0,
          history: customerVisits.map((v) => ({ id: v.id, timestamp: v.timestamp, type: v.type })),
        } as Customer);
      }
    }
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
    const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
    const business = await this.getBusiness(businessId);
    const cSnap = await d.collection("customers").doc(input.customerId).get();
    const customer = cSnap.exists ? ({ id: cSnap.id, ...cSnap.data() } as Customer) : null;
    const review = clean({
      id: "",
      businessId,
      customerId: input.customerId,
      customerName: customer?.name,
      customerContact: (customer?.phoneNumber || customer?.email) || undefined,
      rating,
      comment: input.comment || undefined,
      autoReply: autoFeedback(business?.name ?? "us", rating),
      createdAt: new Date().toISOString(),
    }) as Review;
    let bonus: StampCard | string | null = null;
    if (rating >= 4 && input.grantBonus !== false) bonus = await this.addStamp(businessId, input.customerId);
    const ref = await d.collection("reviews").add(clean(review));
    return { review: { ...review, id: ref.id }, bonus };
  }
  async listReviews(businessId: string): Promise<Review[]> {
    const snap = await dataDb().collection("reviews").where("businessId", "==", businessId).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Review)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async countRecentBonuses(customerId: string, sinceISO: string): Promise<number> {
    const snap = await dataDb().collection("reviews").where("customerId", "==", customerId).where("rating", ">=", 4).get();
    return snap.docs.filter((doc) => (doc.data().createdAt as string) >= sinceISO).length;
  }
}

export const firestoreStore = new FirestoreStore();
