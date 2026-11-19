import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { Business, BusinessStats, Customer, Review, StampCard, StampToken, VerificationRequest } from "@/lib/types";
import { autoFeedback } from "@/lib/review-feedback";
import {
  businessKey, cardIdFor, customerIdForPhone, newStampCode, normalizePhone, safeDecode,
  stampGuard, tokenDocId, TOKEN_TTL_MS, VERIFICATION_TTL_MS, type Store,
} from "./store";

// Single-file store used when no Firebase service account is configured
// (local development / demo). Serializes writes through Node's event loop,
// so stamp/token mutations are effectively race-free within one process.

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

function blank() {
  return {
    businesses: [] as Business[],
    customers: [] as Customer[],
    cards: [] as StampCard[],
    visits: [] as { id: string; customerId: string; businessId: string; timestamp: string; type: "stamp_added" | "reward_redeemed" }[],
    tokens: {} as Record<string, StampToken>,
    reviews: [] as Review[],
    verifications: {} as Record<string, VerificationRequest>,
  };
}

type FileDB = ReturnType<typeof blank>;

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): string {
  return new Date().toISOString();
}

function read(): FileDB {
  if (globalThis.__loyalkardFileDb) return globalThis.__loyalkardFileDb;
  try {
    if (fsSync.existsSync(DATA_FILE)) {
      const content = fsSync.readFileSync(DATA_FILE, "utf-8");
      if (content.trim()) {
        const parsed = JSON.parse(content);
        globalThis.__loyalkardFileDb = {
          ...blank(),
          ...parsed,
          businesses: Array.isArray(parsed.businesses) ? parsed.businesses : [],
          customers: Array.isArray(parsed.customers) ? parsed.customers : [],
          cards: Array.isArray(parsed.cards) ? parsed.cards : [],
          visits: Array.isArray(parsed.visits) ? parsed.visits : [],
          tokens: parsed.tokens && typeof parsed.tokens === "object" ? parsed.tokens : {},
          reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
          verifications: parsed.verifications && typeof parsed.verifications === "object" ? parsed.verifications : {},
        };
        return globalThis.__loyalkardFileDb!;
      }
    }
  } catch (err) {
    console.error("Error reading db.json:", err);
  }
  return (globalThis.__loyalkardFileDb = blank());
}

function write(db: FileDB): void {
  globalThis.__loyalkardFileDb = db;
  fs.mkdir(DATA_DIR, { recursive: true }).then(() =>
    fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf-8")
  ).catch((err) => {
    console.error("Error writing db.json:", err);
  });
}

declare global {
  var __loyalkardFileDb: FileDB | undefined;
}

function maxStamps(b?: Business | null): number {
  return b?.loyaltyRule.requiredStamps ?? 10;
}

function newOwnerToken(): string {
  return randomBytes(24).toString("hex");
}

async function stampLog(d: FileDB, businessId: string, customerId: string, card: StampCard): Promise<StampCard> {
  const t = now();
  card.currentStamps += 1;
  card.updatedAt = t;
  card.lastStampAt = t;
  d.visits.push({ id: uid(), customerId, businessId, timestamp: t, type: "stamp_added" });
  const c = d.customers.find((x) => x.id === customerId);
  if (c) c.lastVisitedAt = t;
  write(d);
  return { ...card };
}

class FileStore implements Store {
  mode = "file" as const;

  async getBusiness(id: string): Promise<Business | null> {
    const lower = (id ?? "").toLowerCase();
    return read().businesses.find((b) => b.id === id || b.id.toLowerCase() === lower) ?? null;
  }
  async listBusinesses(): Promise<Business[]> {
    return read().businesses;
  }
  async listBusinessesByOwner(ownerId: string): Promise<Business[]> {
    return read().businesses.filter((b) => b.ownerId === ownerId);
  }
  async createBusiness(ownerId: string, name: string): Promise<Business> {
    const db = read();
    let id = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "venue";
    while (db.businesses.some((b) => b.id === id)) {
      id = `${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "venue"}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const b: Business = {
      id,
      name: name.trim(),
      ownerId,
      loyaltyRule: { requiredStamps: 10, rewardDescription: "Free coffee of your choice", expiresAt: null, minSpend: null },
      profile: { reservationsEnabled: false },
      createdAt: now(),
    };
    db.businesses.push(b);
    write(db);
    return b;
  }
  async seedDemo(): Promise<void> {
    const db = read();
    if (!db.businesses.some((b) => b.id === "demo-cafe")) {
      db.businesses.push({
        id: "demo-cafe",
        name: "Demo Café",
        loyaltyRule: { requiredStamps: 10, rewardDescription: "Free coffee of your choice", expiresAt: null, minSpend: null },
        profile: { reservationsEnabled: false },
        createdAt: now(),
      });
      write(db);
    }
  }
  async saveBusiness(b: Business, ownerId: string): Promise<void> {
    const db = read();
    const existing = db.businesses.find((x) => businessKey(x.id) === businessKey(b.id));
    if (!existing) throw new Error("Business not found.");
    if (existing.ownerId && existing.ownerId !== ownerId) throw new Error("Not your business console.");
    // Only update safe mutable fields — never allow mass-assignment of ownerId,
    // id, or createdAt (would let a caller steal or destroy the business).
    existing.name = b.name ?? existing.name;
    existing.loyaltyRule = b.loyaltyRule ?? existing.loyaltyRule;
    existing.profile = b.profile ?? existing.profile;
    if (b.logoUrl !== undefined) existing.logoUrl = b.logoUrl;
    write(db);
  }

  async findCustomerByPhone(phone: string): Promise<Customer | null> {
    const n = normalizePhone(phone);
    const customers = read().customers;
    // Primary: exact normalized match (e.g. "+15550102233" === "+15550102233")
    const exact = customers.find((c) => (c.phoneNumber ?? "").replace(/[^0-9+]/g, "") === n);
    if (exact) return exact;
    // Fallback: exact digits only, so "+15550102233" still matches
    // "15550102233". Never suffix-match: that can hand one customer's card to
    // someone with a similar-looking number.
    const queryDigits = n.replace(/\D/g, "");
    if (queryDigits.length < 7) return null;
    return customers.find((c) => {
      const stored = (c.phoneNumber ?? "").replace(/\D/g, "");
      return stored.length >= 7 && stored === queryDigits;
    }) ?? null;
  }
  async findCustomerByEmail(email: string): Promise<Customer | null> {
    return read().customers.find((c) => (c.email ?? "").toLowerCase() === email.toLowerCase()) ?? null;
  }
  async createCustomer(input: { name?: string; phoneNumber: string }): Promise<Customer> {
    return (await this.registerCustomer(input)).customer;
  }
  async registerCustomer(input: { name?: string; phoneNumber: string }): Promise<{ customer: Customer; created: boolean }> {
    const db = read();
    const phoneNumber = normalizePhone(input.phoneNumber);
    const existing = db.customers.find((c) => (c.phoneNumber ?? "") === phoneNumber);
    if (existing) return { customer: existing, created: false };
    const c: Customer = {
      id: customerIdForPhone(phoneNumber),
      name: input.name || undefined,
      phoneNumber,
      email: "",
      createdAt: now(),
      lastVisitedAt: now(),
    };
    const duplicate = db.customers.find((x) => x.id === c.id);
    if (duplicate) return { customer: duplicate, created: false };
    db.customers.push(c);
    write(db);
    return { customer: c, created: true };
  }

  async getCard(cardId: string): Promise<StampCard | null> {
    const cards = read().cards;
    const direct = cards.find((c) => c.id === cardId);
    if (direct) return direct;
    const decoded = safeDecode(cardId);
    const normalized = decoded.includes("__")
      ? `${decoded.split("__")[0].toLowerCase()}__${decoded.split("__").slice(1).join("__")}`
      : decoded;
    return cards.find((c) => c.id === decoded || c.id === normalized) ?? null;
  }
  async getCardFor(businessId: string, customerId: string): Promise<StampCard | null> {
    const bId = businessKey(businessId);
    return read().cards.find((c) => businessKey(c.businessId) === bId && c.customerId === customerId) ?? null;
  }
  async getOrCreateCard(businessId: string, customerId: string): Promise<StampCard> {
    const db = read();
    const bId = businessKey(businessId);
    let card = db.cards.find((c) => c.id === cardIdFor(bId, customerId));
    if (!card) {
      card = { id: cardIdFor(bId, customerId), businessId: bId, customerId, currentStamps: 0, totalRedemptions: 0, updatedAt: now(), ownerToken: newOwnerToken() };
      db.cards.push(card);
      write(db);
    }
    return card;
  }

  async stampWithToken(businessId: string, code: string, customerId: string): Promise<StampCard | string> {
    const db = read();
    const bId = businessKey(businessId);
    const t = db.tokens[tokenDocId(bId, code)];
    if (!t) return "Invalid code. Ask staff for the current code.";
    if (t.used || t.invalidated) return "This code has already been used.";
    if (+new Date(t.expiresAt) < Date.now()) return "This code has expired.";
    const business = db.businesses.find((b) => businessKey(b.id) === bId);
    const max = maxStamps(business);
    let card = db.cards.find((c) => c.id === cardIdFor(bId, customerId));
    if (!card) {
      card = { id: cardIdFor(bId, customerId), businessId: bId, customerId, currentStamps: 0, totalRedemptions: 0, updatedAt: now(), ownerToken: newOwnerToken() };
      db.cards.push(card);
    }
    try {
      stampGuard(card, max);
    } catch (e) {
      return (e as Error).message;
    }
    // Consume the code only after the stamp is durably written. stampGuard
    // throws before this point, so a failed stamp never burns a valid code
    // (and never mutates the cached in-memory record either).
    const updated = stampLog(db, bId, customerId, card);
    t.used = true;
    t.usedByCustomerId = customerId;
    write(db);
    return updated;
  }

  addStamp(businessId: string, customerId: string): Promise<StampCard | string> {
    return (async () => {
      const db = read();
      const bId = businessKey(businessId);
      const business = db.businesses.find((b) => businessKey(b.id) === bId);
      const max = maxStamps(business);
      const card = db.cards.find((c) => c.id === cardIdFor(bId, customerId));
      if (!card) return "This customer hasn't joined your stamp card yet — ask them to scan your counter QR first.";
      try {
        stampGuard(card, max);
      } catch (e) {
        return (e as Error).message;
      }
      // stampLog applies the +1 and the audit log in one place.
      write(db);
      return stampLog(db, bId, customerId, card);
    })();
  }

  async redeemReward(businessId: string, cardId: string): Promise<StampCard | string> {
    const db = read();
    const bId = businessKey(businessId);
    const card = await this.getCard(cardId);
    if (!card) return "No stamp card found for this customer.";
    if (businessKey(card.businessId) !== bId) return "This card belongs to a different restaurant.";
    const business = db.businesses.find((b) => businessKey(b.id) === bId);
    if (!business) return "Business not found.";
    const max = maxStamps(business);
    if (card.currentStamps < max) return `Not enough stamps yet (${card.currentStamps}/${max}).`;
    card.currentStamps = 0;
    card.totalRedemptions += 1;
    card.updatedAt = now();
    db.visits.push({ id: uid(), customerId: card.customerId, businessId: bId, timestamp: now(), type: "reward_redeemed" });
    write(db);
    return card;
  }

  async createToken(businessId: string): Promise<StampToken> {
    const db = read();
    const bId = businessKey(businessId);
    // Rotate: only the newest unused code may be valid. `invalidated` is not
    // `used` — nobody scanned these, so the console must not say they did.
    for (const [key, t] of Object.entries(db.tokens)) {
      if (businessKey(t.businessId) === bId && !t.used && !t.invalidated) {
        t.invalidated = true;
        db.tokens[key] = t;
      }
    }
    let code = newStampCode();
    while (db.tokens[tokenDocId(bId, code)]) {
      code = newStampCode();
    }
    const t: StampToken = { code, businessId: bId, expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(), used: false };
    db.tokens[tokenDocId(bId, code)] = t;
    write(db);
    return t;
  }
  async getToken(businessId: string, code: string): Promise<StampToken | null> {
    return read().tokens[tokenDocId(businessId, code)] ?? null;
  }

  async createVerification(businessId: string, customerId: string, name: string, phone: string): Promise<VerificationRequest> {
    const db = read();
    const v: VerificationRequest = {
      id: uid(),
      businessId: businessKey(businessId),
      customerId,
      name: name || "Guest",
      phone,
      status: "pending",
      createdAt: now(),
      expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS).toISOString(),
    };
    db.verifications[v.id] = v;
    write(db);
    return v;
  }
  async getVerification(id: string): Promise<VerificationRequest | null> {
    return read().verifications[id] ?? null;
  }
  async listPendingVerifications(businessId: string): Promise<VerificationRequest[]> {
    const cutoff = Date.now();
    const bId = businessKey(businessId);
    return Object.values(read().verifications)
      .filter((v) => businessKey(v.businessId) === bId && v.status === "pending" && +new Date(v.expiresAt) >= cutoff)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async approveVerification(businessId: string, id: string): Promise<StampCard | string> {
    const db = read();
    const bId = businessKey(businessId);
    const v = db.verifications[id];
    if (!v || businessKey(v.businessId) !== bId) return "Verification request not found.";
    if (v.status !== "pending") return "This request was already handled.";
    if (+new Date(v.expiresAt) < Date.now()) {
      v.status = "rejected";
      write(db);
      return "This request has expired — ask the customer to scan again.";
    }
    // addStamp runs synchronously here and re-checks the cooldown, so a double
    // click cannot grant two stamps.
    const res = await this.addStamp(bId, v.customerId);
    if (typeof res === "string") return res;
    v.status = "approved";
    write(db);
    return res;
  }

  async getStats(businessId: string): Promise<BusinessStats> {
    const db = read();
    const bId = businessKey(businessId);
    const cards = db.cards.filter((c) => businessKey(c.businessId) === bId);
    const visits = db.visits.filter((v) => businessKey(v.businessId) === bId);
    const stamps = visits.filter((v) => v.type === "stamp_added").length;
    const redemptions = visits.filter((v) => v.type === "reward_redeemed").length;
    const business = db.businesses.find((b) => businessKey(b.id) === bId);
    const required = maxStamps(business);

    const visitsByCustomer = new Map<string, typeof visits>();
    for (const v of visits) {
      const list = visitsByCustomer.get(v.customerId);
      if (list) list.push(v);
      else visitsByCustomer.set(v.customerId, [v]);
    }

    const customers: Customer[] = [];
    for (const c of db.customers) {
      const card = cards.find((card) => card.customerId === c.id);
      if (card) {
        const customerVisits = (visitsByCustomer.get(c.id) ?? []).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        const totalStamps = customerVisits.filter((v) => v.type === "stamp_added").length;
        customers.push({
          ...c,
          currentStamps: card.currentStamps,
          totalStamps,
          totalRedemptions: card.totalRedemptions,
          history: customerVisits.map((v) => ({ id: v.id, timestamp: v.timestamp, type: v.type })),
        });
      }
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
    const db = read();
    const bId = businessKey(businessId);
    const business = db.businesses.find((b) => businessKey(b.id) === bId);
    const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
    const customer = db.customers.find((c) => c.id === input.customerId) ?? null;
    // Bonus first so the review records whether it actually landed.
    let bonus: StampCard | string | null = null;
    if (rating >= 4 && input.grantBonus !== false) {
      bonus = await this.addStamp(bId, input.customerId);
    }
    const review: Review = {
      id: uid(),
      businessId: bId,
      customerId: input.customerId,
      customerName: customer?.name,
      customerContact: (customer?.phoneNumber || customer?.email) || undefined,
      rating,
      comment: input.comment || undefined,
      autoReply: autoFeedback(business?.name ?? "us", rating),
      bonusGranted: typeof bonus === "object" ? true : undefined,
      createdAt: now(),
    };
    db.reviews.push(review);
    write(db);
    return { review, bonus };
  }
  async listReviews(businessId: string): Promise<Review[]> {
    const bId = businessKey(businessId);
    return read().reviews
      .filter((r) => businessKey(r.businessId) === bId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getLastReviewFor(businessId: string, customerId: string): Promise<Review | null> {
    const bId = businessKey(businessId);
    return read().reviews
      .filter((r) => businessKey(r.businessId) === bId && r.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  }
  async countRecentBonuses(businessId: string, customerId: string, sinceISO: string): Promise<number> {
    const bId = businessKey(businessId);
    return read().reviews.filter(
      (r) => businessKey(r.businessId) === bId && r.customerId === customerId &&
        (r.bonusGranted ?? r.rating >= 4) && r.createdAt >= sinceISO
    ).length;
  }
}

export const fileStore = new FileStore();
