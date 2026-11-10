import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { Business } from "@/lib/types";
import { getStore } from "@/lib/server/select";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessId: string }>;
}): Promise<Metadata> {
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
    /* fall through to the not-found metadata */
  }

  if (!business) {
    return {
      title: "Loyalty program not found",
      robots: { index: false, follow: false },
    };
  }

  const required = business.loyaltyRule.requiredStamps;
  const reward = business.loyaltyRule.rewardDescription || "a free reward";
  const title = `${business.name} loyalty card`;
  const description = `Join ${business.name}'s digital stamp card. Collect ${required} stamps and earn ${reward}. No app download.`;

  return {
    title,
    description,
    alternates: { canonical: `/b/${businessId}` },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: `/b/${businessId}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    // The join page is a transactional page; keep it out of search results
    // while still allowing the link preview to render.
    robots: { index: false, follow: false },
  };
}

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return children;
}
