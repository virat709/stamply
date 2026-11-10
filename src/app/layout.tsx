import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OWNER,
  SITE_OWNER_URL,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_OWNER, url: SITE_OWNER_URL }],
  creator: SITE_OWNER,
  publisher: SITE_OWNER,
  category: "Business software",
  keywords: [
    "digital stamp card",
    "digital loyalty card",
    "stamp card software",
    "café loyalty program",
    "restaurant loyalty app",
    "digital punch card",
    "customer retention software",
  ],
  referrer: "origin-when-cross-origin",
  formatDetection: { telephone: false, address: false, email: false },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#08080d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="aurora" aria-hidden />
        <div className="noise" aria-hidden />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
