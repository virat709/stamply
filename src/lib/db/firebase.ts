import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, limit, runTransaction, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Business, Customer, StampCard, VisitLog, StampToken, BusinessStats, Review, Reservation, ReservationStatus, VerificationRequest, SubmitReviewResult } from "@/lib/types";
import { autoFeedback } from "@/lib/review-feedback";

function requireDb() {
  if (!db) throw new Error("Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.");
  return db;
}

// Firestore rejects undefined field values — strip them before writing.
function clean<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

const STAMP_COOLDOWN_MS = 60_000;
const COOLDOWN_MSG = "Stamp already added recently. Please wait a minute before adding another.";
const CARD_FULL_MSG = "Reward already unlocked — redeem it first!";

export async function listBusinesses(): Promise<Business[]> {
  const snap = await getDocs(collection(requireDb(), "businesses"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Business));
}

export async function getBusiness(id: string): Promise<Business | null> {
  const snap = await getDoc(doc(requireDb(), "businesses", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Business) : null;
}

export async function saveBusiness(b: Business): Promise<void> {
  await setDoc(doc(requireDb(), "businesses", b.id), b, { merge: true });
}

export async function createBusiness(ownerId: string, name: string): Promise<Business> {
  const d = requireDb();
  let id = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "venue";
  // unique doc id across restaurants with the same name
  while ((await getDoc(doc(d, "businesses", id))).exists()) {
    id = `${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "venue"}-${Math.random().toString(36).slice(2, 6)}`;
  }
  const b: Business = {
    id,
    name: name.trim(),
    ownerId,
    loyaltyRule: { requiredStamps: 10, rewardDescription: "Free coffee of your choice", expiresAt: null, minSpend: null },
    profile: { reservationsEnabled: true },
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(d, "businesses", id), b);
  return b;
}

export async function getOwnerBusinesses(ownerId: string): Promise<Business[]> {
  const snap = await getDocs(query(collection(requireDb(), "businesses"), where("ownerId", "==", ownerId)));
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Business));
}

// Identity is the phone number: store and match it normalized so forgetful
// spacing, dashes or parentheses still resolve to the same customer.
export function normalizePhone(phone?: string): string {
  return (phone ?? "").replace(/[^0-9+]/g, "");
}

export async function findCustomer(contact: { phoneNumber?: string; email?: string }): Promise<Customer | null> {
  const d = requireDb();
  let q;
  if (contact.phoneNumber) {
    q = query(collection(d, "customers"), where("phoneNumber", "==", normalizePhone(contact.phoneNumber)), limit(1));
  } else {
    q = query(collection(d, "customers"), where("email", "==", contact.email?.toLowerCase()), limit(1));
  }
  const snap = await getDocs(q);
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Customer);
}

export async function createCustomer(contact: { name?: string; phoneNumber?: string; email?: string }): Promise<Customer> {
  const now = new Date().toISOString();
  const data: Customer = {
    id: "", // replaced with the doc id below
    name: contact.name || undefined,
    phoneNumber: normalizePhone(contact.phoneNumber) || "",
    email: contact.email?.toLowerCase() || "",
    createdAt: now,
    lastVisitedAt: now,
  };
  const ref = await addDoc(collection(requireDb(), "customers"), clean(data));
  return { ...data, id: ref.id };
}

export async function touchCustomer(id: string): Promise<void> {
  await setDoc(doc(requireDb(), "customers", id), { lastVisitedAt: new Date().toISOString() }, { merge: true });
}

export async function getCard(cardId: string): Promise<StampCard | null> {
  const snap = await getDoc(doc(requireDb(), "stampCards", cardId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as StampCard) : null;
}

export async function getCardFor(businessId: string, customerId: string): Promise<StampCard | null> {
  const q = query(
    collection(requireDb(), "stampCards"),
    where("businessId", "==", businessId),
    where("customerId", "==", customerId),
    limit(1)
  );
  const snap = await getDocs(q);
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as StampCard);
}

export async function getOrCreateCard(businessId: string, customerId: string): Promise<StampCard> {
  const existing = await getCardFor(businessId, customerId);
  if (existing) return existing;
  // Deterministic doc id prevents duplicate cards when two requests race.
  const id = `${businessId}__${customerId}`;
  const ref = doc(requireDb(), "stampCards", id);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() } as StampCard;
  const data = { businessId, customerId, currentStamps: 0, totalRedemptions: 0, updatedAt: new Date().toISOString() };
  await setDoc(ref, data);
  return { id, ...data };
}

/** Whether a card snapshot may receive one more stamp, checked inside the
 *  transaction so concurrent requests can never both pass. */
function stampGuard(c: StampCard, max: number): void {
  if (c.currentStamps >= max) throw new Error(CARD_FULL_MSG);
  if (c.lastStampAt && Date.now() - +new Date(c.lastStampAt) < STAMP_COOLDOWN_MS) throw new Error(COOLDOWN_MSG);
}

/** Deterministic placeholder card for error returns (callers only read
 *  `error` on the failure path, but the shape expects a card). */
function placeholderCard(businessId: string, customerId: string): StampCard {
  return {
    id: `${businessId}__${customerId}`,
    businessId,
    customerId,
    currentStamps: 0,
    totalRedemptions: 0,
    updatedAt: new Date().toISOString(),
  };
}

/** addStamp is a transaction: read + validate + write atomically, so two
 *  simultaneous requests (counter QR + dashboard verification) can never
 *  double-apply or lose a stamp. */
export async function addStamp(businessId: string, customerId: string): Promise<{ card: StampCard; error?: string }> {
  const d = requireDb();
  const cardRef = doc(d, "stampCards", `${businessId}__${customerId}`);
  const business = await getBusiness(businessId);
  const max = business?.loyaltyRule.requiredStamps ?? 10;
  const now = new Date().toISOString();
  let card: StampCard;
  try {
    card = await runTransaction(d, async (tx) => {
      const snap = await tx.get(cardRef);
      if (!snap.exists()) {
        const data: StampCard = {
          id: cardRef.id,
          businessId,
          customerId,
          currentStamps: 1,
          totalRedemptions: 0,
          updatedAt: now,
          lastStampAt: now,
        };
        tx.set(cardRef, data);
        return data;
      }
      const existing = { id: snap.id, ...snap.data() } as StampCard;
      stampGuard(existing, max);
      tx.update(cardRef, {
        currentStamps: existing.currentStamps + 1,
        updatedAt: now,
        lastStampAt: now,
      });
      return { ...existing, currentStamps: existing.currentStamps + 1, updatedAt: now, lastStampAt: now };
    });
  } catch (e) {
    const existing = await getCardFor(businessId, customerId).catch(() => null);
    return { card: existing ?? placeholderCard(businessId, customerId), error: (e as Error).message };
  }
  // Side effects after the atomic write: audit log + last-visit touch.
  await addDoc(collection(d, "visits"), { customerId, businessId, timestamp: now, type: "stamp_added" satisfies VisitLog["type"] });
  await setDoc(doc(d, "customers", customerId), { lastVisitedAt: now }, { merge: true });
  return { card };
}

export async function redeemReward(businessId: string, customerId: string): Promise<{ card: StampCard; error?: string }> {
  const d = requireDb();
  const card = await getCardFor(businessId, customerId);
  if (!card) return { card: null as unknown as StampCard, error: "No stamp card found for this customer." };
  const business = await getBusiness(businessId);
  const max = business?.loyaltyRule.requiredStamps ?? 10;
  const now = new Date().toISOString();
  let updated: StampCard;
  // Transaction guards against a concurrent addStamp landing between the
  // check and the reset (which would silently give the reward twice).
  try {
    updated = await runTransaction(d, async (tx) => {
      const snap = await tx.get(doc(d, "stampCards", card.id));
      if (!snap.exists()) throw new Error("No stamp card found for this customer.");
      const fresh = snap.data() as StampCard;
      if (fresh.currentStamps < max) throw new Error(`Not enough stamps yet (${fresh.currentStamps}/${max}).`);
      tx.update(doc(d, "stampCards", card.id), { currentStamps: 0, totalRedemptions: fresh.totalRedemptions + 1, updatedAt: now });
      return { ...fresh, id: card.id, currentStamps: 0, totalRedemptions: fresh.totalRedemptions + 1, updatedAt: now };
    });
  } catch (e) {
    return { card, error: (e as Error).message };
  }
  await addDoc(collection(d, "visits"), { customerId, businessId, timestamp: now, type: "reward_redeemed" satisfies VisitLog["type"] });
  return { card: updated };
}

export async function createStampToken(businessId: string): Promise<StampToken> {
  const d = requireDb();
  const token: StampToken = {
    code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    businessId,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    used: false,
  };
  await setDoc(doc(d, "stampTokens", token.code + "_" + businessId), token);
  return token;
}

/** Live status of a counter code — the dashboard polls this so it can show
 *  "used ✓, refresh for the next customer" the moment a scan consumes it. */
export async function getStampToken(businessId: string, code: string): Promise<StampToken | null> {
  const snap = await getDoc(doc(requireDb(), "stampTokens", code.toUpperCase() + "_" + businessId));
  return snap.exists() ? ({ ...snap.data() } as StampToken) : null;
}

/** Consumes the counter code AND applies the stamp inside one transaction.
 *  The card is fully validated (cooldown, max stamps) before the token's
 *  used-flag flips, so an invalid stamp can never burn a valid code. */
export async function redeemStampToken(businessId: string, code: string, customerId: string) {
  const d = requireDb();
  const tokenRef = doc(d, "stampTokens", code.toUpperCase() + "_" + businessId);
  const cardRef = doc(d, "stampCards", `${businessId}__${customerId}`);
  const business = await getBusiness(businessId);
  const max = business?.loyaltyRule.requiredStamps ?? 10;
  const now = new Date().toISOString();
  let card: StampCard;
  try {
    card = await runTransaction(d, async (tx) => {
      // Validate the code first.
      const tSnap = await tx.get(tokenRef);
      if (!tSnap.exists()) throw new Error("Invalid code. Ask staff for the current code.");
      const t = tSnap.data() as StampToken;
      if (t.used) throw new Error("This code has already been used.");
      if (+new Date(t.expiresAt) < Date.now()) throw new Error("This code has expired.");
      // Then validate the stamp would succeed — BEFORE marking the token used.
      const cSnap = await tx.get(cardRef);
      let next: StampCard;
      if (cSnap.exists()) {
        const existing = { id: cSnap.id, ...cSnap.data() } as StampCard;
        stampGuard(existing, max);
        next = { ...existing, currentStamps: existing.currentStamps + 1, updatedAt: now, lastStampAt: now };
        tx.update(cardRef, { currentStamps: next.currentStamps, updatedAt: now, lastStampAt: now });
      } else {
        next = {
          id: cardRef.id,
          businessId,
          customerId,
          currentStamps: 1,
          totalRedemptions: 0,
          updatedAt: now,
          lastStampAt: now,
        };
        tx.set(cardRef, next);
      }
      // Only now consume the token — the stamp is guaranteed to land.
      tx.update(tokenRef, { used: true, usedByCustomerId: customerId });
      return next;
    });
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
  // Side effects after the atomic write (same as addStamp).
  await addDoc(collection(d, "visits"), { customerId, businessId, timestamp: now, type: "stamp_added" satisfies VisitLog["type"] });
  await setDoc(doc(d, "customers", customerId), { lastVisitedAt: now }, { merge: true });
  return { ok: true as const, card };
}

export async function getBusinessStats(businessId: string): Promise<BusinessStats> {
  const d = requireDb();
  const [cardsSnap, visitsSnap] = await Promise.all([
    getDocs(query(collection(d, "stampCards"), where("businessId", "==", businessId))),
    getDocs(query(collection(d, "visits"), where("businessId", "==", businessId))),
  ]);
  const customerIds = new Set(cardsSnap.docs.map((doc) => doc.data().customerId));
  const customers: Customer[] = [];
  for (const id of customerIds) {
    const c = await getDoc(doc(d, "customers", id));
    if (c.exists()) customers.push({ id: c.id, ...c.data() } as Customer);
  }
  const visits = visitsSnap.docs.map((doc) => doc.data() as VisitLog);
  const redemptions = visits.filter((v) => v.type === "reward_redeemed").length;
  const stamps = visits.filter((v) => v.type === "stamp_added").length;
  const business = await getBusiness(businessId);
  const required = business?.loyaltyRule.requiredStamps || 10;
  return {
    totalCustomers: customers.length,
    totalVisits: stamps,
    totalRedemptions: redemptions,
    redemptionRate: Math.min(100, Math.round((redemptions / Math.max(1, stamps / required)) * 100)),
    customers,
  };
}

// ---------- Reviews ----------

export async function submitReview(
  businessId: string,
  input: { rating: number; comment?: string; customerId?: string; cardId?: string; customerContact?: string }
): Promise<SubmitReviewResult> {
  const d = requireDb();
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const business = await getBusiness(businessId);
  const feedback = autoFeedback(business?.name ?? "us", rating);
  // save the review with the customer's name and mobile so the owner can
  // reach them on WhatsApp later
  let customer: Customer | null = null;
  if (input.customerId) {
    const snap = await getDoc(doc(d, "customers", input.customerId));
    customer = snap.exists() ? ({ id: snap.id, ...snap.data() } as Customer) : null;
  }
  const review: Omit<Review, "id"> = {
    businessId,
    customerId: input.customerId,
    customerName: customer?.name || undefined,
    customerContact: (customer?.phoneNumber || customer?.email || input.customerContact) || undefined,
    rating,
    comment: input.comment || undefined,
    autoReply: feedback,
    createdAt: new Date().toISOString(),
  };
  await addDoc(collection(d, "reviews"), clean(review));
  // positive reviewers earn a bonus stamp as a thank-you (subject to normal limits)
  let bonus: SubmitReviewResult["bonusStamp"];
  if (rating >= 4 && input.customerId) bonus = await addStamp(businessId, input.customerId);
  return {
    feedback,
    review: { id: "", ...review },
    // every reviewer can post to Google Maps via the owner's saved link
    googleUrl: business?.profile?.googleReviewUrl || undefined,
    bonusStamp: bonus,
  };
}

export async function listReviews(businessId: string): Promise<Review[]> {
  // businessId equality only — sorted client-side to avoid a composite index
  const snap = await getDocs(query(collection(requireDb(), "reviews"), where("businessId", "==", businessId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Review))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---------- Reservations ----------

export async function listReservations(businessId: string): Promise<Reservation[]> {
  const snap = await getDocs(query(collection(requireDb(), "reservations"), where("businessId", "==", businessId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Reservation))
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

export async function createReservation(
  businessId: string,
  input: { name: string; phone: string; partySize: number; scheduledFor: string; notes?: string; customerId?: string }
): Promise<Reservation> {
  const d = requireDb();
  const data: Omit<Reservation, "id"> = {
    businessId,
    customerId: input.customerId,
    name: input.name,
    phone: input.phone,
    partySize: input.partySize,
    scheduledFor: input.scheduledFor,
    notes: input.notes || undefined,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const ref = await addDoc(collection(d, "reservations"), clean(data));
  return { id: ref.id, ...data };
}

export async function setReservationStatus(businessId: string, id: string, status: ReservationStatus): Promise<void> {
  await updateDoc(doc(requireDb(), "reservations", id), { status });
}

// ---------- Stamp verification (staff approves returning customers) ----------

const VERIFICATION_TTL_MS = 5 * 60_000;

export async function createVerificationRequest(
  businessId: string,
  customerId: string,
  name: string,
  phone: string
): Promise<VerificationRequest> {
  const d = requireDb();
  const now = new Date().toISOString();
  const data: Omit<VerificationRequest, "id"> = {
    businessId,
    customerId,
    name: name || "Guest",
    phone,
    status: "pending",
    createdAt: now,
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS).toISOString(),
  };
  const ref = await addDoc(collection(d, "verificationRequests"), clean(data));
  return { id: ref.id, ...data };
}

export async function getVerificationRequest(id: string): Promise<VerificationRequest | null> {
  const snap = await getDoc(doc(requireDb(), "verificationRequests", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as VerificationRequest) : null;
}

export async function listVerificationRequests(businessId: string): Promise<VerificationRequest[]> {
  // equality filter only — status/expiry filtering and sorting done client-side
  // to avoid needing a Firestore composite index
  const snap = await getDocs(query(collection(requireDb(), "verificationRequests"), where("businessId", "==", businessId)));
  const cutoff = Date.now();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as VerificationRequest))
    .filter((v) => v.status === "pending" && +new Date(v.expiresAt) >= cutoff)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function approveVerificationRequest(businessId: string, id: string): Promise<{ ok: boolean; card?: StampCard; error?: string }> {
  const d = requireDb();
  const ref = doc(d, "verificationRequests", id);
  const snap = await getDoc(ref);
  if (!snap.exists() || snap.data().businessId !== businessId) return { ok: false, error: "Verification request not found." };
  const req = { id: snap.id, ...snap.data() } as VerificationRequest;
  if (req.status !== "pending") return { ok: false, error: "This request was already handled." };
  if (+new Date(req.expiresAt) < Date.now()) {
    await updateDoc(ref, { status: "rejected" });
    return { ok: false, error: "This request has expired — ask the customer to scan again." };
  }
  const res = await addStamp(businessId, req.customerId);
  if (res.error) return { ok: false, error: res.error };
  await updateDoc(ref, { status: "approved" });
  return { ok: true, card: res.card };
}
