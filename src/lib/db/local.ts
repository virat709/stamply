import type { Business, Customer, StampCard, VisitLog, StampToken, BusinessStats, Review, Reservation, ReservationStatus, VerificationRequest, SubmitReviewResult } from "@/lib/types";
import { autoFeedback } from "@/lib/review-feedback";

// LocalStorage-backed data store so the app runs end-to-end without Firebase.
// Mirrors the Firestore implementation in ./firebase. Same function signatures.

const KEY = "loyalkard_demo_db_v1";
const LEGACY_KEY = "stampcard_demo_db_v1";
const TOKEN_TTL_MS = 5 * 60_000;

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
    let raw = window.localStorage.getItem(KEY);
    if (!raw) {
      // Migrate the pre-rebrand demo key once, so existing local data survives.
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        raw = legacy;
        window.localStorage.setItem(KEY, legacy);
        window.localStorage.removeItem(LEGACY_KEY);
      }
    }
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

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  }
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function findLocalCustomerByPhone(phone: string): Customer | null {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  if (digits.length < 7) return null;
  return read().customers.find((c) => {
    const stored = (c.phoneNumber ?? "").replace(/\D/g, "");
    return stored.length >= 7 && stored === digits;
  }) ?? null;
}

function findLocalCustomerByEmail(email: string): Customer | null {
  return read().customers.find((c) => (c.email ?? "").toLowerCase() === email.trim().toLowerCase()) ?? null;
}

export async function listBusinesses(): Promise<Business[]> {
  return read().businesses;
}

export async function getBusiness(id: string): Promise<Business | null> {
  const lower = (id ?? "").toLowerCase();
  return read().businesses.find((b) => b.id === id || b.id.toLowerCase() === lower) ?? null;
}

export async function saveBusiness(b: Business): Promise<void> {
  const db = read();
  const i = db.businesses.findIndex((x) => x.id === b.id);
  if (i >= 0) {
    const existing = db.businesses[i];
    // Keep ownership/creation metadata out of client-controlled saves.
    db.businesses[i] = {
      ...existing,
      name: b.name ?? existing.name,
      loyaltyRule: b.loyaltyRule ?? existing.loyaltyRule,
      profile: b.profile ?? existing.profile,
      logoUrl: b.logoUrl !== undefined ? b.logoUrl : existing.logoUrl,
    };
  } else {
    db.businesses.push(b);
  }
  write(db);
}

export async function seedDemo(): Promise<void> {
  const db = read();
  if (!db.businesses.some((b) => b.id === "demo-cafe")) {
    db.businesses.push(seed().businesses[0]);
    write(db);
  }
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

export async function addStampByContact(
  businessId: string,
  contact: { phone?: string; email?: string }
): Promise<{ message: string }> {
  const customer = contact.email
    ? findLocalCustomerByEmail(contact.email)
    : findLocalCustomerByPhone(contact.phone ?? "");
  if (!customer) return { message: "Customer not found." };
  const res = await addStamp(businessId, customer.id);
  return { message: res.error ?? `Stamp added — now ${res.card.currentStamps}.` };
}

/** Local-demo mirror of the server collect flow. A returning customer gets a
 *  staff-verification request instead of immediate card access. */
export async function submitCollect(input: {
  businessId: string;
  name?: string;
  phoneNumber?: string;
  code: string | null;
}): Promise<{
  status: "registered" | "stamped" | "pending_verification";
  cardId?: string;
  customerId?: string;
  verificationId?: string;
  error?: string;
}> {
  const business = await getBusiness(input.businessId);
  if (!business) return { status: "registered", error: "This loyalty program doesn't exist." };
  const phone = normalizePhone(input.phoneNumber);
  const existing = findLocalCustomerByPhone(phone);

  if (existing) {
    const card = await getOrCreateCard(business.id, existing.id);
    const verification = await createVerificationRequest(business.id, existing.id, input.name ?? "", phone);
    return {
      status: "pending_verification",
      cardId: card.id,
      customerId: existing.id,
      verificationId: verification.id,
    };
  }

  const customer = await createCustomer({ name: input.name, phoneNumber: phone });
  const card = await getOrCreateCard(business.id, customer.id);
  let status: "registered" | "stamped" = "registered";
  let error: string | undefined;
  if (input.code) {
    const stamped = await redeemStampToken(business.id, input.code, customer.id);
    if (stamped.ok) status = "stamped";
    else error = stamped.error;
  }
  return { status, cardId: card.id, customerId: customer.id, error };
}

export async function lookupCard(businessId: string, input: string): Promise<StampCard> {
  const business = await getBusiness(businessId);
  if (!business) throw new Error("Business not found.");
  const raw = input.trim();
  if (!raw) throw new Error("Enter a card link, code, phone, or email.");
  const db = read();

  let cardId: string | null = null;
  let customerId: string | null = null;
  try {
    const parsed = JSON.parse(raw) as { cardId?: string };
    if (parsed && typeof parsed.cardId === "string") cardId = parsed.cardId;
  } catch { /* not JSON */ }
  if (!cardId) {
    const match = raw.match(/\/card\/([A-Za-z0-9_-]+)/);
    if (match) cardId = match[1];
  }
  const looksLikePhone = /^[+\s\-()0-9]{7,}$/.test(raw) && /[0-9]{7,}/.test(raw);
  if (!cardId && raw.includes("@")) customerId = findLocalCustomerByEmail(raw)?.id ?? null;
  if (!cardId && !customerId && looksLikePhone) customerId = findLocalCustomerByPhone(raw)?.id ?? null;
  if (!cardId && !customerId && !looksLikePhone && /^[A-Za-z0-9_-]+$/.test(raw)) cardId = raw;
  if (!cardId && !customerId) customerId = findLocalCustomerByPhone(raw)?.id ?? null;

  let card = cardId ? db.cards.find((c) => c.id === cardId) ?? null : null;
  if (!card && customerId) {
    card = db.cards.find((c) => c.businessId === business.id && c.customerId === customerId) ?? null;
  }
  if (!card) throw new Error("No stamp card found for that customer.");
  if (card.businessId !== business.id) throw new Error("This card belongs to a different restaurant, not yours.");
  return card;
}

export async function claimAfterVerification(verificationId: string): Promise<{ status: string; cardId?: string; error?: string }> {
  const v = await getVerificationRequest(verificationId);
  if (!v) return { status: "not_found", error: "Verification request not found." };
  if (v.status === "pending") return { status: "pending" };
  if (v.status === "rejected") return { status: "rejected", error: "Your request was rejected — please see staff." };
  if (v.status !== "approved") return { status: v.status, error: "Verification failed." };
  if (+new Date(v.expiresAt) < Date.now()) return { status: "expired", error: "Verification request has expired." };
  const card = await getCardFor(v.businessId, v.customerId);
  return card ? { status: "claimed", cardId: card.id } : { status: "not_found", error: "Stamp card not found." };
}

export async function createStampToken(businessId: string): Promise<StampToken> {
  const db = read();
  // single active token per business — rotate on each generation
  db.tokens = db.tokens.filter((t) => !(t.businessId === businessId && !t.used));
  const token: StampToken = {
    code: newCode(),
    businessId,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
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
  // Stamp first. Only consume the code if the stamp actually landed, so a
  // cooldown/full-card failure does not burn a valid counter code.
  const res = await addStamp(businessId, customerId);
  if (res.error) return { ok: false, error: res.error };
  const fresh = read();
  const freshToken = fresh.tokens.find((t) => t.businessId === businessId && t.code === code.toUpperCase());
  if (freshToken) {
    freshToken.used = true;
    freshToken.usedByCustomerId = customerId;
    write(fresh);
  }
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
  if (input.customerId) {
    const mine = db.reviews
      .filter((r) => r.customerId === input.customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const last = mine[0];
    if (last && Date.now() - +new Date(last.createdAt) < 60 * 60_000) {
      throw new Error("You've just left a review — try again later.");
    }
  }
  const recentBonus = input.customerId
    ? db.reviews.some((r) =>
        r.customerId === input.customerId &&
        r.rating >= 4 &&
        Date.now() - +new Date(r.createdAt) < 7 * 24 * 60 * 60_000
      )
    : false;
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
  // Positive reviewers earn one bonus stamp per 7 days, subject to the normal
  // cooldown/full-card guards.
  let bonus: SubmitReviewResult["bonusStamp"];
  if (rating >= 4 && input.customerId && !recentBonus) {
    bonus = await addStamp(businessId, input.customerId);
  }
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
