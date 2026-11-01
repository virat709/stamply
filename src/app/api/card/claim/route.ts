import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/select";
import { mergeAndSetClaim } from "@/lib/server/cards-cookie";

export const dynamic = "force-dynamic";

/** Grants card access (possession cookie) once staff approved the customer's
 *  in-person verification. The verification id itself is the capability. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const verificationId = String(body.verificationId ?? "");
    if (!verificationId) return NextResponse.json({ error: "Missing verification id." }, { status: 400 });

    const store = getStore();
    const v = await store.getVerification(verificationId);
    if (!v) return NextResponse.json({ error: "Verification request not found." }, { status: 404 });
    if (v.status === "pending") return NextResponse.json({ status: "pending" });
    if (v.status === "rejected") return NextResponse.json({ error: "Your request was rejected — please see staff." }, { status: 403 });
    if (v.status !== "approved") return NextResponse.json({ error: "Verification failed." }, { status: 403 });
    // Guard: reject expired approvals — an approved record must still be young
    // enough (within VERIFICATION_TTL_MS) so an attacker can't replay an old id.
    if (+new Date(v.expiresAt) < Date.now()) {
      return NextResponse.json({ error: "Verification request has expired." }, { status: 403 });
    }

    const card = await store.getCardFor(v.businessId, v.customerId);
    if (!card) return NextResponse.json({ error: "Stamp card not found." }, { status: 404 });
    const res = NextResponse.json({ status: "claimed", cardId: card.id });
    mergeAndSetClaim(req, res, v.businessId, { cardId: card.id, customerId: v.customerId, token: card.ownerToken! });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? "Server error" }, { status: 500 });
  }
}
