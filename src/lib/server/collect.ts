import { NextResponse } from "next/server";
import { getStore } from "./select";
import { mergeAndSetClaim as setClaim } from "./cards-cookie";
import { normalizePhone, type CollectOutcome } from "./store";

/** The single entry point for the customer join/collect flow:
 *  - new customer  -> register + card, stamp immediately when a live counter
 *                     code was scanned
 *  - returning     -> live code stamps (single-use); otherwise a staff
 *                     verification request
 *  Never reveals an existing card by phone number alone — browser access is
 *  granted via a possession cookie (or the owner's dashboard verification). */
export async function collect(input: {
  businessId: string;
  name: string;
  phoneNumber: string;
  code: string | null;
  req: Request;
}): Promise<NextResponse> {
  const store = getStore();
  const business = await store.getBusiness(input.businessId);
  if (!business) return NextResponse.json({ error: "This loyalty program doesn't exist." }, { status: 404 });

  const phone = normalizePhone(input.phoneNumber);
  let customer = await store.findCustomerByPhone(phone);
  let error: string | undefined;
  let status: CollectOutcome["status"];

  if (!customer) {
    // ---- new member ----
    customer = await store.createCustomer({ name: input.name, phoneNumber: phone });
    const card = await store.getOrCreateCard(input.businessId, customer.id);
    status = "registered";
    if (input.code) {
      const stamped = await store.stampWithToken(input.businessId, input.code, customer.id);
      if (typeof stamped === "string") error = stamped;
    }
    const res = NextResponse.json<CollectOutcome>({ status, cardId: card.id, customerId: customer.id, error });
    setClaim(input.req, res, input.businessId, { cardId: card.id, customerId: customer.id, token: card.ownerToken! });
    return res;
  }

  // ---- returning member ----
  const card = await store.getOrCreateCard(input.businessId, customer.id);
  let stamped = true;
  if (input.code) {
    const result = await store.stampWithToken(input.businessId, input.code, customer.id);
    if (typeof result === "string") {
      stamped = false;
      error = result; // invalid/expired/used/cooldown — the stamp did not land
    }
  } else {
    stamped = false;
  }
  if (stamped) {
    const res = NextResponse.json<CollectOutcome>({ status: "stamped", cardId: card.id, customerId: customer.id });
    setClaim(input.req, res, input.businessId, { cardId: card.id, customerId: customer.id, token: card.ownerToken! });
    return res;
  }
  // No live code that worked -> staff must verify in person. (Anti
  // photo-scan fraud: re-scanning a screenshot never grants stamps.)
  const verification = await store.createVerification(
    input.businessId,
    customer.id,
    input.name || customer.name || "Guest",
    phone
  );
  // NOTE: no possession cookie here. A stranger typing someone's phone number
  // must never gain card access — the device gets access only after staff
  // approves the verification (see /api/card/claim).
  const res = NextResponse.json<CollectOutcome>({ status: "pending_verification", cardId: card.id, customerId: customer.id, verificationId: verification.id, error });
  return res;
}
