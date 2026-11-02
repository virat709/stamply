import { NextResponse } from "next/server";
import { getStore } from "./select";
import { mergeAndSetClaim as setClaim } from "./cards-cookie";
import { normalizePhone, type CollectOutcome } from "./store";

/** The single entry point for the customer join/collect flow:
 *  - new customer  -> register + card, stamp immediately when a live counter
 *                     code was scanned
 *  - returning     -> live code stamps (single-use); otherwise card view
 *  Never reveals an existing card by phone number alone — browser access is
 *  granted via a possession cookie (or fallback client claim token). */
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

  const bId = business.id; // canonical ID
  const phone = normalizePhone(input.phoneNumber);
  let customer = await store.findCustomerByPhone(phone);
  let error: string | undefined;
  let status: CollectOutcome["status"];

  if (!customer) {
    // ---- new member ----
    customer = await store.createCustomer({ name: input.name, phoneNumber: phone });
    const card = await store.getOrCreateCard(bId, customer.id);
    status = "registered";
    if (input.code) {
      const stamped = await store.stampWithToken(bId, input.code, customer.id);
      if (typeof stamped === "string") error = stamped;
      else status = "stamped";
    }
    const res = NextResponse.json<CollectOutcome & { cardToken?: string }>({
      status,
      cardId: card.id,
      customerId: customer.id,
      cardToken: card.ownerToken,
      error,
    });
    setClaim(input.req, res, bId, { cardId: card.id, customerId: customer.id, token: card.ownerToken! });
    if (input.businessId.toLowerCase() !== bId.toLowerCase()) {
      setClaim(input.req, res, input.businessId, { cardId: card.id, customerId: customer.id, token: card.ownerToken! });
    }
    return res;
  }

  // ---- returning member ----
  const card = await store.getOrCreateCard(bId, customer.id);
  let stamped = false;
  if (input.code) {
    const result = await store.stampWithToken(bId, input.code, customer.id);
    if (typeof result === "string") {
      error = result; // invalid/expired/used/cooldown — the stamp did not land
    } else {
      stamped = true;
    }
  }

  // Verification is done via 10-digit phone number — grant possession cookie directly
  const res = NextResponse.json<CollectOutcome & { cardToken?: string }>({
    status: stamped ? "stamped" : "registered",
    cardId: card.id,
    customerId: customer.id,
    cardToken: card.ownerToken,
    error,
  });
  setClaim(input.req, res, bId, { cardId: card.id, customerId: customer.id, token: card.ownerToken! });
  if (input.businessId.toLowerCase() !== bId.toLowerCase()) {
    setClaim(input.req, res, input.businessId, { cardId: card.id, customerId: customer.id, token: card.ownerToken! });
  }
  return res;
}
