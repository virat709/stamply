import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/select";
import { requireOwner } from "@/lib/server/store-firestore";
import { serverError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;
    if (!businessId) {
      return NextResponse.json({ error: "businessId is required." }, { status: 400 });
    }

    const store = getStore();
    let business = await store.getBusiness(businessId);
    if (!business && businessId === "demo-cafe") {
      await store.seedDemo();
      business = await store.getBusiness(businessId);
    }

    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    // ownerId is a Firebase uid — not a secret, but it has no business being
    // in a public profile response. Only the verified owner gets it back.
    let isOwner = false;
    if (business.ownerId) {
      try {
        isOwner = (await requireOwner(req)) === business.ownerId;
      } catch {
        isOwner = false;
      }
    }
    const { ownerId, ...publicBusiness } = business;
    const res = NextResponse.json({
      business: {
        ...publicBusiness,
        hasOwner: Boolean(ownerId),
        ...(isOwner ? { ownerId } : {}),
      },
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    return serverError("business:get", e);
  }
}
