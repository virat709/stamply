import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/select";
import { serverError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Polled by the customer's card page while staff verification is pending.
 *  Only status + expiry leave the server — never the card contents. */
export async function GET(_req: Request, { params }: { params: Promise<{ verificationId: string }> }) {
  try {
    const { verificationId } = await params;
    const v = await getStore().getVerification(verificationId);
    if (!v) return NextResponse.json({ status: "not_found" });
    const res = NextResponse.json({ status: v.status, expiresAt: v.expiresAt });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    return serverError("verify:get", e);
  }
}
