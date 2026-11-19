import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/schemas";
import { collect } from "@/lib/server/collect";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { serverError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // Public write endpoint: cap per-IP join attempts to stop phone-number
    // enumeration / verification-request spam. Shared counter when Upstash is
    // configured; per-instance otherwise.
    const ip = clientIp(req);
    const limit = await rateLimit(`collect:${ip}`, 30, 60_000);
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
      businessId: typeof body.businessId === "string" ? body.businessId : "",
      name: parsed.data.name,
      phoneNumber: parsed.data.phoneNumber,
      code: typeof body.code === "string" ? body.code.slice(0, 32) : null,
      req,
    });
  } catch (e) {
    return serverError("collect", e);
  }
}
