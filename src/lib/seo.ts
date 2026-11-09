import type { Metadata } from "next";
import {
  SITE_LAST_UPDATED,
  SITE_NAME,
  SITE_OWNER,
  SITE_OWNER_URL,
  SITE_URL,
} from "./site";

/** Shared metadata for the static marketing and legal pages. */
export function pageMetadata({
  path,
  title,
  description,
}: {
  path: string;
  title: string;
  description: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: path,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/twitter-image"],
    },
  };
}

export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_OWNER,
    url: SITE_OWNER_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/icon.svg`,
    },
    sameAs: [SITE_OWNER_URL],
    description:
      "V4Stay builds hospitality and loyalty software, including Loyalkard digital stamp cards for cafés, restaurants and retail.",
  };
}

/**
 * Builds a WebPage (or subtype) plus BreadcrumbList graph for static marketing
 * pages. Keeping this in one place avoids schema drift between pages.
 */
export function pageSchema({
  path,
  name,
  description,
  type = "WebPage",
  breadcrumbName,
  includeOrganization = true,
}: {
  path: string;
  name: string;
  description: string;
  type?: "WebPage" | "AboutPage" | "ContactPage" | "FAQPage";
  breadcrumbName?: string;
  includeOrganization?: boolean;
}) {
  const url = `${SITE_URL}${path}`;

  const graph: Array<Record<string, unknown>> = [
    {
      "@type": type,
      "@id": `${url}#webpage`,
      url,
      name,
      description,
      inLanguage: "en",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      publisher: { "@id": `${SITE_URL}/#organization` },
      breadcrumb: { "@id": `${url}#breadcrumb` },
      dateModified: SITE_LAST_UPDATED,
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: breadcrumbName ?? name,
          item: url,
        },
      ],
    },
  ];

  if (includeOrganization) {
    graph.push(organizationSchema());
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
