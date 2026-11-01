import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/select";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
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

    return NextResponse.json({ business });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? "Server error" }, { status: 500 });
  }
}

