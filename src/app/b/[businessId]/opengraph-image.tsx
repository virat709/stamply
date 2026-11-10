/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Business } from "@/lib/types";
import { getStore } from "@/lib/server/select";

export const dynamic = "force-dynamic";

export const alt = "Loyalkard digital stamp card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const loyalkardLogo = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/logo-512.png"),
).toString("base64")}`;

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 3).trim()}...` : value;
}

export default async function Image({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;

  let business: Business | null = null;
  try {
    const store = getStore();
    business = await store.getBusiness(businessId);
    if (!business && businessId === "demo-cafe") {
      await store.seedDemo();
      business = await store.getBusiness(businessId);
    }
  } catch {
    /* render the generic fallback below */
  }

  const name = truncate(business?.name || "Loyalkard", 42);
  const required = business?.loyaltyRule.requiredStamps ?? 10;
  const reward = truncate(
    business?.loyaltyRule.rewardDescription || "a free reward",
    68,
  );
  const rewardSize = reward.length > 52 ? 44 : reward.length > 34 ? 52 : 60;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0b0a12 0%, #17111f 55%, #0b0a12 100%)",
          color: "#f5f0e6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img
            src={loyalkardLogo}
            width={96}
            height={96}
            alt=""
            style={{ width: 96, height: 96 }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 17, letterSpacing: 5, color: "#d4af37", textTransform: "uppercase" }}>
              Members Club
            </span>
            <span style={{ fontSize: 42, fontWeight: 700, marginTop: 4 }}>{name}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1020 }}>
          <span style={{ fontSize: 20, letterSpacing: 4, color: "#a3a3a3", textTransform: "uppercase" }}>
            Collect {required} stamps and earn
          </span>
          <span
            style={{
              marginTop: 14,
              fontSize: rewardSize,
              lineHeight: 1.08,
              fontWeight: 800,
              color: "#f0d98c",
            }}
          >
            {reward}
          </span>
          <span style={{ marginTop: 22, fontSize: 24, color: "#a3a3a3" }}>
            Scan to join · No app download · Staff-verified stamps
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.14)",
            paddingTop: 24,
          }}
        >
          <span style={{ fontSize: 18, letterSpacing: 3, color: "#737373" }}>stamp.v4stay.com</span>
          <span style={{ fontSize: 17, letterSpacing: 3, color: "#d4af37" }}>POWERED BY LOYALKARD</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
