import fs from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { Business, BusinessStats, Customer, Review, StampCard, StampToken, VerificationRequest } from "@/lib/types";
import { autoFeedback } from "@/lib/review-feedback";
import {
  cardIdFor, normalizePhone, stampGuard, VERIFICATION_TTL_MS, type Store,
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
  return globalThis.__stamplyFileDb ?? (globalThis.__stamplyFileDb = blank());
}

function write(db: FileDB): void {
  globalThis.__stamplyFileDb = db;
  fs.mkdir(DATA_DIR, { recursive: true }).then(() =>
    fs.writeFile(DATA_FILE, JSON.stringify(db))
  ).catch(() => {});
}

declare global {
  var __stamplyFileDb: FileDB | undefined;
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
    return read().businesses.find((b) => b.id === id) ?? null;
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
    const existing = db.businesses.find((x) => x.id === b.id);
    if (!existing) throw new Error("Business not found.");
    if (existing.ownerId && existing.ownerId !== ownerId) throw new Error("Not your business console.");
    Object.assign(existing, b);
    write(db);
  }

  async findCustomerByPhone(phone: string): Promise<Customer | null> {
    const n = normalizePhone(phone);
    return read().customers.find((c) => (c.phoneNumber ?? "").replace(/[^0-9+]/g, "") === n) ?? null;
  }
  async findCustomerByEmail(email: string): Promise<Customer | null> {
    return read().customers.find((c) => (c.email ?? "").toLowerCase() === email.toLowerCase()) ?? null;
  }
  async createCustomer(input: { name?: string; phoneNumber: string }): Promise<Customer> {
    const db = read();
    const c: Customer = {
      id: uid(),
      name: input.name || undefined,
      phoneNumber: normalizePhone(input.phoneNumber),
      email: "",
      createdAt: now(),
      lastVisitedAt: now(),
    };
    db.customers.push(c);
    write(db);
    return c;
  }

  async getCard(cardId: string): Promise<StampCard | null> {
    return read().cards.find((c) => c.id === cardId) ?? null;
  }
  async getCardFor(businessId: string, customerId: string): Promise<StampCard | null> {
    return read().cards.find((c) => c.businessId === businessId && c.customerId === customerId) ?? null;
  }
  async getOrCreateCard(businessId: string, customerId: string): Promise<StampCard> {
    const db = read();
    let card = db.cards.find((c) => c.id === cardIdFor(businessId, customerId));
    if (!card) {
      card = { id: cardIdFor(businessId, customerId), businessId, customerId, currentStamps: 0, totalRedemptions: 0, updatedAt: now(), ownerToken: newOwnerToken() };
      db.cards.push(card);
      write(db);
    }
    return card;
  }

  async stampWithToken(businessId: string, code: string, customerId: string): Promise<StampCard | string> {
    const db = read();
    const key = `${code.toUpperCase()}_${businessId}`;
    const t = db.tokens[key];
    if (!t) return "Invalid code. Ask staff for the current code.";
    if (t.used) return "This code has already been used.";
    if (+new Date(t.expiresAt) < Date.now()) return "This code has expired.";
    const business = db.businesses.find((b) => b.id === businessId);
    const max = maxStamps(business);
    let card = db.cards.find((c) => c.id === cardIdFor(businessId, customerId));
    if (!card) {
      card = { id: cardIdFor(businessId, customerId), businessId, customerId, currentStamps: 0, totalRedemptions: 0, updatedAt: now(), ownerToken: newOwnerToken() };
      db.cards.push(card);
    }
    try {
      stampGuard(card, max);
    } catch (e) {
      return (e as Error).message;
    }
    t.used = true;
    t.usedByCustomerId = customerId;
    write(db);
    // stampLog applies the +1 to the untouched card state.
    return stampLog(db, businessId, customerId, card);
  }

  addStamp(businessId: string, customerId: string): Promise<StampCard | string> {
    return (async () => {
      const db = read();
      const business = db.businesses.find((b) => b.id === businessId);
      const max = maxStamps(business);
      let card = db.cards.find((c) => c.id === cardIdFor(businessId, customerId));
      if (!card) {
        card = { id: cardIdFor(businessId, customerId), businessId, customerId, currentStamps: 0, totalRedemptions: 0, updatedAt: now(), ownerToken: newOwnerToken() };
        db.cards.push(card);
      }
      try {
        stampGuard(card, max);
      } catch (e) {
        return (e as Error).message;
      }
      // stampLog applies the +1 and the audit log in one place.
      write(db);
      return stampLog(db, businessId, customerId, card);
    })();
  }

  async redeemReward(businessId: string, cardId: string): Promise<StampCard | string> {
    const db = read();
    const card = db.cards.find((c) => c.id === cardId);
    if (!card) return "No stamp card found for this customer.";
    const business = db.businesses.find((b) => b.id === businessId);
    const max = maxStamps(business);
    if (card.currentStamps < max) return `Not enough stamps yet (${card.currentStamps}/${max}).`;
    card.currentStamps = 0;
    card.totalRedemptions += 1;
    card.updatedAt = now();
    write(db);
    db.visits.push({ id: uid(), customerId: card.customerId, businessId, timestamp: now(), type: "reward_redeemed" });
    write(db);
    return card;
  }

  async createToken(businessId: string): Promise<StampToken> {
    const db = read();
    // Fresh code every mint; collision across history is astronomically unlikely
    // but the map keeps every old token so "used" stays forbidden forever.
    let code = Math.random().toString(36).slice(2, 8).toUpperCase();
    while (db.tokens[`${code}_${businessId}`]) code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const t: StampToken = { code, businessId, expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(), used: false };
    db.tokens[`${code}_${businessId}`] = t;
    write(db);
    return t;
  }
  async getToken(businessId: string, code: string): Promise<StampToken | null> {
    return read().tokens[`${code.toUpperCase()}_${businessId}`] ?? null;
  }

  async createVerification(businessId: string, customerId: string, name: string, phone: string): Promise<VerificationRequest> {
    const db = read();
    const v: VerificationRequest = {
      id: uid(),
      businessId,
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
    return Object.values(read().verifications)
      .filter((v) => v.businessId === businessId && v.status === "pending" && +new Date(v.expiresAt) >= cutoff)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async approveVerification(businessId: string, id: string): Promise<StampCard | string> {
    const db = read();
    const v = db.verifications[id];
    if (!v || v.businessId !== businessId) return "Verification request not found.";
    if (v.status !== "pending") return "This request was already handled.";
    if (+new Date(v.expiresAt) < Date.now()) {
      v.status = "rejected";
      write(db);
      return "This request has expired — ask the customer to scan again.";
    }
    const res = await this.addStamp(businessId, v.customerId);
    if (typeof res === "string") return res;
    v.status = "approved";
    write(db);
    return res;
  }

  async getStats(businessId: string): Promise<BusinessStats> {
    const db = read();
    const cards = db.cards.filter((c) => c.businessId === businessId);
    const visits = db.visits.filter((v) => v.businessId === businessId);
    const stamps = visits.filter((v) => v.type === "stamp_added").length;
    const redemptions = visits.filter((v) => v.type === "reward_redeemed").length;
    const business = db.businesses.find((b) => b.id === businessId);
    const required = maxStamps(business);
    const customers: Customer[] = [];
    for (const c of db.customers) {
      if (cards.some((card) => card.customerId === c.id)) customers.push({ ...c });
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
    const db = read();
    const business = db.businesses.find((b) => b.id === businessId);
    const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
    const customer = db.customers.find((c) => c.id === input.customerId) ?? null;
    const review: Review = {
      id: uid(),
      businessId,
      customerId: input.customerId,
      customerName: customer?.name,
      customerContact: (customer?.phoneNumber || customer?.email) || undefined,
      rating,
      comment: input.comment || undefined,
      autoReply: autoFeedback(business?.name ?? "us", rating),
      createdAt: now(),
    };
    // Bonus stamp: at most one per customer per bonus window (route checks the
    // 7-day window by calling countRecentBonuses first).
    let bonus: StampCard | string | null = null;
    if (rating >= 4 && input.grantBonus !== false) {
      bonus = await this.addStamp(businessId, input.customerId);
    }
    db.reviews.push(review);
    write(db);
    return { review, bonus };
  }
  async listReviews(businessId: string): Promise<Review[]> {
    return read().reviews
      .filter((r) => r.businessId === businessId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async countRecentBonuses(customerId: string, sinceISO: string): Promise<number> {
    return read().reviews.filter((r) => r.customerId === customerId && r.rating >= 4 && r.createdAt >= sinceISO).length;
  }
}

export const fileStore = new FileStore();
