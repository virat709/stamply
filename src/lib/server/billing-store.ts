import { promises as fs } from "node:fs";
import path from "node:path";
import type { BillingPeriod, PlanId } from "@/lib/plans";
import { dataDb, hasFirestore } from "./store-firestore";

/** Server-only billing state. Plans are cached because Razorpay plans cannot
 *  be edited or deleted once created; webhook events are deduplicated by id. */

export interface PlanRef {
  key: string;
  planId: string;
  createdAt: string;
}

export type SubscriptionStatus = "created" | "active" | "cancelled" | "expired";

export interface BillingRecord {
  businessId: string;
  planId: PlanId;
  period: BillingPeriod;
  subscriptionId: string;
  status: SubscriptionStatus;
  currentEnd?: string;
  updatedAt: string;
}

export interface BillingState {
  plans: Record<string, PlanRef>;
  subscriptions: Record<string, BillingRecord>;
  events: Record<string, true>;
}

const EMPTY: BillingState = { plans: {}, subscriptions: {}, events: {} };
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "billing.json");

async function readFileState(): Promise<BillingState> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<BillingState>;
    return {
      plans: parsed.plans ?? {},
      subscriptions: parsed.subscriptions ?? {},
      events: parsed.events ?? {},
    };
  } catch {
    return { ...EMPTY };
  }
}

async function writeFileState(state: BillingState): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(state, null, 2), "utf-8");
  await fs.rename(temp, DATA_FILE);
}

export async function getPlanRef(key: string): Promise<PlanRef | null> {
  if (hasFirestore()) {
    const snap = await dataDb().collection("billingPlans").doc(key).get();
    return snap.exists ? (snap.data() as PlanRef) : null;
  }
  return (await readFileState()).plans[key] ?? null;
}

export async function savePlanRef(ref: PlanRef): Promise<void> {
  if (hasFirestore()) {
    await dataDb().collection("billingPlans").doc(ref.key).set(ref);
    return;
  }
  const state = await readFileState();
  state.plans[ref.key] = ref;
  await writeFileState(state);
}

export async function saveBillingRecord(record: BillingRecord): Promise<void> {
  if (hasFirestore()) {
    await dataDb().collection("billingSubscriptions").doc(record.businessId).set(record);
    return;
  }
  const state = await readFileState();
  state.subscriptions[record.businessId] = record;
  await writeFileState(state);
}

export async function getBillingRecord(businessId: string): Promise<BillingRecord | null> {
  if (hasFirestore()) {
    const snap = await dataDb().collection("billingSubscriptions").doc(businessId).get();
    return snap.exists ? (snap.data() as BillingRecord) : null;
  }
  return (await readFileState()).subscriptions[businessId] ?? null;
}

/** Returns false when the event was already handled. */
export async function claimWebhookEvent(eventId: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(eventId)) return false;
  if (hasFirestore()) {
    const ref = dataDb().collection("billingEvents").doc(eventId);
    const claimed = await dataDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) return false;
      tx.set(ref, { createdAt: new Date().toISOString() });
      return true;
    });
    return claimed;
  }
  const state = await readFileState();
  if (state.events[eventId]) return false;
  state.events[eventId] = true;
  await writeFileState(state);
  return true;
}
