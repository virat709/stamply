export interface LoyaltyRule {
  requiredStamps: number;
  rewardDescription: string;
  expiresAt?: string | null; // ISO date
  minSpend?: number | null; // currency units
}

export interface BusinessProfile {
  phone?: string;
  address?: string;
  openingHours?: string;
  websiteUrl?: string;
  menuUrl?: string;
  communityUrl?: string;
  googleReviewUrl?: string;
  reservationsEnabled?: boolean;
}

export interface Business {
  id: string;
  name: string;
  logoUrl?: string;
  ownerId?: string; // uid of the restaurant account that owns this business (demo/legacy businesses have none)
  loyaltyRule: LoyaltyRule;
  profile?: BusinessProfile;
  createdAt: string; // ISO
}

export interface CustomerHistoryItem {
  id: string;
  timestamp: string;
  type: "stamp_added" | "reward_redeemed";
}

export interface Customer {
  id: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  createdAt: string;
  lastVisitedAt: string;
  currentStamps?: number;
  totalStamps?: number;
  totalRedemptions?: number;
  history?: CustomerHistoryItem[];
}

export interface StampCard {
  id: string;
  customerId: string;
  businessId: string;
  currentStamps: number;
  totalRedemptions: number;
  updatedAt: string;
  /** ISO time of the most recent stamp — lets the cooldown be enforced
   *  inside a Firestore transaction (no expensive per-visit queries). */
  lastStampAt?: string;
  /** Server-generated secret that must be presented (via httpOnly cookie) to
   *  read this card — makes card data unguessable even with the card id. */
  ownerToken?: string;
}

export type VisitType = "stamp_added" | "reward_redeemed";

export interface VisitLog {
  id: string;
  customerId: string;
  businessId: string;
  timestamp: string;
  type: VisitType;
}

export interface StampToken {
  code: string;
  businessId: string;
  expiresAt: string;
  used: boolean;
  usedByCustomerId?: string;
}

export interface BusinessStats {
  totalCustomers: number;
  totalVisits: number;
  totalRedemptions: number;
  redemptionRate: number; // %
  customers: Customer[];
}

export type ReservationStatus = "pending" | "confirmed" | "cancelled";

export interface Review {
  id: string;
  businessId: string;
  customerId?: string;
  customerName?: string;
  customerContact?: string;
  rating: number; // 1-5
  comment?: string;
  autoReply: string; // automated feedback shown to the customer
  createdAt: string;
}

export interface Reservation {
  id: string;
  businessId: string;
  customerId?: string;
  name: string;
  phone: string;
  partySize: number;
  scheduledFor: string; // datetime-local value
  notes?: string;
  status: ReservationStatus;
  createdAt: string;
}

export type VerificationStatus = "pending" | "approved" | "rejected";

export interface VerificationRequest {
  id: string;
  businessId: string;
  customerId: string;
  name: string;
  phone: string;
  status: VerificationStatus;
  createdAt: string;
  expiresAt: string;
}

export interface SubmitReviewResult {
  feedback: string; // automated reply shown to the customer
  review: Review;
  googleUrl?: string;
  bonusStamp?: { card: StampCard; error?: string };
}
