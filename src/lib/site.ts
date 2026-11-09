// Central site metadata so the page, JSON-LD, sitemap and robots.txt all agree.
// Set NEXT_PUBLIC_SITE_URL in production to serve a different domain.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://stamp.v4stay.com").replace(/\/$/, "");

export const SITE_NAME = "Loyalkard";
export const SITE_OWNER = "V4Stay";
export const SITE_OWNER_URL = "https://v4stay.com";

export const SITE_TITLE = "Loyalkard — Digital Stamp Cards for Cafés & Restaurants";
export const SITE_DESCRIPTION =
  "Loyalkard turns paper loyalty cards into fraud-proof digital stamp cards for cafés, restaurants and retail. One scan to join, no app, no downloads.";

export const SITE_LAST_UPDATED = "2026-11-09";
export const SITE_LAST_UPDATED_LABEL = "9 November 2026";

export const SITE_CONTACT_EMAIL = "support@v4stay.com";
export const SITE_PRIVACY_EMAIL = "privacy@v4stay.com";
