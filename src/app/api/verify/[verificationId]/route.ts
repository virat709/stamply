import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/select";

export const dynamic = "force-dynamic";

/** Polled by the customer's card page while staff verification is pending.
 *  Only status + expiry leave the server — never the card contents. */
export async function GET(_req: Request, { params }: { params: Promise<{ verificationId: string }> }) {
  try {
    const { verificationId } = await params;
    const v = await getStore().getVerification(verificationId);
    if (!v) return NextResponse.json({ status: "not_found" });
    return NextResponse.json({ status: v.status, expiresAt: v.expiresAt });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? "Server error" }, { status: 500 });
  }
}
