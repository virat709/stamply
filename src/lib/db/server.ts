"use client";

import { auth, isFirebaseConfigured, db as fsClient } from "@/lib/firebase";
import { getDoc, doc } from "firebase/firestore";
import type {
  Business, BusinessStats, Customer, Review, StampCard, StampToken,
  VerificationRequest, SubmitReviewResult,
} from "@/lib/types";
// Client shim for the server-side DB. When Firebase is configured the app
// talks ONLY to /api/* routes (trusting the server, not the browser); with no
// Firebase keys the app stays on the localStorage demo (db/local.ts).

async function authHeader(): Promise<Record<string, string>> {
  if (isFirebaseConfigured && auth) {
    try {
      if (typeof auth.authStateReady === "function") {
        await auth.authStateReady();
      }
      if (auth.currentUser) {
        return { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` };
      }
    } catch {
      /* fall through */
    }
  }
  return {};
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(await authHeader()), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const e = new Error(data.error ?? "Request failed. Check your connection.") as Error & { status?: number };
    e.status = res.status;
    throw e;
  }
  return data;
}

const post = <T>(path: string, body: unknown, headers?: Record<string, string>) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body), headers });

// ---------------- businesses ----------------

export async function getBusiness(id: string): Promise<Business | null> {
  if (!id) return null;
  try {
    const { business } = await api<{ business: Business }>(`/api/business/${encodeURIComponent(id)}`);
    if (business) return business;
  } catch {
    /* fallback to direct firestore read if API route fails */
  }
  try {
    // Public read fallback — straight from Firestore (if client firestore is populated)
    if (fsClient) {
      const snap = await getDoc(doc(fsClient, "businesses", id));
      if (snap.exists()) return { id: snap.id, ...snap.data() } as Business;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export const listBusinesses = async (): Promise<Business[]> => {
  throw new Error("listBusinesses is not available in server mode.");
};

export async function getOwnerBusinesses(_ownerId?: string): Promise<Business[]> {
  void _ownerId;
  const { businesses } = await api<{ businesses: Business[] }>("/api/owner?kind=businesses");
  return businesses ?? [];
}

export async function createBusiness(_ownerId: string, name: string): Promise<Business> {
  // Owner identity comes from the auth header server-side.
  void _ownerId;
  const { business } = await post<{ business: Business }>("/api/owner", { action: "create-business", name });
  return business;
}

export async function saveBusiness(b: Business): Promise<void> {
  // Send only mutable fields; ownership/creation metadata is server-owned.
  const business: Record<string, unknown> = {
    id: b.id,
    name: b.name,
    loyaltyRule: b.loyaltyRule,
  };
  if (b.logoUrl !== undefined) business.logoUrl = b.logoUrl;
  if (b.profile !== undefined) business.profile = b.profile;
  await post("/api/owner", { action: "save-business", business });
}

// ---------------- customers + cards ----------------

export async function findCustomer(_contact: { phoneNumber?: string; email?: string }): Promise<Customer | null> {
  // Lookup now happens inside owner actions; the shim keeps the old shape for
  // callers that still use it, routed through the owner gateway.
  void _contact;
  throw new Error("Use the owner gateway (lookup actions) in server mode.");
}

export const createCustomer = async (): Promise<Customer> => {
  throw new Error("Use /api/collect in server mode.");
};

export const touchCustomer = async (): Promise<void> => {};

export async function getCard(cardId: string): Promise<StampCard> {
  const { card } = await api<{ card: StampCard }>(`/api/card/${encodeURIComponent(cardId)}`);
  return { ...card, customerId: (card as StampCard & { customerId?: string }).customerId ?? "", businessId: card.businessId };
}
export async function getCardFor(_businessId: string, _customerId: string): Promise<StampCard | null> {
  void _businessId;
  void _customerId;
  throw new Error("Use owner lookup-card in server mode.");
}

export const getOrCreateCard = async (): Promise<StampCard> => {
  throw new Error("Use /api/collect in server mode.");
};

/** POST /api/collect — the whole join/collect flow, server-validated. */
export async function submitCollect(input: { businessId: string; name?: string; phoneNumber?: string; code: string | null }): Promise<{
  status: "registered" | "stamped" | "pending_verification";
  cardId?: string;
  customerId?: string;
  verificationId?: string;
  error?: string;
}> {
  return post("/api/collect", { ...input, code: input.code ?? null });
}

// ---------------- stamps + rewards ----------------

export async function addStamp(businessId: string, customerId: string): Promise<{ card: StampCard; error?: string }> {
  try {
    const { card } = await post<{ card: StampCard }>("/api/owner", { action: "add-stamp-customer", businessId, customerId });
    return { card };
  } catch (e) {
    return { card: null as unknown as StampCard, error: (e as Error).message };
  }
}

export async function addStampByContact(businessId: string, contact: { phone?: string; email?: string }): Promise<{ message: string }> {
  const { card, error } = await post<{ card?: StampCard; error?: string }>("/api/owner", {
    action: "add-stamp-contact",
    businessId,
    contact: contact.email ? { email: contact.email } : { phoneNumber: contact.phone ?? "" },
  });
  return { message: error ?? `Stamp added — now ${card?.currentStamps}.` };
}

export async function redeemReward(businessId: string, customerId: string): Promise<{ card: StampCard; error?: string }> {
  try {
    const { card } = await post<{ card: StampCard }>("/api/owner", { action: "redeem", businessId, customerId });
    return { card };
  } catch (e) {
    return { card: null as unknown as StampCard, error: (e as Error).message };
  }
}

// ---------------- counter tokens ----------------

export async function createStampToken(businessId: string): Promise<StampToken> {
  const { token } = await post<{ token: StampToken }>("/api/owner", { action: "mint-token", businessId });
  return token;
}

export async function getStampToken(businessId: string, code: string): Promise<StampToken | null> {
  const { token } = await api<{ token: StampToken | null }>(`/api/owner?kind=token-status&businessId=${encodeURIComponent(businessId)}&code=${encodeURIComponent(code)}`);
  return token;
}

// ---------------- dashboard ----------------

/** Dashboard redeem: paste the customer's reward-QR text / card link / bare
 *  code, or their phone/email. The server parses + looks up + checks the
 *  business matches. Throws with a friendly message when not allowed. */
export async function lookupCard(businessId: string, input: string): Promise<StampCard> {
  const { card } = await post<{ card: StampCard }>("/api/owner", { action: "lookup-card", businessId, input });
  return card;
}

export async function getBusinessStats(businessId: string): Promise<BusinessStats> {
  const { stats } = await api<{ stats: BusinessStats }>(`/api/owner?kind=stats&businessId=${encodeURIComponent(businessId)}`);
  return stats;
}

// ---------------- reviews ----------------

export async function submitReview(businessId: string, input: { rating: number; comment?: string; cardId?: string; customerId?: string }): Promise<SubmitReviewResult> {
  if (!input.cardId) throw new Error("Only the card's own device can leave a review in server mode.");
  const r = await post<{
    feedback: string;
    review: { id: string; rating: number; comment?: string; createdAt: string };
    bonusStamp?: { card: Pick<StampCard, "currentStamps" | "totalRedemptions"> };
    googleUrl?: string;
  }>("/api/review", { cardId: input.cardId, rating: input.rating, comment: input.comment });
  return {
    feedback: r.feedback,
    review: { id: r.review.id, businessId, customerId: input.customerId ?? "", rating: r.review.rating, comment: r.review.comment, autoReply: r.feedback, createdAt: r.review.createdAt },
    googleUrl: r.googleUrl,
    bonusStamp: r.bonusStamp?.card ? { card: { ...r.bonusStamp.card } as StampCard } : undefined,
  };
}

export async function listReviews(businessId: string): Promise<Review[]> {
  const { reviews } = await api<{ reviews: Review[] }>(`/api/owner?kind=reviews&businessId=${encodeURIComponent(businessId)}`);
  return reviews;
}

// ---------------- verification ----------------

export async function getVerificationRequest(id: string): Promise<VerificationRequest | null> {
  const r = await api<{ status?: string; expiresAt?: string }>(`/api/verify/${encodeURIComponent(id)}`);
  if (!r.status || r.status === "not_found") return null;
  return { id, businessId: "", customerId: "", name: "", phone: "", status: r.status as VerificationRequest["status"], createdAt: "", expiresAt: r.expiresAt ?? "" };
}

export async function listVerificationRequests(businessId: string): Promise<VerificationRequest[]> {
  const { requests } = await api<{ requests: VerificationRequest[] }>(`/api/owner?kind=verifications&businessId=${encodeURIComponent(businessId)}`);
  return requests;
}

export async function approveVerificationRequest(businessId: string, id: string): Promise<{ ok: boolean; card?: StampCard; error?: string }> {
  try {
    const { card } = await post<{ card: StampCard }>("/api/owner", { action: "accept-verification", businessId, verificationId: id });
    return { ok: true, card };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** The card page's "approved — give me my card back" step. */
export async function claimAfterVerification(verificationId: string): Promise<{ status: string; cardId?: string; error?: string }> {
  return post("/api/card/claim", { verificationId });
}

// shortcut: reservations disabled in server mode; local.ts has full impl if re-enabled
export const createReservation = async (): Promise<never> => { throw new Error("Reservations disabled."); };
export const listReservations = async (_b: string) => {
  void _b;
  return [] as never[];
};
export const setReservationStatus = async () => {};
