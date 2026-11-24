import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/site/JsonLd";
import PricingCards from "@/components/site/PricingCards";
import { pageMetadata, pageSchema } from "@/lib/seo";
import { BILLING_PERIODS, PERIOD_LABELS, PLANS, formatINR } from "@/lib/plans";
import { SITE_CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

const description =
  "Loyalkard pricing for cafés, restaurants and retail. Start with a 14-day free trial, then choose a 6-month or yearly plan from ₹4,999 — per location, never per customer or stamp.";

export const metadata: Metadata = pageMetadata({
  path: "/pricing",
  title: "Pricing",
  description,
});

const included = [
  "Digital stamp cards with no customer app",
  "Rotating single-use counter QR codes",
  "Staff approval for returning visits",
  "Reward redemption with a one-tap QR",
  "Reviews and private feedback",
  "Customer and visit analytics",
  "Table reservations",
  "CSV exports for win-back campaigns",
];

const faqs = [
  {
    q: "How does Loyalkard pricing work?",
    a: "Loyalkard is priced per business location, billed every 6 months or yearly. The free demo needs no signup. Paid plans start at ₹4,999 for 6 months or ₹8,999 per year for one location, with a 14-day free trial.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. Every paid plan starts with a 14-day free trial. You choose your plan and duration at signup, and Razorpay only begins billing after the trial ends. Cancel before then and you are not charged.",
  },
  {
    q: "Do customers pay anything?",
    a: "No. Customers join and collect stamps for free. They do not need to install an app or pay a subscription.",
  },
  {
    q: "Do you charge per customer or per stamp?",
    a: "No. Plans are based on the business locations you run, not on the number of customers or stamps.",
  },
  {
    q: "Can I cancel or change plans?",
    a: "Yes. Cancel anytime from your Razorpay subscription — access continues until the end of the period you paid for. To change plans or add locations, contact us before your next billing date.",
  },
];

const pricingJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      "@id": `${SITE_URL}/pricing#product`,
      name: SITE_NAME,
      description,
      brand: { "@type": "Brand", name: SITE_NAME },
      offers: [
        {
          "@type": "Offer",
          name: "Free demo",
          price: "0",
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/b/demo-cafe`,
        },
        ...PLANS.flatMap((plan) =>
          BILLING_PERIODS.map((period) => ({
            "@type": "Offer",
            name: `${plan.name} — ${PERIOD_LABELS[period]}`,
            price: String(plan.prices[period]),
            priceCurrency: "INR",
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/pricing`,
          }))
        ),
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/pricing#faq`,
      mainEntity: faqs.map((item) => ({
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

export default function PricingPage() {
  return (
    <>
      <JsonLd
        data={pageSchema({
          path: "/pricing",
          name: "Loyalkard pricing",
          description,
        })}
      />
      <JsonLd data={pricingJsonLd} />

      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#d4af37]">Pricing</p>
          <h1
            className="mt-4 text-4xl font-black tracking-tight sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Simple pricing for every counter
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-neutral-400">
            Start with a 14-day free trial, then choose 6 months or yearly from {formatINR(PLANS[0].prices["6m"])}.
            Priced per location — never per customer or per stamp.
          </p>
        </div>

        <PricingCards />

        <div className="mt-14 grid gap-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-7 md:grid-cols-[1fr_1.4fr] md:p-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#d4af37]">Every plan</p>
            <h2 className="mt-3 text-2xl font-bold text-neutral-100">Everything you need to run loyalty</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              The core Loyalkard experience is the same: one scan to join, staff-verified stamps, a reward QR and a
              dashboard that shows what is happening.
            </p>
          </div>
          <ul className="grid gap-2.5 text-sm text-neutral-400 sm:grid-cols-2">
            {included.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-0.5 text-[#d4af37]">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-14 mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-neutral-100">Pricing questions</h2>
          <div className="mt-5 space-y-6">
            {faqs.map((item) => (
              <div key={item.q}>
                <h3 className="text-base font-semibold text-neutral-200">{item.q}</h3>
                <p className="mt-1.5 text-sm leading-7 text-neutral-400">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 rounded-[28px] border border-[#d4af37]/25 bg-[#d4af37]/[0.06] px-6 py-10 text-center">
          <h2 className="text-2xl font-bold text-neutral-100">Not sure which plan fits?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-neutral-400">
            Tell us how many locations you run and how your counter works today. We will recommend the simplest
            setup and send a clear quote.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/contact" className="btn-gold rounded-full px-6 py-3 text-sm font-bold">
              Book a demo
            </Link>
            <a
              href={`mailto:${SITE_CONTACT_EMAIL}`}
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-neutral-200 transition hover:bg-white/10"
            >
              {SITE_CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
