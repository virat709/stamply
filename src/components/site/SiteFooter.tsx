import Link from "next/link";
import {
  SITE_CONTACT_EMAIL,
  SITE_LAST_UPDATED_LABEL,
  SITE_OWNER,
  SITE_OWNER_URL,
  SITE_PRIVACY_EMAIL,
} from "@/lib/site";
import { BrandMark } from "./BrandMark";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Home", href: "/" },
      { label: "Pricing", href: "/pricing" },
      { label: "Customer demo", href: "/b/demo-cafe" },
      { label: "Owner console", href: "/dashboard/demo-cafe" },
      { label: "Business sign in", href: "/login" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Security", href: "/security" },
      { label: "FAQ", href: "/#faq" },
      { label: "Google reviews help", href: "https://support.google.com/business/answer/3474122", external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "Cookie policy", href: "/cookies" },
      { label: "Data requests", href: `mailto:${SITE_PRIVACY_EMAIL}`, external: true },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5" aria-label="Loyalkard home">
              <BrandMark size={26} />
              <span className="text-lg font-bold tracking-tight">
                Loyalkard<span className="text-[#d4af37]">.</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              Digital stamp cards for cafés, restaurants, bakeries and retail. One scan to join, no app download, and
              staff-verified stamps.
            </p>
            <p className="mt-4 text-xs text-neutral-600">
              Loyalkard is loyalty software by{" "}
              <a
                href={SITE_OWNER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#f0d98c] underline underline-offset-4 hover:text-white"
              >
                {SITE_OWNER}
              </a>
              .
            </p>
            <p className="mt-1 text-xs text-neutral-600">Last updated: {SITE_LAST_UPDATED_LABEL}</p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-300">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm text-neutral-500">
                {column.links.map((link) =>
                  "external" in link && link.external ? (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                        rel={link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                        className="transition hover:text-[#f0d98c]"
                      >
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label}>
                      <Link href={link.href} className="transition hover:text-[#f0d98c]">
                        {link.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 {SITE_OWNER}. All rights reserved. Loyalkard is a {SITE_OWNER} product.
          </p>
          <p>
            Questions?{" "}
            <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="text-[#f0d98c] underline underline-offset-4 hover:text-white">
              {SITE_CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
