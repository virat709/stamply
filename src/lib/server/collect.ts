import { NextResponse } from "next/server";
import { getStore } from "./select";
import { mergeAndSetClaim as setClaim } from "./cards-cookie";
import { normalizePhone, type CollectOutcome } from "./store";

/** The single entry point for the customer join/collect flow:
 *  - new customer  -> register + card, stamp immediately when a live counter
 *                     code was scanned
 *  - returning     -> create a staff verification request; no card access or
 *                     stamp is granted until staff approves the person.
 *  Never reveals an existing card by phone number alone — browser access is
 *  granted only after the join flow (new member) or staff approval. */
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
    const res = NextResponse.json<CollectOutcome>({
      status,
      cardId: card.id,
      customerId: customer.id,
      error,
    });
    grantClaim(input.req, res, card, bId);
    return res;
  }

  // ---- returning member ----
  // The phone number only identifies the customer. Access to an existing card
  // (and any stamp) requires staff approval in the owner console.
  const card = await store.getOrCreateCard(bId, customer.id);
  const verification = await store.createVerification(bId, customer.id, input.name, phone);
  return NextResponse.json<CollectOutcome>({
    status: "pending_verification",
    cardId: card.id,
    customerId: customer.id,
    verificationId: verification.id,
  });
}

function grantClaim(
  req: Request,
  res: NextResponse,
  card: { id: string; customerId: string; ownerToken?: string },
  bId: string
) {
  if (!card.ownerToken) return;
  setClaim(req, res, bId, {
    cardId: card.id,
    customerId: card.customerId,
    token: card.ownerToken,
  });
}
