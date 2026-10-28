import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/schemas";
import { collect } from "@/lib/server/collect";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
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
