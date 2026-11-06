import { NextResponse } from "next/server";

// Placeholder API route demonstrating server-side hooks.
// The primary data flow uses Firestore (or the local demo store) on the client;
// production deployments should move mutations here and verify auth tokens.
export async function GET() {
  return NextResponse.json({ ok: true, service: "loyalkard", timestamp: new Date().toISOString() });
}
