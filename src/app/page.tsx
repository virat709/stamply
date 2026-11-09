import type { Metadata } from "next";
import LandingPage from "@/components/LandingPage";
import {
  SITE_DESCRIPTION,
  SITE_LAST_UPDATED,
  SITE_NAME,
  SITE_OWNER,
  SITE_OWNER_URL,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
  category: "Business software",
};

const FAQ_ANSWERS = [
  {
    q: "What is Loyalkard?",
    a: "Loyalkard is digital stamp card software for independent cafés, restaurants, bakeries and retail shops. It replaces paper punch cards with a QR-based loyalty card that lives in the customer's phone browser — no app download required.",
  },
  {
    q: "Do customers need to download an app?",
    a: "No. Customers scan the counter QR code, save their name and phone or email, and their stamp card opens in the browser. They can return to it from the same device without installing anything.",
  },
  {
    q: "How does Loyalkard stop fake or repeated stamps?",
    a: "The counter QR code rotates every five minutes and each code works once. Returning visits also need staff approval: the customer's request appears only in the owner's Verify tab, and a stamp is added only after the staff member confirms the person is present. This blocks screenshots and photo reuse.",
  },
  {
    q: "How does the reward work?",
    a: "The owner sets how many stamps unlock a reward, such as ten coffees for a free one. When the card is full, the customer shows a one-tap reward QR, staff scan it once, and the card resets. Every redemption is logged in the dashboard.",
  },
  {
    q: "Can Loyalkard collect Google reviews and customer feedback?",
    a: "Yes. After a visit, customers can rate their experience from the stamp card. Feedback is sent automatically by rating, and customers who leave 4–5 stars can be guided to the business's Google review link. Lower ratings stay private so the owner can follow up.",
  },
  {
    q: "What data can the owner see?",
    a: "The owner dashboard shows visits, active cards, redemptions, customer names and contact details, reviews and reservations. Data can be exported to CSV for win-back campaigns.",
  },
  {
    q: "Is Loyalkard secure?",
    a: "Loyalty actions run server-side, not in the browser. A stamp or redemption is validated and written in one transaction, and card data is readable only by the device that holds the possession cookie or by the authenticated owner.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_OWNER,
      url: SITE_OWNER_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo-512.png`,
        width: 512,
        height: 512,
      },
      sameAs: [SITE_OWNER_URL],
      description:
        "V4Stay builds hospitality and loyalty software, including Loyalkard digital stamp cards for cafés, restaurants and retail.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: SITE_TITLE,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#software` },
      primaryImageOfPage: `${SITE_URL}/opengraph-image?v=${SITE_LAST_UPDATED}`,
      dateModified: SITE_LAST_UPDATED,
      publisher: { "@id": `${SITE_URL}/#organization` },
      breadcrumb: { "@id": `${SITE_URL}/#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${SITE_URL}/#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
      ],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Loyalty program software",
      operatingSystem: "Web browser",
      url: SITE_URL,
      description:
        "Loyalkard is digital stamp card software that replaces paper loyalty cards with QR-based cards, staff-verified stamps, reward redemption, customer analytics and Google review prompts.",
      image: `${SITE_URL}/logo-512.png`,
      publisher: { "@id": `${SITE_URL}/#organization` },
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Cafés, restaurants, bakeries and independent retail shops",
      },
      featureList: [
        "One-scan digital stamp card joining",
        "Rotating single-use counter QR codes",
        "In-person staff verification for returning visits",
        "One-tap reward QR redemption",
        "Visit and redemption analytics",
        "Google review prompts and private feedback",
        "Table reservations",
        "CSV customer export",
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQ_ANSWERS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPage />
    </>
  );
}
