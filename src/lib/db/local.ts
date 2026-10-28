import type { Business, Customer, StampCard, VisitLog, StampToken, BusinessStats, Review, Reservation, ReservationStatus, VerificationRequest, SubmitReviewResult } from "@/lib/types";
import { autoFeedback } from "@/lib/review-feedback";

// LocalStorage-backed data store so the app runs end-to-end without Firebase.
// Mirrors the Firestore implementation in ./firebase. Same function signatures.

const KEY = "stampcard_demo_db_v1";

interface LocalDB {
  businesses: Business[];
  customers: Customer[];
  cards: StampCard[];
  visits: VisitLog[];
  tokens: StampToken[];
  reviews: Review[];
  reservations: Reservation[];
  verifications: VerificationRequest[];
  users: LocalUser[]; // demo-only account store (see src/lib/auth.ts)
}

interface LocalUser {
  id: string;
  name?: string;
  email: string;
  password: string; // demo only — real deployments use Firebase Auth
}

function seed(): LocalDB {
  const now = new Date().toISOString();
  return {
    businesses: [
      {
        id: "demo-cafe",
        name: "Demo Café",
        logoUrl: "",
        loyaltyRule: { requiredStamps: 10, rewardDescription: "Free coffee of your choice", expiresAt: null, minSpend: null },
        profile: {
          phone: "+1 555 010 2233",
          address: "12 Market Street, Springfield",
          openingHours: "Mon–Fri 7am–7pm · Sat–Sun 8am–5pm",
          websiteUrl: "",
          menuUrl: "",
          googleReviewUrl: "",
          reservationsEnabled: true,
        },
        createdAt: now,
      },
    ],
    customers: [],
    cards: [],
    visits: [],
    tokens: [],
    reviews: [],
    reservations: [],
    verifications: [],
    users: [],
  };
}

function read(): LocalDB {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw) as Partial<LocalDB>;
    // merge with seed defaults so data saved by older versions gains new stores
    const merged = { ...seed(), ...parsed } as LocalDB;
    // older businesses lack the profile block
    merged.businesses = merged.businesses.map((b) =>
      b.profile ? b : { ...b, profile: b.id === "demo-cafe" ? seed().businesses[0].profile : undefined }
    );
    return merged;
  } catch {
    return seed();
  }
}

function write(db: LocalDB) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(db));
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export async function listBusinesses(): Promise<Business[]> {
  return read().businesses;
}

export async function getBusiness(id: string): Promise<Business | null> {
  return read().businesses.find((b) => b.id === id) ?? null;
}

export async function saveBusiness(b: Business): Promise<void> {
  const db = read();
  const i = db.businesses.findIndex((x) => x.id === b.id);
  if (i >= 0) db.businesses[i] = b;
  else db.businesses.push(b);
  write(db);
}

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "venue";

export async function createBusiness(ownerId: string, name: string): Promise<Business> {
  const db = read();
  let id = slug(name);
  // keep ids unique across restaurants with the same name
  while (db.businesses.some((b) => b.id === id)) id = `${slug(name)}-${Math.random().toString(36).slice(2, 6)}`;
  const b: Business = {
    id,
    name: name.trim(),
    ownerId,
    loyaltyRule: { requiredStamps: 10, rewardDescription: "Free coffee of your choice", expiresAt: null, minSpend: null },
    profile: { reservationsEnabled: true },
    createdAt: new Date().toISOString(),
  };
  db.businesses.push(b);
  write(db);
  return b;
}

export async function getOwnerBusinesses(ownerId: string): Promise<Business[]> {
  return read().businesses.filter((b) => b.ownerId === ownerId);
}

// Identity is the phone number: store and match it normalized so forgetful
// spacing, dashes or parentheses still resolve to the same customer.
const normalizePhone = (phone?: string) => (phone ?? "").replace(/[^0-9+]/g, "");

export async function findCustomer(contact: { phoneNumber?: string; email?: string }): Promise<Customer | null> {
  const db = read();
  return (
    db.customers.find(
      (c) =>
        (contact.phoneNumber && c.phoneNumber === normalizePhone(contact.phoneNumber)) ||
        (contact.email && c.email?.toLowerCase() === contact.email.toLowerCase())
    ) ?? null
  );
}

export async function createCustomer(contact: { name?: string; phoneNumber?: string; email?: string }): Promise<Customer> {
  const db = read();
  const now = new Date().toISOString();
  const c: Customer = { id: uid(), name: contact.name || undefined, phoneNumber: normalizePhone(contact.phoneNumber) || "", email: contact.email || "", createdAt: now, lastVisitedAt: now };
  db.customers.push(c);
  write(db);
  return c;
}

export async function touchCustomer(id: string): Promise<void> {
  const db = read();
  const c = db.customers.find((x) => x.id === id);
  if (c) {
    c.lastVisitedAt = new Date().toISOString();
    write(db);
  }
}

export async function getCard(cardId: string): Promise<StampCard | null> {
  return read().cards.find((c) => c.id === cardId) ?? null;
}

export async function getCardFor(businessId: string, customerId: string): Promise<StampCard | null> {
  return read().cards.find((c) => c.businessId === businessId && c.customerId === customerId) ?? null;
}

export async function getOrCreateCard(businessId: string, customerId: string): Promise<StampCard> {
  const db = read();
  let card = db.cards.find((c) => c.businessId === businessId && c.customerId === customerId);
  if (!card) {
    card = { id: uid(), businessId, customerId, currentStamps: 0, totalRedemptions: 0, updatedAt: new Date().toISOString() };
    db.cards.push(card);
    write(db);
  }
  return card;
}

const STAMP_COOLDOWN_MS = 60_000;

export async function addStamp(businessId: string, customerId: string): Promise<{ card: StampCard; error?: string }> {
  const db = read();
  let card = db.cards.find((c) => c.businessId === businessId && c.customerId === customerId);
  if (!card) {
    card = { id: uid(), businessId, customerId, currentStamps: 0, totalRedemptions: 0, updatedAt: new Date().toISOString() };
    db.cards.push(card);
  }
  const lastStamp = [...db.visits]
    .filter((v) => v.businessId === businessId && v.customerId === customerId && v.type === "stamp_added")
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0];
  if (lastStamp && Date.now() - +new Date(lastStamp.timestamp) < STAMP_COOLDOWN_MS) {
    return { card, error: "Stamp already added recently. Please wait a minute before adding another." };
  }
  const business = db.businesses.find((b) => b.id === businessId);
  const max = business?.loyaltyRule.requiredStamps ?? 10;
  if (card.currentStamps >= max) {
    return { card, error: "Reward already unlocked — redeem it first!" };
  }
  const now = new Date().toISOString();
  card.currentStamps += 1;
  card.updatedAt = now;
  card.lastStampAt = now;
  db.visits.push({ id: uid(), customerId, businessId, timestamp: now, type: "stamp_added" });
  const customer = db.customers.find((c) => c.id === customerId);
  if (customer) customer.lastVisitedAt = now;
  write(db);
  return { card: { ...card } };
}

export async function redeemReward(businessId: string, customerId: string): Promise<{ card: StampCard; error?: string }> {
  const db = read();
  const card = db.cards.find((c) => c.businessId === businessId && c.customerId === customerId);
  if (!card) return { card: null as unknown as StampCard, error: "No stamp card found for this customer." };
  const business = db.businesses.find((b) => b.id === businessId);
  const max = business?.loyaltyRule.requiredStamps ?? 10;
  if (card.currentStamps < max) {
    return { card, error: `Not enough stamps yet (${card.currentStamps}/${max}).` };
  }
  const now = new Date().toISOString();
  card.currentStamps = 0;
  card.totalRedemptions += 1;
  card.updatedAt = now;
  db.visits.push({ id: uid(), customerId, businessId, timestamp: now, type: "reward_redeemed" });
  write(db);
  return { card: { ...card } };
}

export async function createStampToken(businessId: string): Promise<StampToken> {
  const db = read();
  // single active token per business — rotate on each generation
  db.tokens = db.tokens.filter((t) => !(t.businessId === businessId && !t.used));
  const token: StampToken = {
    code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    businessId,
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    used: false,
  };
  db.tokens.push(token);
  write(db);
  return token;
}

export async function getStampToken(businessId: string, code: string): Promise<StampToken | null> {
  const db = read();
  return db.tokens.find((t) => t.businessId === businessId && t.code === code.toUpperCase()) ?? null;
}

export async function redeemStampToken(businessId: string, code: string, customerId: string): Promise<{ ok: boolean; card?: StampCard; error?: string }> {
  const db = read();
  const token = db.tokens.find((t) => t.businessId === businessId && t.code === code.toUpperCase());
  if (!token) return { ok: false, error: "Invalid code. Ask staff for the current code." };
  if (token.used) return { ok: false, error: "This code has already been used." };
  if (+new Date(token.expiresAt) < Date.now()) return { ok: false, error: "This code has expired." };
  token.used = true;
  token.usedByCustomerId = customerId;
  write(db);
  const res = await addStamp(businessId, customerId);
  if (res.error) return { ok: false, error: res.error };
  return { ok: true, card: res.card };
}

export async function getBusinessStats(businessId: string): Promise<BusinessStats> {
  const db = read();
  const customerIds = new Set(db.cards.filter((c) => c.businessId === businessId).map((c) => c.customerId));
  const visits = db.visits.filter((v) => v.businessId === businessId);
  const redemptions = visits.filter((v) => v.type === "reward_redeemed").length;
  const stamps = visits.filter((v) => v.type === "stamp_added").length;
  const customers = db.customers.filter((c) => customerIds.has(c.id));
  return {
    totalCustomers: customers.length,
    totalVisits: visits.filter((v) => v.type === "stamp_added").length,
    totalRedemptions: redemptions,
    redemptionRate: stamps > 0 ? Math.round((redemptions / (stamps / Math.max(1, db.businesses.find((b) => b.id === businessId)?.loyaltyRule.requiredStamps || 10))) * 100) : 0,
    customers,
  };
}

// ---------- Reviews ----------

export async function listReviews(businessId: string): Promise<Review[]> {
  const db = read();
  return db.reviews
    .filter((r) => r.businessId === businessId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function submitReview(
  businessId: string,
  input: { rating: number; comment?: string; customerId?: string; cardId?: string; customerContact?: string }
): Promise<SubmitReviewResult> {
  const db = read();
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const feedback = autoFeedback(db.businesses.find((b) => b.id === businessId)?.name ?? "us", rating);
  // save the review with the customer's name and mobile so the owner can
  // reach them on WhatsApp later
  const customer = input.customerId ? db.customers.find((c) => c.id === input.customerId) : undefined;
  const review: Review = {
    id: uid(),
    businessId,
    customerId: input.customerId,
    customerName: customer?.name || undefined,
    customerContact: (customer?.phoneNumber || customer?.email || input.customerContact) || undefined,
    rating,
    comment: input.comment || undefined,
    autoReply: feedback,
    createdAt: new Date().toISOString(),
  };
  db.reviews.push(review);
  write(db);
  // positive reviewers earn a bonus stamp as a thank-you (subject to normal limits)
  let bonus: SubmitReviewResult["bonusStamp"];
  if (rating >= 4 && input.customerId) bonus = await addStamp(businessId, input.customerId);
  const business = db.businesses.find((b) => b.id === businessId);
  return {
    feedback,
    review,
    // every reviewer can post to Google Maps via the owner's saved link
    googleUrl: business?.profile?.googleReviewUrl || undefined,
    bonusStamp: bonus,
  };
}

// ---------- Reservations ----------

export async function listReservations(businessId: string): Promise<Reservation[]> {
  const db = read();
  return db.reservations
    .filter((r) => r.businessId === businessId)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
}

export async function createReservation(
  businessId: string,
  input: { name: string; phone: string; partySize: number; scheduledFor: string; notes?: string; customerId?: string }
): Promise<Reservation> {
  const db = read();
  const r: Reservation = {
    id: uid(),
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
  db.reservations.push(r);
  write(db);
  return r;
}

export async function setReservationStatus(businessId: string, id: string, status: ReservationStatus): Promise<void> {
  const db = read();
  const r = db.reservations.find((x) => x.businessId === businessId && x.id === id);
  if (r) {
    r.status = status;
    write(db);
  }
}

// ---------- Stamp verification (staff approves returning customers) ----------

const VERIFICATION_TTL_MS = 5 * 60_000;

export async function createVerificationRequest(
  businessId: string,
  customerId: string,
  name: string,
  phone: string
): Promise<VerificationRequest> {
  const db = read();
  const now = new Date().toISOString();
  const req: VerificationRequest = {
    id: uid(),
    businessId,
    customerId,
    name: name || "Guest",
    phone,
    status: "pending",
    createdAt: now,
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS).toISOString(),
  };
  db.verifications.push(req);
  write(db);
  return req;
}

export async function getVerificationRequest(id: string): Promise<VerificationRequest | null> {
  const db = read();
  return db.verifications.find((v) => v.id === id) ?? null;
}

export async function listVerificationRequests(businessId: string): Promise<VerificationRequest[]> {
  const db = read();
  const cutoff = Date.now();
  return db.verifications
    .filter((v) => v.businessId === businessId && v.status === "pending" && +new Date(v.expiresAt) >= cutoff)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function approveVerificationRequest(businessId: string, id: string): Promise<{ ok: boolean; card?: StampCard; error?: string }> {
  const db = read();
  const req = db.verifications.find((v) => v.businessId === businessId && v.id === id);
  if (!req) return { ok: false, error: "Verification request not found." };
  if (req.status !== "pending") return { ok: false, error: "This request was already handled." };
  if (+new Date(req.expiresAt) < Date.now()) {
    req.status = "rejected";
    write(db);
    return { ok: false, error: "This request has expired — ask the customer to scan again." };
  }
  // addStamp re-reads and writes the store — so re-read before marking the
  // request approved, otherwise this stale snapshot would erase the new stamp.
  const res = await addStamp(businessId, req.customerId);
  if (res.error) return { ok: false, error: res.error };
  const fresh = read();
  const freshReq = fresh.verifications.find((v) => v.id === req.id);
  if (freshReq) {
    freshReq.status = "approved";
    write(fresh);
  }
  return { ok: true, card: res.card };
}
