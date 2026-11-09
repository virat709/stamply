import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/site/JsonLd";
import LegalPage from "@/components/site/LegalPage";
import { pageMetadata, pageSchema } from "@/lib/seo";
import { SITE_CONTACT_EMAIL, SITE_OWNER, SITE_OWNER_URL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/about",
  title: "About",
  description:
    "Loyalkard is digital loyalty software by V4Stay, built for cafés, restaurants, bakeries and independent retail. Learn why we built it and how it works.",
});

const description =
  "Loyalkard is digital loyalty software by V4Stay, built for cafés, restaurants, bakeries and independent retail. Learn why we built it and how it works.";

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={pageSchema({
          path: "/about",
          name: "About Loyalkard",
          description,
          type: "AboutPage",
        })}
      />
      <LegalPage
        eyebrow="About us"
        title="About Loyalkard"
        intro="Loyalkard is digital loyalty software built by V4Stay for independent cafés, restaurants, bakeries and retail shops. We keep the simple habit of a stamp card and remove the paper, the guesswork and the fraud."
      >
        <h2>Why we built Loyalkard</h2>
        <p>
          A paper stamp card is one of the easiest loyalty ideas ever invented: visit, get a stamp, collect a reward.
          It is also easy to lose, easy to copy, and it tells the business almost nothing about its regulars. Owners
          end up reprinting cards, trusting staff judgement at the counter, and guessing who their best customers are.
        </p>
        <p>
          We built Loyalkard to keep the one-scan simplicity customers already understand while adding the things a
          modern business needs: verified stamps, a digital card that cannot be left at home, a reward flow staff can
          trust, and a dashboard that shows what is actually happening.
        </p>

        <h2>What Loyalkard does</h2>
        <ul>
          <li>Creates a digital stamp card that customers open from a QR code, with no app download.</li>
          <li>Rotates the counter QR code every five minutes and makes each code single-use.</li>
          <li>Requires staff approval for returning visits, so screenshots and photo reuse cannot mint stamps.</li>
          <li>Issues a one-tap reward QR when the card is full, then resets the card automatically.</li>
          <li>Collects customer feedback, guides happy customers to Google reviews, and keeps low ratings private.</li>
          <li>Adds optional table reservations and CSV exports for win-back campaigns.</li>
        </ul>

        <h2>Who Loyalkard is for</h2>
        <p>
          Loyalkard is designed for independent, repeat-visit businesses: coffee shops, restaurants, bakeries,
          salons, barbers and local retail. It fits best when you want a loyalty program you can run from the counter
          without building a custom app or hiring a loyalty agency.
        </p>

        <h2>How we build</h2>
        <h3>Server-trusted loyalty</h3>
        <p>
          Stamps, reward redemptions, verification approvals and reviews are processed on the server, not in the
          browser. A code is validated and consumed in the same transaction as the stamp, so a failed stamp never
          burns a customer&apos;s code and a forged request cannot mint one.
        </p>
        <h3>Privacy by default</h3>
        <p>
          Card data is readable only by the device that holds the possession cookie or by the authenticated owner.
          Knowing a customer&apos;s phone number alone reveals nothing. Read the{" "}
          <Link href="/privacy">privacy policy</Link> for the full picture.
        </p>
        <h3>Clear ownership</h3>
        <p>
          Loyalkard is designed and operated by{" "}
          <a href={SITE_OWNER_URL} target="_blank" rel="noopener noreferrer">
            {SITE_OWNER}
          </a>
          . The same team is responsible for the product, the policies on this site, and the support inbox.
        </p>

        <h2>The company behind Loyalkard</h2>
        <p>
          {SITE_OWNER} builds hospitality and loyalty software. Loyalkard is our focused answer to a narrow problem:
          helping independent businesses run a trustworthy digital stamp card without adding friction for customers
          or staff.
        </p>

        <h2>Talk to us</h2>
        <p>
          Questions about the product, a demo, or a rollout? Email{" "}
          <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a> or use the{" "}
          <Link href="/contact">contact page</Link>. For privacy and data requests, use the{" "}
          <Link href="/privacy">privacy policy</Link> contact details.
        </p>
      </LegalPage>
    </>
  );
}
