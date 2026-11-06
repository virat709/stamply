import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/schemas";
import { collect } from "@/lib/server/collect";
import { rateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Public write endpoint: cap per-IP join attempts to stop phone-number
    // enumeration / verification-request spam.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "local";
    const limit = rateLimit(`collect:${ip}`, 30, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = contactSchema.safeParse({ name: body.name ?? "", phoneNumber: body.phoneNumber ?? "" });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter your name and phone number." }, { status: 400 });
    }
    return await collect({
      businessId: String(body.businessId ?? ""),
      name: parsed.data.name,
      phoneNumber: parsed.data.phoneNumber,
      code: typeof body.code === "string" ? body.code : null,
      req,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? "Something went wrong." }, { status: 500 });
  }
}
