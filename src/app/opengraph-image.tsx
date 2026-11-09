/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const logoPng = readFileSync(join(process.cwd(), "public/logo-512.png"));
const logoSrc = `data:image/png;base64,${logoPng.toString("base64")}`;

export const alt = "Loyalkard — digital stamp cards for cafés, restaurants and retail";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #08080d 0%, #12101a 55%, #1d1526 100%)",
          padding: "68px 76px",
          color: "#f5f0e6",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src={logoSrc}
            width={76}
            height={76}
            alt=""
            style={{ width: 76, height: 76, objectFit: "contain" }}
          />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 18 }}>
            <span style={{ fontSize: 30, fontWeight: 700 }}>Loyalkard</span>
            <span style={{ fontSize: 16, color: "#d4af37", letterSpacing: 5 }}>
              DIGITAL STAMP CARDS
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 70, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2 }}>
            <span>Digital stamp cards</span>
            <span style={{ color: "#f0d98c" }}>that make loyalty feel like gold.</span>
          </div>
          <div style={{ display: "flex", marginTop: 30, fontSize: 25, color: "#c9c4b8" }}>
            One scan to join · No app download · Fraud-proof stamps
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 19, color: "#9b958a" }}>
          <span>stamp.v4stay.com</span>
          <span>Digital loyalty software by V4Stay</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
