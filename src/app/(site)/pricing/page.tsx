import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/site/JsonLd";
import { pageMetadata, pageSchema } from "@/lib/seo";
import { SITE_CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

const description =
  "Loyalkard pricing for cafés, restaurants and retail. Start with the free demo, then choose a per-location plan. Contact us for a quote based on your business.";

export const metadata: Metadata = pageMetadata({
  path: "/pricing",
  title: "Pricing",
  description,
});

const plans = [
  {
    name: "Free demo",
    price: "Free",
    note: "No card required",
    description: "Explore the full customer flow and owner console with sample data.",
    cta: { label: "Try the demo", href: "/b/demo-cafe" },
    featured: false,
    features: [
      "Customer join and stamp flow",
      "Owner console preview",
      "Sample rewards, reviews and analytics",
    ],
  },
  {
    name: "Counter",
    price: "Contact us",
    note: "For one location",
    description: "Run your stamp card, rewards and reviews from a single counter.",
    cta: { label: "Book a demo", href: "/contact" },
    featured: true,
    features: [
      "Digital stamp card and counter QR",
      "Staff-verified returning visits",
      "Reward QR and redemption log",
      "Google review prompts",
      "Customer CSV export",
      "Counter and community QR codes",
    ],
  },
  {
    name: "Multi-location",
    price: "Contact us",
    note: "For growing teams",
    description: "A shared setup for businesses running more than one location.",
    cta: { label: "Talk to us", href: "/contact" },
    featured: false,
    features: [
      "Everything in Counter",
      "Multiple business locations",
      "Central owner access",
      "Onboarding and rollout support",
    ],
  },
];

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
    a: "Loyalkard is priced per business location. You can explore the free demo without signing up, then contact us for a quote based on your locations, team and rollout needs.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes. The customer and owner demos are free and do not require a card. For a guided trial with your own branding and reward rules, contact us.",
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
    a: "Contact us before your next billing date to change or cancel a plan. The terms confirmed in your order apply.",
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
      offers: {
        "@type": "Offer",
        name: "Free demo",
        price: "0",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/b/demo-cafe`,
      },
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
            Start with the free demo, then choose a plan that fits the number of locations you run. We do not
            charge per customer or per stamp.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-[28px] border p-6 ${
                plan.featured
                  ? "border-[#d4af37]/50 bg-[#d4af37]/[0.07] shadow-[0_0_40px_-20px_rgba(212,175,55,0.6)]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-[#d4af37] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#211705]">
                  Most popular
                </span>
              )}
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#d4af37]">{plan.note}</p>
              <h2 className="mt-3 text-2xl font-bold text-neutral-100">{plan.name}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{plan.description}</p>
              <p className="mt-5 text-2xl font-black text-neutral-100">{plan.price}</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-neutral-400">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <span className="mt-0.5 text-[#d4af37]">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.cta.href}
                className={`mt-7 rounded-full px-5 py-3 text-center text-sm font-bold transition ${
                  plan.featured
                    ? "btn-gold"
                    : "border border-white/15 bg-white/5 text-neutral-200 hover:bg-white/10"
                }`}
              >
                {plan.cta.label}
              </Link>
            </div>
          ))}
        </div>

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
